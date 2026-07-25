import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PayDepositButton } from "@/components/bookings/pay-deposit-button";
import { calcCashback } from "@/lib/rewards-utils";
import { BookingConfirmation } from "@/components/bookings/booking-confirmation";
import { CustomerDisputeEvidence } from "@/components/bookings/customer-dispute-evidence";
import { BookingSnapshotCard } from "@/components/bookings/booking-snapshot-card";

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const { id } = await params;
  const { payment } = await searchParams;
  const user = await requireAuth();
  if (!user) notFound();

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      listing: true,
      vendor: true,
      payments: true,
      rewardTransactions: { where: { type: "EARNED" }, take: 1 },
      dispute: true,
    },
  }).catch(() => null);

  if (!booking || booking.customerId !== user.id) notFound();

  const rewardEarned = booking.rewardTransactions[0]?.amount ?? calcCashback(booking.totalAmount);

  const isPastEvent = new Date(booking.eventDate) < new Date();
  const canConfirm = isPastEvent && ["CONFIRMED", "IN_PROGRESS"].includes(booking.status) && !booking.completionConfirmedAt;
  const canDispute = isPastEvent && ["CONFIRMED", "IN_PROGRESS"].includes(booking.status) && !booking.dispute;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-display text-2xl font-bold">Booking</h1>

      {payment === "success" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="font-medium text-emerald-700">✓ Payment received — booking confirmed!</p>
          <p className="mt-1 text-sm text-emerald-600">
            Your funds are held securely in Evendor Escrow until after your event.
          </p>
        </div>
      )}

      {booking.status === "COMPLETED" && (
        <div
          className="flex items-center gap-3 rounded-xl border border-primary/25 px-4 py-3 text-sm font-semibold text-primary"
          style={{ background: "linear-gradient(135deg,rgba(122,46,61,0.07) 0%,rgba(229,223,217,0.15) 100%)" }}
        >
          🎁 You earned{" "}
          <span className="text-base font-bold">{formatCurrency(rewardEarned)}</span>{" "}
          in Evendor Rewards
        </div>
      )}

      {booking.dispute && (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
            <p className="font-semibold text-amber-800">⚠️ Dispute Open</p>
            <p className="text-amber-700">{booking.dispute.reason}</p>
            <p className="mt-1 text-xs text-amber-600">Status: {booking.dispute.status.replace("_", " ")}</p>
          </div>
          {booking.dispute.status === "OPEN" && (
            <CustomerDisputeEvidence bookingId={id} />
          )}
        </div>
      )}

      {booking.bookingSnapshot != null && (
        <BookingSnapshotCard snapshot={booking.bookingSnapshot} />
      )}

      <div className="glass space-y-4 rounded-2xl p-6">
        <p><strong>Listing:</strong> {booking.listing.title}</p>
        <p><strong>Vendor:</strong> {booking.vendor.businessName}</p>
        <p><strong>Event date:</strong> {new Date(booking.eventDate).toLocaleDateString()}</p>
        {booking.startTime && booking.endTime && (
          <p>
            <strong>Time:</strong>{" "}
            {new Date(booking.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
            {new Date(booking.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
        {booking.eventType && <p><strong>Event type:</strong> {booking.eventType}</p>}
        {booking.guestCount && <p><strong>Guests:</strong> {booking.guestCount}</p>}
        <p><strong>Total:</strong> {formatCurrency(booking.totalAmount)}</p>
        <p><strong>Deposit:</strong> {formatCurrency(booking.depositAmount)}</p>
        <p><strong>Status:</strong> {booking.status.replace("_", " ")}</p>
        <div className="rounded-lg bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
          🔒 Your payment is held securely in Evendor Escrow
          {booking.status !== "COMPLETED" ? " and will be released after event confirmation." : " — released."}
        </div>
      </div>

      {/* Post-event confirmation */}
      {(canConfirm || canDispute) && (
        <BookingConfirmation bookingId={id} canDispute={canDispute} />
      )}

      <div className="flex gap-4">
        <Link href={`/api/bookings/${id}/invoice`} target="_blank">
          <Button variant="outline">Download invoice</Button>
        </Link>
        {["RESERVED", "PENDING_PAYMENT"].includes(booking.status) && (
          <PayDepositButton bookingId={id} />
        )}
      </div>
    </div>
  );
}

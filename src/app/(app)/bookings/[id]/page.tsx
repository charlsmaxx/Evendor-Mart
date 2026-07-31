import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PayBookingButton } from "@/components/bookings/pay-booking-button";
import { calcCashback } from "@/lib/rewards-utils";
import { BookingConfirmation } from "@/components/bookings/booking-confirmation";
import { CustomerDisputeEvidence } from "@/components/bookings/customer-dispute-evidence";
import { BookingSnapshotCard } from "@/components/bookings/booking-snapshot-card";
import { CustomerCancelBooking } from "@/components/bookings/customer-cancel-booking";
import { AUTO_RELEASE_HOURS } from "@/core/shared/config";
import { settlePendingPaymentForBooking } from "@/core/payment-engine";
import { getCustomerBookingActions } from "@/lib/booking-customer-actions";
import { Download, MessageSquare } from "lucide-react";

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

  // Paystack's return URL is not proof of payment — verify with Paystack so a missed
  // webhook cannot leave the customer looking at an unpaid/expired reservation.
  let settleNote: "confirmed" | "refunded" | "pending" | null = null;
  if (payment === "success") {
    const settle = await settlePendingPaymentForBooking(id);
    if ("processed" in settle && settle.processed) settleNote = "confirmed";
    else if ("refunded" in settle && settle.refunded) settleNote = "refunded";
    else if ("rejected" in settle && settle.rejected) settleNote = "pending";
    else settleNote = "pending";
  }

  const [booking, conversationRows] = await Promise.all([
    prisma.booking
      .findUnique({
        where: { id },
        include: {
          listing: true,
          vendor: true,
          payments: true,
          rewardTransactions: { where: { type: "EARNED" }, take: 1 },
          dispute: true,
        },
      })
      .catch(() => null),
    prisma.$queryRaw<{ id: string }[]>`
      SELECT c.id
      FROM "Conversation" c
      INNER JOIN "Booking" b
        ON b."customerId" = c."customerId"
       AND b."vendorId" = c."vendorId"
      WHERE b.id = ${id}
      LIMIT 1
    `.catch(() => [] as { id: string }[]),
  ]);

  if (!booking || booking.customerId !== user.id) notFound();

  const conversationId = conversationRows[0]?.id ?? null;
  const paymentSucceeded = ["CONFIRMED", "IN_PROGRESS", "COMPLETED"].includes(booking.status);
  const rewardEarned = booking.rewardTransactions[0]?.amount ?? calcCashback(booking.totalAmount);
  const { canConfirm, canDispute, awaitingDecision, vendorMarkedDone } =
    getCustomerBookingActions(booking);
  const hasReceipt = booking.payments.some((p) => p.status === "SUCCESS") || paymentSucceeded;

  const autoReleaseAt = booking.vendorCompletedAt
    ? new Date(booking.vendorCompletedAt.getTime() + AUTO_RELEASE_HOURS * 60 * 60 * 1000)
    : new Date(new Date(booking.eventDate).getTime() + AUTO_RELEASE_HOURS * 60 * 60 * 1000);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-display text-2xl font-bold">Booking</h1>

      {payment === "success" && paymentSucceeded && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="font-medium text-emerald-700">✓ Payment received — booking confirmed!</p>
          <p className="mt-1 text-sm text-emerald-600">
            Your funds are held securely in Evendor Escrow until after your event.
          </p>
        </div>
      )}

      {payment === "success" && settleNote === "refunded" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="font-medium text-amber-800">Payment received, but this booking could not be confirmed</p>
          <p className="mt-1 text-sm text-amber-700">
            The slot was no longer available (or the reservation had expired). Your payment is being
            refunded to the original payment method.
          </p>
        </div>
      )}

      {payment === "success" && !paymentSucceeded && settleNote === "pending" && (
        <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
          <p className="font-medium text-foreground">Confirming your payment…</p>
          <p className="mt-1 text-sm text-muted-foreground">
            If this page does not update in a minute, refresh it. Your card is only charged once
            payment is confirmed.
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

      {vendorMarkedDone && awaitingDecision && (
        <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm">
          <p className="font-semibold text-primary">
            {booking.vendor.businessName} marked this job as delivered
          </p>
          <p className="mt-1 text-muted-foreground">
            Your payment is still locked in escrow. Approve below to release it, or report a
            problem to keep it locked while we investigate. If you do neither, it releases
            automatically on{" "}
            {autoReleaseAt.toLocaleString([], {
              dateStyle: "medium",
              timeStyle: "short",
            })}
            .
          </p>
        </div>
      )}

      {booking.dispute?.status === "CLOSED" &&
        ["CONFIRMED", "IN_PROGRESS"].includes(booking.status) &&
        !booking.completionConfirmedAt && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
            <p className="font-semibold text-emerald-800">Dispute cancelled</p>
            <p className="mt-1 text-emerald-700">
              You can approve the job below to release payment to the vendor, or report a new
              problem if something is still wrong.
            </p>
          </div>
        )}

      {booking.dispute && ["OPEN", "UNDER_REVIEW"].includes(booking.dispute.status) && (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
            <p className="font-semibold text-amber-800">⚠️ Dispute Open</p>
            <p className="text-amber-700">{booking.dispute.reason}</p>
            <p className="mt-1 text-xs text-amber-600">Status: {booking.dispute.status.replace("_", " ")}</p>
            <p className="mt-2 text-xs font-medium text-amber-800">
              🔒 Your payment is locked and cannot be released until this is resolved or you cancel the dispute.
            </p>
          </div>
          {booking.dispute.status === "OPEN" && (
            <CustomerDisputeEvidence bookingId={id} />
          )}
        </div>
      )}

      {booking.bookingSnapshot != null && (
        <BookingSnapshotCard snapshot={booking.bookingSnapshot} />
      )}

      <CustomerCancelBooking bookingId={id} />

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
        {booking.rewardsRedeemed > 0 && (
          <>
            <p className="text-emerald-700">
              <strong>Rewards applied:</strong> −{formatCurrency(booking.rewardsRedeemed)}
            </p>
            <p>
              <strong>You paid:</strong>{" "}
              {formatCurrency(booking.totalAmount - booking.rewardsRedeemed)}
            </p>
          </>
        )}
        <p><strong>Status:</strong> {booking.status.replace("_", " ")}</p>
        <div className="rounded-lg bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
          🔒 Your payment is held securely in Evendor Escrow
          {booking.dispute?.status === "OPEN"
            ? " — locked until your dispute is resolved."
            : booking.status !== "COMPLETED"
              ? " and will be released after you confirm the job is done."
              : " — released to the vendor."}
        </div>
      </div>

      {/* Confirm / dispute — also reachable from chat via #confirm */}
      {(canConfirm || canDispute) && (
        <div id="confirm">
          <BookingConfirmation
            bookingId={id}
            canConfirm={canConfirm}
            canDispute={canDispute}
          />
        </div>
      )}

      {!canConfirm &&
        !canDispute &&
        ["CONFIRMED", "IN_PROGRESS"].includes(booking.status) &&
        !booking.dispute && (
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            After your event (or once the vendor marks the job delivered), you can confirm
            completion here to release escrow — or report a problem from this page or your chat
            with the vendor.
          </div>
        )}

      <div className="flex flex-wrap gap-3">
        {hasReceipt && (
          <a href={`/api/bookings/${id}/invoice`} download={`evendor-receipt-${id.slice(0, 8)}.html`}>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Download receipt
            </Button>
          </a>
        )}
        {conversationId && (
          <Link href={`/messages/${conversationId}`}>
            <Button variant="outline" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Message vendor
            </Button>
          </Link>
        )}
        {["RESERVED", "PENDING_PAYMENT"].includes(booking.status) && (
          <PayBookingButton bookingId={id} />
        )}
      </div>
    </div>
  );
}

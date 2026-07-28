import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { updateBookingSchema } from "@/lib/validations/booking";
import { getVendorEvidence } from "@/lib/booking-evidence";
import { writeAuditLog } from "@/core/audit-engine";
import { emitDomainEvent } from "@/core/events";
import { EscrowRuleError, releaseEscrow } from "@/lib/escrow";
import { notifyUser } from "@/core/notification-engine";
import { refundRedeemedRewards } from "@/core/rewards-engine";
import { AUTO_RELEASE_HOURS } from "@/core/shared/config";
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const { id } = await params;

  const [booking, conversationRows] = await Promise.all([
    prisma.booking.findUnique({
      where: { id },
      include: {
        listing: { select: { id: true, title: true, slug: true, images: true } },
        vendor: { select: { id: true, businessName: true, userId: true } },
        customer: {
          select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true },
        },
        payments: { orderBy: { createdAt: "desc" } },
        payout: true,
        dispute: { include: { evidence: true } },
      },
    }),
    prisma.$queryRaw<{ id: string }[]>`
      SELECT c.id
      FROM "Conversation" c
      INNER JOIN "Booking" b
        ON b."customerId" = c."customerId"
       AND b."vendorId" = c."vendorId"
      WHERE b.id = ${id}
      LIMIT 1
    `,
  ]);

  if (!booking) return jsonError("Not found", 404);

  const isVendor = booking.vendor.userId === user.id;
  const isCustomer = booking.customerId === user.id;
  if (!isVendor && !isCustomer && user.role !== "ADMIN") {
    return jsonError("Forbidden", 403);
  }

  const conversationId = conversationRows[0]?.id ?? null;

  return jsonOk({
    id: booking.id,
    eventDate: booking.eventDate.toISOString(),
    startTime: booking.startTime?.toISOString() ?? null,
    endTime: booking.endTime?.toISOString() ?? null,
    eventType: booking.eventType,
    guestCount: booking.guestCount,
    totalAmount: booking.totalAmount,
    rewardsRedeemed: booking.rewardsRedeemed,
    status: booking.status,
    notes: booking.notes,
    bookingSnapshot: booking.bookingSnapshot,
    vendorEvidence: getVendorEvidence(booking.bookingSnapshot),
    completionConfirmedAt: booking.completionConfirmedAt?.toISOString() ?? null,
    reservationExpiresAt: booking.reservationExpiresAt?.toISOString() ?? null,
    createdAt: booking.createdAt.toISOString(),
    listing: booking.listing,
    customer: booking.customer,
    vendor: { businessName: booking.vendor.businessName },
    payments: booking.payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      escrowStatus: p.escrowStatus,
      paystackRef: p.paystackRef,
      createdAt: p.createdAt.toISOString(),
    })),
    payout: booking.payout
      ? {
          amount: booking.payout.amount,
          status: booking.payout.status,
          reference: booking.payout.reference,
          processedAt: booking.payout.processedAt?.toISOString() ?? null,
        }
      : null,
    dispute: booking.dispute
      ? {
          id: booking.dispute.id,
          status: booking.dispute.status,
          reason: booking.dispute.reason,
          resolution: booking.dispute.resolution,
          evidenceCount: booking.dispute.evidence.length,
        }
      : null,
    conversationId,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const parsed = updateBookingSchema.safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { vendor: true, payments: true, dispute: { select: { id: true, status: true } } },
  });
  if (!booking) return jsonError("Not found", 404);

  const isVendor = booking.vendor.userId === user.id;
  const isCustomer = booking.customerId === user.id;
  const isAdmin = user.role === "ADMIN";
  if (!isVendor && !isCustomer && !isAdmin) {
    return jsonError("Forbidden", 403);
  }

  const escrowHeld = booking.payments.some(
    (p) => p.status === "SUCCESS" && p.escrowStatus === "HELD"
  );
  const disputeOpen =
    booking.dispute &&
    (booking.dispute.status === "OPEN" || booking.dispute.status === "UNDER_REVIEW");

  if (parsed.data.status === "COMPLETED" && escrowHeld) {
    if (disputeOpen) {
      return jsonError("Resolve the open dispute before completing this booking.", 409);
    }

    // A vendor cannot release their own escrow. Marking the job done opens the
    // customer's confirmation window; funds move on confirmation or auto-release.
    if (isVendor && !isAdmin) {
      const updated = await prisma.booking.update({
        where: { id },
        data: { status: "IN_PROGRESS", vendorCompletedAt: new Date() },
      });

      await writeAuditLog({
        actorId: user.id,
        action: "BOOKING_VENDOR_COMPLETED",
        entityType: "Booking",
        entityId: id,
        metadata: { escrowHeld: true },
      });

      if (booking.customerId) {
        await notifyUser({
          userId: booking.customerId,
          title: "Approve your booking or report a problem",
          body: `${booking.vendor.businessName} marked your booking as delivered. Approve to release their payment, or report a problem to keep it locked. Funds release automatically in ${AUTO_RELEASE_HOURS} hours.`,
          link: `/bookings/${id}`,
        });
      }

      return jsonOk({
        ...updated,
        escrowMessage: `Marked as delivered. Your payout releases once the customer confirms, or automatically after ${AUTO_RELEASE_HOURS} hours.`,
      });
    }

    // Customer confirmation (or an admin acting on their behalf) releases escrow.
    try {
      await releaseEscrow(id, user.id);
    } catch (err) {
      if (err instanceof EscrowRuleError) return jsonError(err.message, 409);
      throw err;
    }
    const released = await prisma.booking.findUnique({ where: { id } });
    return jsonOk({
      ...released,
      escrowMessage: "Booking completed and payout released to the vendor.",
    });
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  // Rewards spent on a booking that never got paid for go back to the customer. Paid
  // cancellations are settled through the escrow refund path instead.
  const abandoned =
    (parsed.data.status === "CANCELLED" || parsed.data.status === "DECLINED") &&
    !booking.payments.some((p) => p.status === "SUCCESS");
  if (abandoned) {
    await refundRedeemedRewards(id);
  }

  if (user.role === "ADMIN" || isVendor) {
    await writeAuditLog({
      actorId: user.id,
      action: "BOOKING_STATUS_UPDATE",
      entityType: "Booking",
      entityId: id,
      metadata: { status: parsed.data.status },
    });
  }

  const notifyTargetId = isVendor ? booking.customerId : booking.vendor.userId;
  await emitDomainEvent({
    type: "BookingStatusUpdated",
    payload: {
      bookingId: id,
      recipientId: notifyTargetId,
      status: parsed.data.status,
      link: isVendor ? `/bookings/${id}` : `/vendor/bookings/${id}`,
    },
  });

  return jsonOk(updated);
}

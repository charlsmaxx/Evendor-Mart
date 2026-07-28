/**
 * Cancel a marketplace booking per the snapshotted cancellation policy.
 * Integrates with escrow (Paystack refund) and rewards — does not bypass either.
 */
import { prisma } from "@/core/infrastructure/prisma";
import { writeAuditLog } from "@/core/audit-engine";
import { emitDomainEvent } from "@/core/events";
import { createRefund, isPaystackConfigured } from "@/core/payment-engine/paystack";
import { refundRedeemedRewards } from "@/core/rewards-engine";
import {
  computeCancelAmounts,
  defaultModeratePolicy,
  evaluateCancellationPolicy,
  normalizeCancellationPolicy,
  type CancellationPolicy,
} from "@/lib/vendor-packages";

export class BookingCancelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingCancelError";
  }
}

type BookingSnapshot = {
  cancellationPolicy?: CancellationPolicy;
  policyAcceptedAt?: string;
  package?: { id: string; name: string };
  [key: string]: unknown;
};

function policyFromSnapshot(snapshot: unknown): CancellationPolicy {
  const snap = snapshot as BookingSnapshot | null;
  if (snap?.cancellationPolicy) return normalizeCancellationPolicy(snap.cancellationPolicy);
  return defaultModeratePolicy();
}

export async function cancelBooking(opts: {
  bookingId: string;
  actorUserId: string;
  reason?: string;
  /** Admin override ignores policy window (still audited). */
  adminOverride?: boolean;
}) {
  const booking = await prisma.booking.findUnique({
    where: { id: opts.bookingId },
    include: {
      payments: true,
      dispute: true,
      vendor: { select: { id: true, userId: true } },
      listing: { select: { title: true } },
    },
  });
  if (!booking) throw new BookingCancelError("Booking not found");

  const isCustomer = booking.customerId === opts.actorUserId;
  const isVendor = booking.vendor.userId === opts.actorUserId;
  if (!isCustomer && !isVendor && !opts.adminOverride) {
    throw new BookingCancelError("Forbidden");
  }

  if (["CANCELLED", "DECLINED", "EXPIRED", "COMPLETED"].includes(booking.status)) {
    throw new BookingCancelError("This booking can no longer be cancelled.");
  }

  if (booking.completionConfirmedAt) {
    throw new BookingCancelError("Completed bookings cannot be cancelled.");
  }

  if (booking.dispute && ["OPEN", "UNDER_REVIEW"].includes(booking.dispute.status)) {
    throw new BookingCancelError("Resolve the open dispute before cancelling.");
  }

  const policy = policyFromSnapshot(booking.bookingSnapshot);
  const evaluation = evaluateCancellationPolicy(policy, booking.eventDate);

  const successPayment = booking.payments.find((p) => p.status === "SUCCESS");
  const unpaid =
    !successPayment ||
    ["RESERVED", "PENDING_PAYMENT"].includes(booking.status);

  // Unpaid reservations can always be abandoned by the customer/vendor.
  if (!opts.adminOverride && !unpaid && !evaluation.allowCancel) {
    throw new BookingCancelError(evaluation.message);
  }

  const heldPayment = booking.payments.find(
    (p) => p.escrowStatus === "HELD" && p.status === "SUCCESS"
  );
  const paidAmount = successPayment?.amount ?? 0;

  let refundAmount = 0;
  let vendorRetain = 0;
  let feeAmount = 0;

  if (!unpaid && paidAmount > 0) {
    const amounts = computeCancelAmounts({
      paidAmount,
      refundPercent: opts.adminOverride && !evaluation.allowCancel ? 100 : evaluation.refundPercent,
      feeAmount: evaluation.feeAmount,
    });
    refundAmount = amounts.refundAmount;
    vendorRetain = amounts.vendorRetain;
    feeAmount = amounts.feeAmount;

    if (heldPayment?.escrowStatus === "RELEASED") {
      throw new BookingCancelError("Escrow has already been released for this booking.");
    }
  }

  const prevSnapshot =
    booking.bookingSnapshot && typeof booking.bookingSnapshot === "object"
      ? (booking.bookingSnapshot as Record<string, unknown>)
      : {};

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: "CANCELLED",
        bookingSnapshot: {
          ...prevSnapshot,
          cancellation: {
            cancelledAt: new Date().toISOString(),
            cancelledById: opts.actorUserId,
            reason: opts.reason ?? null,
            adminOverride: !!opts.adminOverride,
            evaluation: {
              allowCancel: evaluation.allowCancel,
              refundPercent: evaluation.refundPercent,
              feeAmount: evaluation.feeAmount,
              hoursUntilEvent: evaluation.hoursUntilEvent,
            },
            refundAmount,
            vendorRetain,
            feeAmount,
          },
        },
      },
    });

    if (heldPayment && refundAmount >= paidAmount && paidAmount > 0) {
      await tx.payment.update({
        where: { id: heldPayment.id },
        data: { status: "REFUNDED", escrowStatus: "REFUNDED" },
      });
    } else if (heldPayment && refundAmount > 0) {
      await tx.payment.update({
        where: { id: heldPayment.id },
        data: {
          escrowStatus: vendorRetain > 0 ? "HELD" : "REFUNDED",
          status: refundAmount >= paidAmount ? "REFUNDED" : "SUCCESS",
          metadata: {
            ...(typeof heldPayment.metadata === "object" && heldPayment.metadata
              ? (heldPayment.metadata as object)
              : {}),
            cancellationRefund: { refundAmount, vendorRetain, feeAmount },
          },
        },
      });
    }

    await writeAuditLog(
      {
        actorId: opts.actorUserId,
        action: "BOOKING_CANCELLED",
        entityType: "Booking",
        entityId: booking.id,
        metadata: {
          refundAmount,
          vendorRetain,
          feeAmount,
          adminOverride: !!opts.adminOverride,
          reason: opts.reason ?? null,
          policyPreset: policy.preset,
        },
      },
      tx
    );
  });

  // Unpaid / pending: return redeemed rewards immediately.
  if (unpaid || booking.rewardsRedeemed > 0) {
    try {
      await refundRedeemedRewards(booking.id);
    } catch {
      /* already returned or none */
    }
  }

  // Paid: refund via Paystack when configured.
  if (heldPayment?.paystackRef && refundAmount > 0 && isPaystackConfigured()) {
    try {
      const refund = await createRefund({
        transaction: heldPayment.paystackRef,
        amount: refundAmount * 100,
        merchant_note: `Booking cancel ${booking.id}`,
        customer_note: "Evendor booking cancellation refund",
      });
      await prisma.payment.update({
        where: { id: heldPayment.id },
        data: {
          status: refundAmount >= paidAmount ? "REFUNDED" : heldPayment.status,
          escrowStatus: refundAmount >= paidAmount ? "REFUNDED" : "REFUNDED",
          metadata: {
            ...(typeof heldPayment.metadata === "object" && heldPayment.metadata
              ? (heldPayment.metadata as object)
              : {}),
            cancelRefund: refund,
            cancellationRefund: { refundAmount, vendorRetain, feeAmount },
          },
        },
      });
      await writeAuditLog({
        actorId: opts.actorUserId,
        action: "CANCEL_REFUND_PROCESSED",
        entityType: "Payment",
        entityId: heldPayment.id,
        metadata: { bookingId: booking.id, refundAmount },
      });
    } catch (err) {
      await writeAuditLog({
        actorId: opts.actorUserId,
        action: "CANCEL_REFUND_FAILED",
        entityType: "Payment",
        entityId: heldPayment.id,
        metadata: {
          bookingId: booking.id,
          error: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }

  // If partial cancel keeps vendor share and escrow was held, release vendor retain
  // only when refund is full — for partial, leave admin/dispute to settle remaining.
  // Full refund path already set REFUNDED.

  await emitDomainEvent({
    type: "BookingStatusUpdated",
    payload: {
      recipientId: isCustomer ? booking.vendor.userId : booking.customerId,
      status: "CANCELLED",
      link: isCustomer ? `/vendor/bookings/${booking.id}` : `/bookings/${booking.id}`,
    },
  });

  await emitDomainEvent({
    type: "BookingCancelled",
    payload: {
      bookingId: booking.id,
      customerId: booking.customerId,
      vendorId: booking.vendorId,
      refundAmount,
      listingTitle: booking.listing.title,
      actorUserId: opts.actorUserId,
    },
  });

  return {
    bookingId: booking.id,
    status: "CANCELLED" as const,
    refundAmount,
    vendorRetain,
    feeAmount,
    allowCancel: evaluation.allowCancel,
    message: evaluation.message,
  };
}

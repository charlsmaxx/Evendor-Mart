/**
 * Single path that turns a successful Paystack charge into a confirmed booking.
 * Used by the webhook and by the Paystack return-URL verify, so neither can diverge.
 */
import "server-only";
import { prisma } from "@/core/infrastructure/prisma";
import { writeAuditLog } from "@/core/audit-engine";
import { emitDomainEvent } from "@/core/events";
import { createRefund, verifyTransaction } from "./paystack";
import { logStructuredWarn } from "@/lib/observability";

export type ConfirmPaymentResult = {
  processed?: boolean;
  idempotent?: boolean;
  rejected?: string;
  refunded?: boolean;
};

const CONFIRMABLE = new Set(["RESERVED", "PENDING_PAYMENT"]);
const ALREADY_LIVE = new Set(["CONFIRMED", "IN_PROGRESS", "COMPLETED"]);

async function slotTakenByOther(opts: {
  listingId: string;
  bookingId: string;
  eventDate: Date;
  startTime: Date | null;
  endTime: Date | null;
}): Promise<boolean> {
  const eventDay = opts.eventDate.toISOString().slice(0, 10);

  if (opts.startTime && opts.endTime) {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Booking"
      WHERE "listingId" = ${opts.listingId}
        AND id <> ${opts.bookingId}
        AND status = ANY(ARRAY['RESERVED','PENDING_PAYMENT','CONFIRMED','IN_PROGRESS']::"BookingStatus"[])
        AND DATE("eventDate") = ${eventDay}::date
        AND "startTime" IS NOT NULL AND "endTime" IS NOT NULL
        AND "startTime" < ${opts.endTime}
        AND "endTime" > ${opts.startTime}
      LIMIT 1
    `;
    return rows.length > 0;
  }

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Booking"
    WHERE "listingId" = ${opts.listingId}
      AND id <> ${opts.bookingId}
      AND status = ANY(ARRAY['RESERVED','PENDING_PAYMENT','CONFIRMED','IN_PROGRESS']::"BookingStatus"[])
      AND DATE("eventDate") = ${eventDay}::date
    LIMIT 1
  `;
  return rows.length > 0;
}

/**
 * Refund a charge that arrived after the booking was no longer confirmable.
 * Leaves an audit trail either way so finance can chase a failed refund.
 */
async function refundOrphanedCharge(opts: {
  paymentId: string;
  bookingId: string;
  reference: string;
  reason: string;
}): Promise<boolean> {
  try {
    await createRefund({
      transaction: opts.reference,
      customer_note: "Your booking could not be confirmed. This payment has been refunded.",
      merchant_note: opts.reason,
    });
    await prisma.payment.update({
      where: { id: opts.paymentId },
      data: { status: "REFUNDED", escrowStatus: "REFUNDED" },
    });
    await writeAuditLog({
      action: "PAYMENT_ORPHAN_REFUNDED",
      entityType: "Payment",
      entityId: opts.paymentId,
      metadata: { bookingId: opts.bookingId, reference: opts.reference, reason: opts.reason },
    });
    return true;
  } catch (error) {
    logStructuredWarn("payment_orphan_refund_failed", {
      paymentId: opts.paymentId,
      bookingId: opts.bookingId,
      message: error instanceof Error ? error.message : "unknown",
    });
    await writeAuditLog({
      action: "PAYMENT_ORPHAN_REFUND_FAILED",
      entityType: "Payment",
      entityId: opts.paymentId,
      metadata: {
        bookingId: opts.bookingId,
        reference: opts.reference,
        reason: opts.reason,
        error: error instanceof Error ? error.message : "unknown",
      },
    });
    return false;
  }
}

/**
 * Apply a verified Paystack charge to our ledger and booking.
 * Safe to call from webhook or from a return-URL verify — idempotent on SUCCESS.
 */
export async function confirmSuccessfulCharge(opts: {
  reference: string;
  paidKobo: number;
  currency?: string;
  source: "webhook" | "verify";
  metadata?: object;
}): Promise<ConfirmPaymentResult> {
  const payment = await prisma.payment.findUnique({
    where: { paystackRef: opts.reference },
    include: { booking: true },
  });

  if (!payment) return { rejected: "payment_not_found" };
  if (payment.status === "SUCCESS" || payment.status === "REFUNDED") {
    return { idempotent: true };
  }

  const expectedKobo = payment.amount * 100;
  if (opts.paidKobo < expectedKobo) {
    await writeAuditLog({
      action: "PAYMENT_AMOUNT_MISMATCH",
      entityType: "Payment",
      entityId: payment.id,
      metadata: {
        reference: opts.reference,
        paidKobo: opts.paidKobo,
        expectedKobo,
        source: opts.source,
      },
    });
    return { rejected: "amount_mismatch" };
  }
  if (opts.currency && opts.currency !== "NGN") {
    await writeAuditLog({
      action: "PAYMENT_CURRENCY_MISMATCH",
      entityType: "Payment",
      entityId: payment.id,
      metadata: { reference: opts.reference, currency: opts.currency, source: opts.source },
    });
    return { rejected: "currency_mismatch" };
  }

  const booking = payment.booking;

  // Money already belongs to a live booking — record the charge, do not re-emit.
  if (ALREADY_LIVE.has(booking.status)) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCESS",
        escrowStatus: payment.escrowStatus === "NONE" ? "HELD" : payment.escrowStatus,
        metadata: (opts.metadata ?? {}) as object,
      },
    });
    return { idempotent: true };
  }

  if (!CONFIRMABLE.has(booking.status)) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCESS",
        escrowStatus: "HELD",
        metadata: (opts.metadata ?? {}) as object,
      },
    });
    const refunded = await refundOrphanedCharge({
      paymentId: payment.id,
      bookingId: booking.id,
      reference: opts.reference,
      reason: `Charge arrived for booking in status ${booking.status}`,
    });
    return { rejected: "booking_not_confirmable", refunded };
  }

  // Reservation wall-clock expired but status not flipped yet — treat as dead.
  if (
    booking.status === "RESERVED" &&
    booking.reservationExpiresAt &&
    booking.reservationExpiresAt < new Date()
  ) {
    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: "EXPIRED", updatedAt: new Date() },
      });
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "SUCCESS",
          escrowStatus: "HELD",
          metadata: (opts.metadata ?? {}) as object,
        },
      });
    });
    const refunded = await refundOrphanedCharge({
      paymentId: payment.id,
      bookingId: booking.id,
      reference: opts.reference,
      reason: "Charge arrived after reservation expired",
    });
    return { rejected: "reservation_expired", refunded };
  }

  const conflict = await slotTakenByOther({
    listingId: booking.listingId,
    bookingId: booking.id,
    eventDate: booking.eventDate,
    startTime: booking.startTime,
    endTime: booking.endTime,
  });

  if (conflict) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCESS",
        escrowStatus: "HELD",
        metadata: (opts.metadata ?? {}) as object,
      },
    });
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "EXPIRED", updatedAt: new Date() },
    });
    const refunded = await refundOrphanedCharge({
      paymentId: payment.id,
      bookingId: booking.id,
      reference: opts.reference,
      reason: "Slot already taken by another confirmed booking",
    });
    return { rejected: "slot_conflict", refunded };
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCESS",
        escrowStatus: payment.escrowStatus === "NONE" ? "HELD" : payment.escrowStatus,
        metadata: (opts.metadata ?? {}) as object,
      },
    });
    await tx.booking.update({
      where: { id: booking.id },
      data: { status: "CONFIRMED", reservationExpiresAt: null, updatedAt: new Date() },
    });
    await writeAuditLog(
      {
        action: "PAYMENT_SUCCESS",
        entityType: "Payment",
        entityId: payment.id,
        metadata: {
          reference: opts.reference,
          amountKobo: opts.paidKobo,
          source: opts.source,
        },
      },
      tx
    );
  });

  await emitDomainEvent({
    type: "PaymentReceived",
    payload: {
      paymentId: payment.id,
      bookingId: booking.id,
      customerId: booking.customerId,
      amount: payment.amount,
    },
  });
  await emitDomainEvent({
    type: "BookingConfirmed",
    payload: {
      bookingId: booking.id,
      vendorId: booking.vendorId,
    },
  });

  return { processed: true };
}

/**
 * Recover from a missed webhook: ask Paystack whether this booking's pending
 * payment actually settled, and confirm if so.
 */
export async function settlePendingPaymentForBooking(
  bookingId: string
): Promise<ConfirmPaymentResult | { skipped: true }> {
  const payment = await prisma.payment.findFirst({
    where: {
      bookingId,
      status: "PENDING",
      paystackRef: { not: null },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!payment?.paystackRef) return { skipped: true };

  let verified: Awaited<ReturnType<typeof verifyTransaction>>;
  try {
    verified = await verifyTransaction(payment.paystackRef);
  } catch (error) {
    logStructuredWarn("payment_verify_failed", {
      bookingId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return { rejected: "verify_failed" };
  }

  if (verified.status !== "success") return { skipped: true };

  return confirmSuccessfulCharge({
    reference: payment.paystackRef,
    paidKobo: verified.amount,
    currency: verified.currency,
    source: "verify",
    metadata: verified as object,
  });
}

/**
 * Escrow engine — single source of truth for escrow lifecycle.
 */
import { prisma } from "@/core/infrastructure/prisma";
import { earnReward } from "@/core/rewards-engine";
import { writeAuditLog } from "@/core/audit-engine";
import { emitDomainEvent } from "@/core/events";
import { createRefund, isPaystackConfigured } from "@/core/payment-engine/paystack";
import { notifyUser } from "@/core/notification-engine";
import { AUTO_RELEASE_HOURS, VENDOR_PAYOUT_PERCENT, vendorShareAmount } from "@/core/shared/config";
import crypto from "crypto";

function payoutReference(): string {
  return `payout_${crypto.randomBytes(10).toString("hex")}`;
}

/** Raised when escrow rules forbid an action. Routes map this to a 409. */
export class EscrowRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EscrowRuleError";
  }
}

export async function releaseEscrow(bookingId: string, confirmedByUserId?: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { vendor: true, payments: true, customer: true, dispute: true },
  });
  if (!booking) throw new Error("Booking not found");
  if (!["CONFIRMED", "IN_PROGRESS"].includes(booking.status)) {
    throw new Error("Booking is not in a releasable state");
  }

  // Last line of defence: an open dispute locks the funds no matter which caller
  // asks for a release (customer confirm, admin action, or the auto-release cron).
  if (booking.dispute && ["OPEN", "UNDER_REVIEW"].includes(booking.dispute.status)) {
    throw new EscrowRuleError(
      "Funds are locked while a dispute is open. Resolve the dispute first."
    );
  }

  const payoutAmount = vendorShareAmount(booking.totalAmount);

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "COMPLETED",
        completionConfirmedAt: new Date(),
        completionConfirmedBy: confirmedByUserId ?? null,
        updatedAt: new Date(),
      },
    });

    await tx.payment.updateMany({
      where: { bookingId, escrowStatus: "HELD" },
      data: { escrowStatus: "RELEASED" },
    });

    // PAID means "escrow released into the vendor's Evendor balance". Moving that
    // balance to a bank account is a separate Withdrawal.
    await tx.payout.upsert({
      where: { bookingId },
      update: { status: "PAID", processedAt: new Date() },
      create: {
        bookingId,
        vendorId: booking.vendorId,
        amount: payoutAmount,
        status: "PAID",
        reference: payoutReference(),
        processedAt: new Date(),
      },
    });

    await writeAuditLog(
      {
        actorId: confirmedByUserId ?? null,
        action: "ESCROW_RELEASED",
        entityType: "Booking",
        entityId: bookingId,
        metadata: { payoutAmount, vendorId: booking.vendorId },
      },
      tx
    );
  });

  if (booking.customerId) {
    try {
      await earnReward(booking.customerId, bookingId, booking.totalAmount);
    } catch (error) {
      // Escrow is already released — do not roll back payout. Wallet load will
      // retry via creditMissedCompletedBookingRewards.
      console.error(
        `[escrow] earnReward failed for booking ${bookingId} (customer ${booking.customerId}):`,
        error
      );
    }
  }

  await emitDomainEvent({
    type: "EscrowReleased",
    payload: {
      bookingId,
      customerId: booking.customerId,
      vendorId: booking.vendorId,
      payoutAmount,
    },
  });

  await emitDomainEvent({
    type: "BookingCompleted",
    payload: { bookingId, vendorId: booking.vendorId, customerId: booking.customerId },
  });
}

export async function openDispute(bookingId: string, raisedById: string, reason: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { vendor: true, payments: true, payout: true, dispute: true },
  });
  if (!booking) throw new Error("Booking not found");
  if (booking.customerId !== raisedById) throw new Error("Only the customer can raise a dispute");
  if (!booking.customerId) throw new EscrowRuleError("This booking has no customer on file.");

  // Once escrow is released the vendor may already have withdrawn, so a dispute can no
  // longer lock anything. Without this guard opening one would also reopen a COMPLETED
  // booking while leaving the payout intact.
  const escrowLockable = booking.payments.some((p) =>
    ["HELD", "DISPUTED"].includes(p.escrowStatus)
  );
  if (booking.payout || !escrowLockable) {
    throw new EscrowRuleError(
      "This booking's payment has already been released. Please contact support instead."
    );
  }

  if (booking.dispute && ["OPEN", "UNDER_REVIEW"].includes(booking.dispute.status)) {
    throw new EscrowRuleError("A dispute is already open for this booking.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "IN_PROGRESS", updatedAt: new Date() },
    });

    await tx.payment.updateMany({
      where: { bookingId },
      data: { escrowStatus: "DISPUTED" },
    });

    await tx.dispute.upsert({
      where: { bookingId },
      update: {
        reason,
        status: "OPEN",
        raisedById,
        adminNotes: null,
        resolution: null,
        resolvedAt: null,
        resolvedById: null,
        updatedAt: new Date(),
      },
      create: { bookingId, raisedById, reason, status: "OPEN" },
    });

    await writeAuditLog(
      {
        actorId: raisedById,
        action: "DISPUTE_CREATED",
        entityType: "Booking",
        entityId: bookingId,
        metadata: { reason },
      },
      tx
    );
  });

  await postDisputeOpenedChatNotice({
    bookingId,
    customerId: booking.customerId,
    vendorId: booking.vendorId,
    listingId: booking.listingId,
  });

  await emitDomainEvent({
    type: "DisputeOpened",
    payload: {
      bookingId,
      vendorId: booking.vendorId,
      raisedById,
      customerId: booking.customerId,
      reason,
    },
  });
}

/**
 * Customer withdraws their own open dispute. Escrow returns to HELD — still locked
 * from the vendor until the customer confirms or auto-release runs.
 */
export async function cancelDispute(bookingId: string, customerId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { dispute: true, payments: true },
  });
  if (!booking) throw new Error("Booking not found");
  if (booking.customerId !== customerId) {
    throw new EscrowRuleError("Only the customer who opened this dispute can cancel it.");
  }
  if (!booking.dispute || booking.dispute.status !== "OPEN") {
    throw new EscrowRuleError("There is no open dispute to cancel.");
  }
  if (booking.dispute.raisedById !== customerId) {
    throw new EscrowRuleError("Only the customer who opened this dispute can cancel it.");
  }

  const restoreStatus = booking.vendorCompletedAt ? "IN_PROGRESS" : "CONFIRMED";

  await prisma.$transaction(async (tx) => {
    await tx.dispute.update({
      where: { id: booking.dispute!.id },
      data: {
        status: "CLOSED",
        adminNotes: "Cancelled by customer",
        resolvedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await tx.payment.updateMany({
      where: { bookingId, escrowStatus: "DISPUTED" },
      data: { escrowStatus: "HELD" },
    });

    await tx.booking.update({
      where: { id: bookingId },
      data: { status: restoreStatus, updatedAt: new Date() },
    });

    await writeAuditLog(
      {
        actorId: customerId,
        action: "DISPUTE_CANCELLED",
        entityType: "Dispute",
        entityId: booking.dispute!.id,
        metadata: { bookingId },
      },
      tx
    );
  });

  await postDisputeAdminChatMessage({
    customerId,
    vendorId: booking.vendorId,
    listingId: booking.listingId,
    body:
      "Evendor notice: The customer cancelled this dispute. Funds remain in escrow until the customer confirms the job is done, or until the automatic release window ends.",
  });
}

async function findPlatformAdminSenderId(): Promise<string | null> {
  const admin = await prisma.user.findFirst({
    where: {
      OR: [{ role: "ADMIN" }, { adminRole: { not: null } }],
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return admin?.id ?? null;
}

async function postDisputeAdminChatMessage(input: {
  customerId: string;
  vendorId: string;
  listingId?: string | null;
  body: string;
}) {
  const senderId = await findPlatformAdminSenderId();
  if (!senderId) return;

  const conversation = await prisma.conversation.upsert({
    where: {
      customerId_vendorId: {
        customerId: input.customerId,
        vendorId: input.vendorId,
      },
    },
    create: {
      customerId: input.customerId,
      vendorId: input.vendorId,
      listingId: input.listingId ?? undefined,
    },
    update: { updatedAt: new Date() },
  });

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId,
      body: input.body,
      type: "ADMIN",
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });
}

async function postDisputeOpenedChatNotice(input: {
  bookingId: string;
  customerId: string;
  vendorId: string;
  listingId: string;
}) {
  await postDisputeAdminChatMessage({
    customerId: input.customerId,
    vendorId: input.vendorId,
    listingId: input.listingId,
    body:
      "Evendor notice: This booking is now in dispute. Your payment is locked in escrow and cannot be released to the vendor until our team resolves the case.\n\n" +
      "If you opened this dispute, please upload evidence (photos, videos, or documents) on your booking page so we can review it quickly:\n" +
      `/bookings/${input.bookingId}#confirm\n\n` +
      "Our team typically responds within 24–48 hours.",
  });
}

export async function resolveDispute(
  disputeId: string,
  adminId: string,
  resolution: "FULL_REFUND" | "FULL_PAYOUT" | "PARTIAL",
  adminNotes?: string,
  partialVendorPercent?: number
) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: { booking: { include: { vendor: true, payments: true } } },
  });
  if (!dispute) throw new Error("Dispute not found");

  const booking = dispute.booking;
  const disputeStatus =
    resolution === "FULL_REFUND"
      ? "RESOLVED_REFUND"
      : resolution === "FULL_PAYOUT"
        ? "RESOLVED_PAYOUT"
        : "RESOLVED_PARTIAL";

  const bookingStatus = resolution === "FULL_REFUND" ? "CANCELLED" : "COMPLETED";

  const payoutPct =
    resolution === "FULL_PAYOUT"
      ? VENDOR_PAYOUT_PERCENT
      : resolution === "FULL_REFUND"
        ? 0
        : (partialVendorPercent ?? Math.round(VENDOR_PAYOUT_PERCENT / 2));

  const payoutAmount = Math.round(booking.totalAmount * (payoutPct / 100));

  await prisma.$transaction(async (tx) => {
    await tx.dispute.update({
      where: { id: disputeId },
      data: {
        status: disputeStatus,
        adminNotes,
        resolution,
        resolvedAt: new Date(),
        resolvedById: adminId,
        updatedAt: new Date(),
      },
    });

    await tx.booking.update({
      where: { id: booking.id },
      data: { status: bookingStatus, updatedAt: new Date() },
    });

    await tx.payment.updateMany({
      where: { bookingId: booking.id },
      data: {
        escrowStatus: resolution === "FULL_REFUND" ? "REFUNDED" : "RELEASED",
      },
    });

    if (payoutAmount > 0) {
      await tx.payout.upsert({
        where: { bookingId: booking.id },
        update: { amount: payoutAmount, status: "PAID", processedAt: new Date() },
        create: {
          bookingId: booking.id,
          vendorId: booking.vendorId,
          amount: payoutAmount,
          status: "PAID",
          reference: payoutReference(),
          notes: `Dispute resolution: ${resolution}`,
          processedAt: new Date(),
        },
      });
    }

    await writeAuditLog(
      {
        actorId: adminId,
        action: "DISPUTE_RESOLVED",
        entityType: "Dispute",
        entityId: disputeId,
        metadata: { resolution, payoutAmount, adminNotes },
      },
      tx
    );
  });

  await emitDomainEvent({
    type: "DisputeResolved",
    payload: {
      disputeId,
      bookingId: booking.id,
      resolution,
      payoutAmount,
      customerId: booking.customerId,
      vendorId: booking.vendorId,
    },
  });

  // Customer confirmed value delivered (full or partial payout) — credit cashback.
  if (
    booking.customerId &&
    (resolution === "FULL_PAYOUT" || resolution === "PARTIAL")
  ) {
    // FULL_PAYOUT: cashback on full booking. PARTIAL: on vendor payout portion (net paid).
    const amountForCashback =
      resolution === "FULL_PAYOUT" ? booking.totalAmount : payoutAmount;
    try {
      await earnReward(booking.customerId, booking.id, amountForCashback);
    } catch (error) {
      console.error(
        `[escrow] earnReward failed after dispute ${disputeId} for booking ${booking.id}:`,
        error
      );
    }
  }

  if (booking.customerId) {
    const resolutionCopy =
      resolution === "FULL_REFUND"
        ? "Evendor notice: This dispute was resolved with a full refund to the customer. Escrow funds will not be released to the vendor."
        : resolution === "FULL_PAYOUT"
          ? "Evendor notice: This dispute was resolved in the vendor's favour. Escrow funds have been released to the vendor."
          : "Evendor notice: This dispute was resolved with a partial outcome. Part of the escrow was released to the vendor and the remainder refunded to the customer.";
    await postDisputeAdminChatMessage({
      customerId: booking.customerId,
      vendorId: booking.vendorId,
      listingId: booking.listingId,
      body: resolutionCopy,
    });
  }

  const successPayment = booking.payments.find(
    (p) => p.status === "SUCCESS" && p.paystackRef
  );
  if (
    successPayment?.paystackRef &&
    isPaystackConfigured() &&
    (resolution === "FULL_REFUND" || resolution === "PARTIAL")
  ) {
    const refundNaira =
      resolution === "FULL_REFUND"
        ? successPayment.amount
        : Math.max(0, successPayment.amount - payoutAmount);
    if (refundNaira > 0) {
      try {
        const refund = await createRefund({
          transaction: successPayment.paystackRef,
          amount: refundNaira * 100,
          merchant_note: `Dispute ${resolution}: ${disputeId}`,
          customer_note: "Evendor dispute resolution refund",
        });
        await prisma.payment.update({
          where: { id: successPayment.id },
          data: {
            metadata: {
              ...(typeof successPayment.metadata === "object" && successPayment.metadata
                ? (successPayment.metadata as object)
                : {}),
              refund: refund,
            },
          },
        });
      } catch (err) {
        await writeAuditLog({
          actorId: adminId,
          action: "REFUND_FAILED",
          entityType: "Payment",
          entityId: successPayment.id,
          metadata: {
            disputeId,
            resolution,
            error: err instanceof Error ? err.message : String(err),
          },
        });
      }
    }
  }
}

export async function autoReleaseExpiredEscrows(): Promise<number> {
  const cutoff = new Date(Date.now() - AUTO_RELEASE_HOURS * 60 * 60 * 1000);

  // Release window starts at vendorCompletedAt when the vendor marks the job done,
  // otherwise at eventDate. Using eventDate alone would release a past-dated booking
  // on the next cron tick, and would ignore the customer's confirm window after delivery.
  const releasable = await prisma.booking.findMany({
    where: {
      status: { in: ["CONFIRMED", "IN_PROGRESS"] },
      completionConfirmedAt: null,
      OR: [
        { dispute: null },
        { dispute: { is: { status: { notIn: ["OPEN", "UNDER_REVIEW"] } } } },
      ],
      AND: [
        {
          OR: [
            { vendorCompletedAt: { lte: cutoff } },
            { vendorCompletedAt: null, eventDate: { lte: cutoff } },
          ],
        },
      ],
    },
    select: { id: true },
  });

  let released = 0;
  for (const b of releasable) {
    try {
      await releaseEscrow(b.id, undefined);
      released++;
    } catch {
      /* continue */
    }
  }

  return released;
}

const REMINDER_TITLE = "Confirm your booking";

/** In-app (and optional email) nudge before 48h auto-release. */
export async function sendCompletionReminders(): Promise<number> {
  const now = new Date();
  const autoReleaseCutoff = new Date(Date.now() - AUTO_RELEASE_HOURS * 60 * 60 * 1000);

  const candidates = await prisma.booking.findMany({
    where: {
      status: { in: ["CONFIRMED", "IN_PROGRESS"] },
      completionConfirmedAt: null,
      customerId: { not: null },
      OR: [
        { dispute: null },
        { dispute: { is: { status: { notIn: ["OPEN", "UNDER_REVIEW"] } } } },
      ],
      AND: [
        {
          OR: [
            { vendorCompletedAt: { lte: now, gt: autoReleaseCutoff } },
            {
              vendorCompletedAt: null,
              eventDate: { lte: now, gt: autoReleaseCutoff },
            },
          ],
        },
      ],
    },
    include: {
      customer: { select: { id: true, email: true, fullName: true } },
      listing: { select: { title: true } },
    },
  });

  let sent = 0;
  for (const booking of candidates) {
    if (!booking.customerId) continue;
    const link = `/bookings/${booking.id}`;

    const existing = await prisma.notification.findFirst({
      where: { userId: booking.customerId, link, title: REMINDER_TITLE },
    });
    if (existing) continue;

    await notifyUser({
      userId: booking.customerId,
      title: REMINDER_TITLE,
      body: booking.vendorCompletedAt
        ? `The vendor marked "${booking.listing.title}" as delivered. Confirm completion or open a dispute within ${AUTO_RELEASE_HOURS} hours before funds auto-release.`
        : `Your event for "${booking.listing.title}" has passed. Confirm completion or open a dispute within ${AUTO_RELEASE_HOURS} hours before funds auto-release.`,
      link,
    });

    if (booking.customer?.email) {
      try {
        const { sendTransactionalEmail } = await import("@/lib/email");
        await sendTransactionalEmail({
          to: booking.customer.email,
          subject: "Please confirm your Evendor booking",
          text: `Hi${booking.customer.fullName ? ` ${booking.customer.fullName}` : ""},\n\nYour event for "${booking.listing.title}" has passed. Please confirm completion or open a dispute within ${AUTO_RELEASE_HOURS} hours:\n${process.env.NEXT_PUBLIC_APP_URL ?? ""}${link}\n\n— Evendor`,
        });
      } catch {
        /* email optional until Resend is configured */
      }
    }

    sent++;
  }

  return sent;
}

/** Cron entry: expire reservations, send reminders, auto-release escrow. */
export async function runEscrowMaintenance(): Promise<{
  expiredReservations: number;
  remindersSent: number;
  autoReleased: number;
}> {
  const { expireStaleReservations } = await import("@/core/booking-engine/service");
  const [expiredReservations, remindersSent, autoReleased] = await Promise.all([
    expireStaleReservations(),
    sendCompletionReminders(),
    autoReleaseExpiredEscrows(),
  ]);
  return { expiredReservations, remindersSent, autoReleased };
}

export async function refreshVendorMetrics(vendorId: string) {
  const [total, cancelled, completed, disputed] = await Promise.all([
    prisma.booking.count({ where: { vendorId } }),
    prisma.booking.count({ where: { vendorId, status: { in: ["CANCELLED", "DECLINED"] } } }),
    prisma.booking.count({ where: { vendorId, status: "COMPLETED" } }),
    prisma.dispute.count({ where: { booking: { vendorId } } }),
  ]);

  if (total === 0) return;

  await prisma.vendorProfile.update({
    where: { id: vendorId },
    data: {
      cancellationRate: Math.round((cancelled / total) * 100),
      completionRate: Math.round((completed / total) * 100),
      disputeRate: Math.round((disputed / total) * 100),
    },
  });
}

/**
 * MVP vendor payout requests — admin review then recorded manual business payment.
 *
 * Does NOT call Paystack Transfers. Customer charges remain on the existing Paystack path.
 * Payout amount is always taken from the server-created Payout row, never from the client.
 */
import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/core/infrastructure/prisma";
import { writeAuditLog } from "@/core/audit-engine";
import { emitDomainEvent } from "@/core/events";
import { notifyFinanceAdmins, notifyUser, notifyVendorByProfileId } from "@/core/notification-engine";
import { PLATFORM_COMMISSION_PERCENT, vendorShareAmount } from "@/core/shared/config";
import { formatCurrency } from "@/lib/utils";
import { isOpenDispute } from "@/lib/booking-customer-actions";
import { readVendorBankAccount } from "./payout-service";

export class PayoutRequestError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "PayoutRequestError";
    this.status = status;
  }
}

function last4(accountNumber: string): string {
  return accountNumber.slice(-4);
}

async function assertPayoutRequestEligible(input: {
  vendorId: string;
  bookingId: string;
}) {
  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    include: {
      payout: true,
      payments: true,
      dispute: { select: { status: true } },
      listing: { select: { title: true, type: true } },
      vendor: { select: { id: true, businessName: true, metadata: true, userId: true } },
      customer: { select: { id: true, fullName: true } },
    },
  });
  if (!booking) throw new PayoutRequestError("Booking not found.", 404);
  if (booking.vendorId !== input.vendorId) {
    throw new PayoutRequestError("You can only request payout for your own bookings.", 403);
  }
  if (booking.status !== "COMPLETED") {
    throw new PayoutRequestError(
      "Payout can be requested after the booking is completed.",
      409
    );
  }
  if (["CANCELLED", "DECLINED", "EXPIRED"].includes(booking.status)) {
    throw new PayoutRequestError("This booking is not eligible for payout.", 409);
  }
  if (isOpenDispute(booking.dispute)) {
    throw new PayoutRequestError(
      "Payout is on hold while a customer problem report is being reviewed.",
      409
    );
  }

  const success = booking.payments.filter((p) => p.status === "SUCCESS");
  const refunded = booking.payments.some(
    (p) => p.status === "REFUNDED" || p.escrowStatus === "REFUNDED"
  );
  if (success.length === 0) {
    throw new PayoutRequestError("No successful customer payment was found for this booking.", 409);
  }
  if (refunded && success.every((p) => p.status === "REFUNDED" || p.escrowStatus === "REFUNDED")) {
    throw new PayoutRequestError("This booking was refunded, so no payout is due.", 409);
  }

  const payout = booking.payout;
  if (!payout) {
    throw new PayoutRequestError(
      "This booking is not yet available for payout. Complete the job first.",
      409
    );
  }
  if (payout.status === "PAID") {
    throw new PayoutRequestError("This booking has already been paid out.", 409);
  }
  if (payout.status === "REJECTED") {
    throw new PayoutRequestError("This payout request was rejected. Contact Evendor if you need a review.", 409);
  }
  if (["REQUESTED", "UNDER_REVIEW", "APPROVED"].includes(payout.status)) {
    throw new PayoutRequestError("A payout request for this booking is already under review.", 409);
  }
  if (payout.status === "ON_HOLD") {
    throw new PayoutRequestError("This payout is on hold and cannot be requested again yet.", 409);
  }
  if (payout.status !== "PENDING") {
    throw new PayoutRequestError("This booking is not available for a payout request.", 409);
  }
  if (payout.amount <= 0) {
    throw new PayoutRequestError("Vendor payable amount is not positive.", 409);
  }

  const bank = readVendorBankAccount(booking.vendor.metadata);
  if (!bank || bank.verified === false) {
    throw new PayoutRequestError(
      "Add and verify your payout bank account before requesting payout.",
      409
    );
  }

  return { booking, payout, bank };
}

export async function requestBookingPayout(input: {
  vendorId: string;
  bookingId: string;
  requestedById: string;
}) {
  const { booking, payout, bank } = await assertPayoutRequestEligible(input);

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.payout.updateMany({
      where: { id: payout.id, vendorId: input.vendorId, status: "PENDING" },
      data: {
        status: "REQUESTED",
        requestedAt: new Date(),
        requestedById: input.requestedById,
        destinationBank: bank.bankName,
        destinationAccountName: bank.accountName,
        destinationAccountLast4: last4(bank.accountNumber),
      },
    });
    if (result.count !== 1) {
      throw new PayoutRequestError("A payout request for this booking is already under review.", 409);
    }
    await writeAuditLog(
      {
        actorId: input.requestedById,
        action: "PAYOUT_REQUESTED",
        entityType: "Payout",
        entityId: payout.id,
        metadata: {
          bookingId: booking.id,
          vendorId: input.vendorId,
          amount: payout.amount,
        },
      },
      tx
    );
    return tx.payout.findUniqueOrThrow({ where: { id: payout.id } });
  });

  const amountLabel = formatCurrency(payout.amount);
  await notifyVendorByProfileId(input.vendorId, {
    title: "Payout request submitted",
    body: `Your request for ${amountLabel} is being reviewed by Evendor before payment is made.`,
    link: "/vendor/payouts",
  });
  await notifyFinanceAdmins({
    title: "New vendor payout request",
    body: `${booking.vendor.businessName} requested ${amountLabel} for booking ${booking.id.slice(0, 8)}.`,
    link: `/admin/escrow/${payout.id}`,
  });
  await emitDomainEvent({
    type: "PayoutRequested",
    payload: {
      payoutId: payout.id,
      bookingId: booking.id,
      vendorId: input.vendorId,
      amount: payout.amount,
    },
  });

  return updated;
}

export async function reviewPayoutRequest(input: {
  adminId: string;
  payoutId: string;
  action: "APPROVE" | "REJECT" | "HOLD";
  reason?: string;
}) {
  const payout = await prisma.payout.findUnique({
    where: { id: input.payoutId },
    include: {
      vendor: { select: { id: true, businessName: true, userId: true } },
      booking: {
        include: {
          payments: true,
          dispute: { select: { status: true } },
        },
      },
    },
  });
  if (!payout) throw new PayoutRequestError("Payout request not found.", 404);

  if (payout.status === "PAID") {
    throw new PayoutRequestError("This payout has already been marked paid.", 409);
  }

  if (input.action === "APPROVE") {
    if (isOpenDispute(payout.booking.dispute)) {
      throw new PayoutRequestError("Cannot approve while a customer problem report is open.", 409);
    }
    if (payout.booking.status !== "COMPLETED") {
      throw new PayoutRequestError("Cannot approve payout for an incomplete booking.", 409);
    }
    const success = payout.booking.payments.some((p) => p.status === "SUCCESS");
    if (!success) {
      throw new PayoutRequestError("Cannot approve payout without a successful customer payment.", 409);
    }
  }

  if (input.action !== "APPROVE" && (!input.reason || input.reason.trim().length < 8)) {
    throw new PayoutRequestError("Please provide a reason (at least 8 characters).", 400);
  }

  const fromStatuses =
    input.action === "HOLD"
      ? (["REQUESTED", "UNDER_REVIEW", "APPROVED"] as const)
      : input.action === "REJECT"
        ? (["REQUESTED", "UNDER_REVIEW", "APPROVED", "ON_HOLD"] as const)
        : (["REQUESTED", "UNDER_REVIEW", "ON_HOLD"] as const);

  const nextStatus =
    input.action === "APPROVE" ? "APPROVED" : input.action === "REJECT" ? "REJECTED" : "ON_HOLD";

  const now = new Date();
  const data: Prisma.PayoutUpdateManyMutationInput =
    input.action === "APPROVE"
      ? {
          status: nextStatus,
          reviewedAt: now,
          reviewedById: input.adminId,
          approvedAt: now,
          approvedById: input.adminId,
          holdReason: null,
        }
      : input.action === "REJECT"
        ? {
            status: nextStatus,
            reviewedAt: now,
            reviewedById: input.adminId,
            rejectedAt: now,
            rejectedById: input.adminId,
            rejectionReason: input.reason!.trim(),
          }
        : {
            status: nextStatus,
            reviewedAt: now,
            reviewedById: input.adminId,
            holdReason: input.reason!.trim(),
          };

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.payout.updateMany({
      where: { id: payout.id, status: { in: [...fromStatuses] } },
      data,
    });
    if (result.count !== 1) {
      throw new PayoutRequestError("This payout can no longer be reviewed in its current state.", 409);
    }
    await writeAuditLog(
      {
        actorId: input.adminId,
        action:
          input.action === "APPROVE"
            ? "PAYOUT_APPROVED"
            : input.action === "REJECT"
              ? "PAYOUT_REJECTED"
              : "PAYOUT_ON_HOLD",
        entityType: "Payout",
        entityId: payout.id,
        metadata: {
          bookingId: payout.bookingId,
          amount: payout.amount,
          reason: input.reason?.trim() ?? null,
          fromStatus: payout.status,
          toStatus: nextStatus,
        },
      },
      tx
    );
    return tx.payout.findUniqueOrThrow({ where: { id: payout.id } });
  });

  const amountLabel = formatCurrency(payout.amount);
  if (input.action === "APPROVE") {
    await notifyUser({
      userId: payout.vendor.userId,
      title: "Payout approved",
      body: `Evendor approved ${amountLabel}. Payment will be made from Evendor's business account and recorded here when sent.`,
      link: "/vendor/payouts",
    });
  } else if (input.action === "REJECT") {
    await notifyUser({
      userId: payout.vendor.userId,
      title: "Payout rejected",
      body: `Your payout request for ${amountLabel} was not approved. ${input.reason!.trim()}`,
      link: "/vendor/payouts",
    });
  } else {
    await notifyUser({
      userId: payout.vendor.userId,
      title: "Payout on hold",
      body: `Your payout request for ${amountLabel} is on hold. ${input.reason!.trim()}`,
      link: "/vendor/payouts",
    });
  }

  await emitDomainEvent({
    type: "PayoutReviewed",
    payload: {
      payoutId: payout.id,
      bookingId: payout.bookingId,
      vendorId: payout.vendorId,
      action: input.action,
      amount: payout.amount,
    },
  });

  return updated;
}

export async function recordManualPayout(input: {
  adminId: string;
  payoutId: string;
  transferReference: string;
  paidAmount?: number;
  paymentMethod?: string;
  paidAt?: Date;
  notes?: string;
  destinationBank?: string;
  destinationAccountName?: string;
  destinationAccountLast4?: string;
  adjustmentReason?: string;
}) {
  const reference = input.transferReference.trim();
  if (reference.length < 4) {
    throw new PayoutRequestError("Enter the bank transfer / payment reference.", 400);
  }

  const payout = await prisma.payout.findUnique({
    where: { id: input.payoutId },
    include: {
      vendor: { select: { id: true, businessName: true, userId: true, metadata: true } },
      booking: { select: { id: true, status: true } },
    },
  });
  if (!payout) throw new PayoutRequestError("Payout request not found.", 404);
  if (payout.status === "PAID") {
    throw new PayoutRequestError("This payout is already marked paid.", 409);
  }
  if (payout.status !== "APPROVED") {
    throw new PayoutRequestError("Record payment only after the payout is approved.", 409);
  }

  const paidAmount = input.paidAmount ?? payout.amount;
  if (!Number.isInteger(paidAmount) || paidAmount <= 0) {
    throw new PayoutRequestError("Paid amount must be a whole naira amount greater than zero.", 400);
  }
  if (paidAmount !== payout.amount) {
    if (!input.adjustmentReason || input.adjustmentReason.trim().length < 8) {
      throw new PayoutRequestError(
        "If the paid amount differs from the vendor payable amount, provide a reason.",
        400
      );
    }
  }

  const bank = readVendorBankAccount(payout.vendor.metadata);
  const now = input.paidAt ?? new Date();
  const method = (input.paymentMethod ?? "manual_business_payout").trim() || "manual_business_payout";

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.payout.updateMany({
      where: { id: payout.id, status: "APPROVED" },
      data: {
        status: "PAID",
        paidById: input.adminId,
        processedAt: now,
        paidAmount,
        adjustmentAmount: paidAmount - payout.amount,
        adjustmentReason: paidAmount === payout.amount ? null : input.adjustmentReason!.trim(),
        transferReference: reference,
        paymentMethod: method,
        destinationBank: input.destinationBank?.trim() || bank?.bankName || payout.destinationBank,
        destinationAccountName:
          input.destinationAccountName?.trim() || bank?.accountName || payout.destinationAccountName,
        destinationAccountLast4:
          input.destinationAccountLast4?.trim() ||
          (bank ? last4(bank.accountNumber) : payout.destinationAccountLast4),
        notes: input.notes?.trim() || payout.notes,
      },
    });
    if (result.count !== 1) {
      throw new PayoutRequestError("This payout can no longer be marked paid.", 409);
    }
    await writeAuditLog(
      {
        actorId: input.adminId,
        action: "PAYOUT_PAID",
        entityType: "Payout",
        entityId: payout.id,
        metadata: {
          bookingId: payout.bookingId,
          amount: payout.amount,
          paidAmount,
          transferReference: reference,
          paymentMethod: method,
        },
      },
      tx
    );
    return tx.payout.findUniqueOrThrow({ where: { id: payout.id } });
  });

  await notifyUser({
    userId: payout.vendor.userId,
    title: "Payout paid",
    body: `Evendor recorded payment of ${formatCurrency(paidAmount)} for your completed booking.`,
    link: "/vendor/payouts",
  });
  await emitDomainEvent({
    type: "PayoutPaid",
    payload: {
      payoutId: payout.id,
      bookingId: payout.bookingId,
      vendorId: payout.vendorId,
      paidAmount,
    },
  });

  return updated;
}

export async function getAdminPayoutReview(payoutId: string) {
  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
    include: {
      vendor: {
        select: {
          id: true,
          businessName: true,
          userId: true,
          vendorCategory: true,
          metadata: true,
        },
      },
      booking: {
        include: {
          listing: { select: { id: true, title: true, type: true } },
          customer: { select: { id: true, fullName: true } },
          payments: true,
          dispute: true,
        },
      },
    },
  });
  if (!payout) return null;

  const bank = readVendorBankAccount(payout.vendor.metadata);
  const customerPaid = payout.booking.payments
    .filter((p) => p.status === "SUCCESS")
    .reduce((sum, p) => sum + p.amount, 0);
  const commissionAmount = Math.max(0, payout.booking.totalAmount - vendorShareAmount(payout.booking.totalAmount));
  const previousAttempts = await prisma.auditLog.findMany({
    where: { entityType: "Payout", entityId: payout.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { action: true, actorId: true, createdAt: true, metadata: true },
  });

  const autoReleased =
    !!payout.booking.completionConfirmedAt && !payout.booking.completionConfirmedBy;
  const customerApproved = !!payout.booking.completionConfirmedBy;

  return {
    id: payout.id,
    reference: payout.reference,
    status: payout.status,
    vendorPayableAmount: payout.amount,
    paidAmount: payout.paidAmount,
    adjustmentAmount: payout.adjustmentAmount,
    adjustmentReason: payout.adjustmentReason,
    commissionPercent: PLATFORM_COMMISSION_PERCENT,
    commissionAmount,
    customerPaid,
    bookingTotal: payout.booking.totalAmount,
    transferReference: payout.transferReference,
    paymentMethod: payout.paymentMethod,
    notes: payout.notes,
    holdReason: payout.holdReason,
    rejectionReason: payout.rejectionReason,
    requestedAt: payout.requestedAt?.toISOString() ?? null,
    approvedAt: payout.approvedAt?.toISOString() ?? null,
    approvedById: payout.approvedById,
    paidAt: payout.processedAt?.toISOString() ?? null,
    paidById: payout.paidById,
    createdAt: payout.createdAt.toISOString(),
    vendor: {
      id: payout.vendor.id,
      businessName: payout.vendor.businessName,
      category: payout.vendor.vendorCategory,
    },
    booking: {
      id: payout.booking.id,
      status: payout.booking.status,
      eventDate: payout.booking.eventDate.toISOString(),
      createdAt: payout.booking.createdAt.toISOString(),
      vendorCompletedAt: payout.booking.vendorCompletedAt?.toISOString() ?? null,
      completionConfirmedAt: payout.booking.completionConfirmedAt?.toISOString() ?? null,
      customerApproved,
      autoReleased,
      listingTitle: payout.booking.listing.title,
      listingType: payout.booking.listing.type,
      customerName: payout.booking.customer?.fullName ?? "Customer",
    },
    payments: payout.booking.payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      escrowStatus: p.escrowStatus,
      paystackRef: p.paystackRef,
      createdAt: p.createdAt.toISOString(),
    })),
    dispute: payout.booking.dispute
      ? {
          id: payout.booking.dispute.id,
          status: payout.booking.dispute.status,
          reason: payout.booking.dispute.reason,
        }
      : null,
    destination: {
      bankName: payout.destinationBank ?? bank?.bankName ?? null,
      accountName: payout.destinationAccountName ?? bank?.accountName ?? null,
      accountNumber: bank?.accountNumber ?? null,
      accountNumberLast4:
        payout.destinationAccountLast4 ?? (bank ? last4(bank.accountNumber) : null),
    },
    previousAttempts,
  };
}

import type { PayoutStatus } from "@prisma/client";
import { prisma } from "@/core/infrastructure/prisma";
import { writeAuditLog } from "@/core/audit-engine";
import { notifyUser } from "@/core/notification-engine";
import { confirmSuccessfulCharge } from "./confirm-payment";

export type PaystackWebhookEvent = {
  event: string;
  data: {
    reference?: string;
    status?: string;
    metadata?: { bookingId?: string; paymentId?: string };
    transaction?: { reference?: string };
    transfer_code?: string;
    amount?: number;
    currency?: string;
  };
};

type HandlerResult = {
  processed?: boolean;
  idempotent?: boolean;
  received?: boolean;
  rejected?: string;
};

export async function handlePaystackWebhookEvent(
  event: PaystackWebhookEvent
): Promise<HandlerResult> {
  switch (event.event) {
    case "charge.success":
      return handleChargeSuccess(event);
    case "charge.failed":
      return handleChargeFailed(event);
    case "refund.processed":
      return handleRefundProcessed(event);
    case "transfer.success":
      return handleTransferEvent(event, "PAID");
    case "transfer.failed":
      return handleTransferEvent(event, "FAILED");
    case "transfer.reversed":
      return handleTransferEvent(event, "REVERSED");
    default:
      return { received: true };
  }
}

async function handleChargeSuccess(event: PaystackWebhookEvent): Promise<HandlerResult> {
  const reference = event.data.reference;
  if (!reference) return { received: true };

  const result = await confirmSuccessfulCharge({
    reference,
    paidKobo: event.data.amount ?? 0,
    currency: event.data.currency,
    source: "webhook",
    metadata: event.data as object,
  });

  // Unknown reference is not an error — Paystack may retry events we don't own.
  if (result.rejected === "payment_not_found") return { received: true };
  return result;
}

async function handleChargeFailed(event: PaystackWebhookEvent): Promise<HandlerResult> {
  const reference = event.data.reference;
  if (!reference) return { received: true };

  const payment = await prisma.payment.findUnique({ where: { paystackRef: reference } });
  if (!payment) return { received: true };
  if (payment.status === "FAILED") return { idempotent: true };
  // A later failure notice must not undo a settled charge.
  if (payment.status === "SUCCESS") return { idempotent: true };

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "FAILED", metadata: event.data as object },
  });

  await writeAuditLog({
    action: "PAYMENT_FAILED",
    entityType: "Payment",
    entityId: payment.id,
    metadata: { reference, source: "webhook" },
  });

  return { processed: true };
}

async function handleRefundProcessed(event: PaystackWebhookEvent): Promise<HandlerResult> {
  const reference = event.data.transaction?.reference ?? event.data.reference;
  if (!reference) return { received: true };

  const payment = await prisma.payment.findFirst({ where: { paystackRef: reference } });
  if (!payment) return { received: true };

  if (payment.escrowStatus === "REFUNDED") return { idempotent: true };

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      escrowStatus: "REFUNDED",
      metadata: {
        ...(typeof payment.metadata === "object" && payment.metadata
          ? (payment.metadata as object)
          : {}),
        refundWebhook: event.data,
      },
    },
  });

  await writeAuditLog({
    action: "PAYMENT_REFUNDED",
    entityType: "Payment",
    entityId: payment.id,
    metadata: { reference, source: "webhook" },
  });

  return { processed: true };
}

/**
 * Settles a vendor withdrawal from Paystack's transfer notification. This is the
 * authoritative signal; the reconciliation cron only exists as a safety net for
 * webhooks that never arrive.
 */
async function handleTransferEvent(
  event: PaystackWebhookEvent,
  status: PayoutStatus
): Promise<HandlerResult> {
  const reference = event.data.reference;

  await writeAuditLog({
    action: `PAYSTACK_${event.event.replace(".", "_").toUpperCase()}`,
    entityType: "Withdrawal",
    entityId: reference ?? null,
    metadata: event.data as object,
  });

  if (!reference) return { received: true };

  const withdrawal = await prisma.withdrawal.findUnique({
    where: { reference },
    include: { vendor: { select: { userId: true } } },
  });
  if (!withdrawal) return { received: true };
  if (withdrawal.status === status) return { idempotent: true };

  await prisma.withdrawal.update({
    where: { id: withdrawal.id },
    data: {
      status,
      paystackTransferCode: event.data.transfer_code ?? withdrawal.paystackTransferCode,
      processedAt: status === "PAID" ? new Date() : withdrawal.processedAt,
      failureReason:
        status === "PAID" ? null : `Paystack reported transfer ${event.event.split(".")[1]}`,
    },
  });

  const paid = status === "PAID";
  await notifyUser({
    userId: withdrawal.vendor.userId,
    title: paid ? "Withdrawal sent" : "Withdrawal failed",
    body: paid
      ? `₦${withdrawal.amount.toLocaleString()} has been sent to your bank account.`
      : `Your ₦${withdrawal.amount.toLocaleString()} withdrawal did not go through. The amount is back in your available balance.`,
    link: "/vendor/payouts",
  }).catch(() => {
    /* notification is best-effort */
  });

  return { processed: true };
}

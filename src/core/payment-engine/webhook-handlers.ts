import { prisma } from "@/core/infrastructure/prisma";
import { writeAuditLog } from "@/core/audit-engine";
import { emitDomainEvent } from "@/core/events";

type PaystackWebhookEvent = {
  event: string;
  data: {
    reference?: string;
    status?: string;
    metadata?: { bookingId?: string; paymentId?: string };
    transaction?: { reference?: string };
    amount?: number;
  };
};

export async function handlePaystackWebhookEvent(event: PaystackWebhookEvent): Promise<{
  processed?: boolean;
  idempotent?: boolean;
  received?: boolean;
}> {
  switch (event.event) {
    case "charge.success":
      return handleChargeSuccess(event);
    case "charge.failed":
      return handleChargeFailed(event);
    case "refund.processed":
      return handleRefundProcessed(event);
    case "transfer.success":
    case "transfer.failed":
    case "transfer.reversed":
      await writeAuditLog({
        action: `PAYSTACK_${event.event.replace(".", "_").toUpperCase()}`,
        entityType: "Payment",
        entityId: event.data.reference ?? null,
        metadata: event.data as object,
      });
      return { received: true };
    default:
      return { received: true };
  }
}

async function handleChargeSuccess(event: PaystackWebhookEvent) {
  const reference = event.data.reference;
  if (!reference) return { received: true };

  const payment = await prisma.payment.findUnique({
    where: { paystackRef: reference },
    include: { booking: true },
  });

  if (!payment) return { received: true };
  if (payment.status === "SUCCESS") return { idempotent: true };

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCESS",
        escrowStatus: payment.escrowStatus === "NONE" ? "HELD" : payment.escrowStatus,
        metadata: event.data as object,
      },
    });
    await tx.booking.update({
      where: { id: payment.bookingId },
      data: { status: "CONFIRMED" },
    });
    await writeAuditLog(
      {
        action: "PAYMENT_SUCCESS",
        entityType: "Payment",
        entityId: payment.id,
        metadata: { reference, source: "webhook" },
      },
      tx
    );
  });

  await emitDomainEvent({
    type: "PaymentReceived",
    payload: {
      paymentId: payment.id,
      bookingId: payment.bookingId,
      customerId: payment.booking.customerId,
      amount: payment.amount,
    },
  });
  await emitDomainEvent({
    type: "BookingConfirmed",
    payload: {
      bookingId: payment.bookingId,
      vendorId: payment.booking.vendorId,
    },
  });

  return { processed: true };
}

async function handleChargeFailed(event: PaystackWebhookEvent) {
  const reference = event.data.reference;
  if (!reference) return { received: true };

  const payment = await prisma.payment.findUnique({ where: { paystackRef: reference } });
  if (!payment || payment.status === "FAILED") {
    return payment?.status === "FAILED" ? { idempotent: true } : { received: true };
  }

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

async function handleRefundProcessed(event: PaystackWebhookEvent) {
  const reference =
    event.data.transaction?.reference ?? event.data.reference;
  if (!reference) return { received: true };

  const payment = await prisma.payment.findFirst({
    where: { paystackRef: reference },
  });
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

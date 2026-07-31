/**
 * Withdrawal engine — moves released escrow from a vendor's Evendor balance to their bank.
 *
 * Safety model:
 *  - Balance is always recomputed server-side inside a Serializable transaction; the client
 *    never supplies a balance and two concurrent requests cannot both pass the check.
 *  - The Withdrawal row is created *before* Paystack is called, so a crash mid-transfer
 *    leaves an auditable record instead of silent money movement.
 *  - `reference` is ours and unique, and Paystack rejects duplicate references. Retrying a
 *    request therefore cannot pay twice; an ambiguous failure is resolved by asking
 *    Paystack what happened to that reference rather than guessing.
 */
import { Prisma, type PayoutStatus } from "@prisma/client";
import crypto from "crypto";
import { prisma } from "@/core/infrastructure/prisma";
import { writeAuditLog } from "@/core/audit-engine";
import { emitDomainEvent } from "@/core/events";
import { notifyUser } from "@/core/notification-engine";
import { computeVendorBalance } from "@/core/wallet-engine/ledger";
import { MAX_WITHDRAWAL_AMOUNT, MIN_WITHDRAWAL_AMOUNT } from "@/core/shared/config";
import {
  PaystackError,
  createTransferRecipient,
  fetchTransferByReference,
  initiateTransfer,
  isPaystackConfigured,
} from "./paystack";

export { MIN_WITHDRAWAL_AMOUNT, MAX_WITHDRAWAL_AMOUNT };

export class WithdrawalError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "WithdrawalError";
    this.status = status;
  }
}

export type VendorBankAccount = {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  verified?: boolean;
};

type VendorMetadata = Record<string, unknown> & {
  bankAccount?: Partial<VendorBankAccount>;
  paystackRecipient?: { code?: string; accountNumber?: string; bankCode?: string };
};

function readMetadata(metadata: unknown): VendorMetadata {
  return metadata && typeof metadata === "object" ? (metadata as VendorMetadata) : {};
}

export function readVendorBankAccount(metadata: unknown): VendorBankAccount | null {
  const bank = readMetadata(metadata).bankAccount;
  if (!bank?.bankCode || !bank.accountNumber || !bank.accountName) return null;
  return {
    bankCode: String(bank.bankCode),
    bankName: String(bank.bankName ?? "Bank"),
    accountNumber: String(bank.accountNumber),
    accountName: String(bank.accountName),
    verified: bank.verified !== false,
  };
}

function withdrawalReference(): string {
  return `wd_${crypto.randomBytes(12).toString("hex")}`;
}

/** Only the last 4 digits are ever surfaced to clients or logs. */
function last4(accountNumber: string): string {
  return accountNumber.slice(-4);
}

/**
 * Returns a Paystack recipient code for the vendor's current bank account, creating one
 * on first use. Cached on the vendor so a changed account invalidates the old code.
 */
async function ensureTransferRecipient(
  vendorId: string,
  bank: VendorBankAccount
): Promise<string> {
  const vendor = await prisma.vendorProfile.findUnique({
    where: { id: vendorId },
    select: { metadata: true },
  });
  const metadata = readMetadata(vendor?.metadata);
  const cached = metadata.paystackRecipient;

  if (
    cached?.code &&
    cached.accountNumber === bank.accountNumber &&
    cached.bankCode === bank.bankCode
  ) {
    return cached.code;
  }

  const recipient = await createTransferRecipient({
    name: bank.accountName,
    accountNumber: bank.accountNumber,
    bankCode: bank.bankCode,
  });

  await prisma.vendorProfile.update({
    where: { id: vendorId },
    data: {
      metadata: {
        ...metadata,
        paystackRecipient: {
          code: recipient.recipient_code,
          accountNumber: bank.accountNumber,
          bankCode: bank.bankCode,
        },
      } as Prisma.InputJsonValue,
    },
  });

  return recipient.recipient_code;
}

function mapTransferStatus(status: string): PayoutStatus {
  switch (status) {
    case "success":
      return "PAID";
    case "failed":
    case "abandoned":
      return "FAILED";
    case "reversed":
      return "REVERSED";
    default:
      return "PROCESSING";
  }
}

/**
 * Records a withdrawal intent after validating it against the live ledger.
 * Does not touch Paystack — call `processWithdrawal` next.
 */
export async function requestWithdrawal(params: {
  vendorId: string;
  amount: number;
  requestedById: string;
}) {
  const { vendorId, amount, requestedById } = params;

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new WithdrawalError("Enter a whole naira amount.");
  }
  if (amount < MIN_WITHDRAWAL_AMOUNT) {
    throw new WithdrawalError(`Minimum withdrawal is ₦${MIN_WITHDRAWAL_AMOUNT.toLocaleString()}.`);
  }
  if (amount > MAX_WITHDRAWAL_AMOUNT) {
    throw new WithdrawalError(
      `Single withdrawals are capped at ₦${MAX_WITHDRAWAL_AMOUNT.toLocaleString()}. Please split the request.`
    );
  }

  const vendor = await prisma.vendorProfile.findUnique({
    where: { id: vendorId },
    select: { id: true, userId: true, businessName: true, metadata: true },
  });
  if (!vendor) throw new WithdrawalError("Vendor not found", 404);

  const bank = readVendorBankAccount(vendor.metadata);
  if (!bank || bank.verified === false) {
    throw new WithdrawalError(
      "Add and verify your payout bank account before withdrawing.",
      422
    );
  }

  const withdrawal = await prisma.$transaction(
    async (tx) => {
      const inFlight = await tx.withdrawal.count({
        where: { vendorId, status: { in: ["PENDING", "PROCESSING"] } },
      });
      if (inFlight > 0) {
        throw new WithdrawalError(
          "You already have a withdrawal in progress. Wait for it to settle before starting another.",
          409
        );
      }

      const balance = await computeVendorBalance(vendorId, tx);
      if (amount > balance.availableBalance) {
        throw new WithdrawalError(
          `Insufficient available balance. You can withdraw up to ₦${balance.availableBalance.toLocaleString()}.`
        );
      }

      return tx.withdrawal.create({
        data: {
          vendorId,
          amount,
          status: "PENDING",
          reference: withdrawalReference(),
          bankName: bank.bankName,
          accountNumberLast4: last4(bank.accountNumber),
          requestedById,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );

  await writeAuditLog({
    actorId: requestedById,
    action: "WITHDRAWAL_REQUESTED",
    entityType: "Withdrawal",
    entityId: withdrawal.id,
    metadata: { vendorId, amount, reference: withdrawal.reference },
  });

  await emitDomainEvent({
    type: "WithdrawalRequested",
    payload: { userId: vendor.userId, amount, withdrawalId: withdrawal.id },
  });

  return { withdrawal, vendor, bank };
}

async function finalizeWithdrawal(params: {
  withdrawalId: string;
  status: PayoutStatus;
  transferCode?: string | null;
  recipientCode?: string | null;
  failureReason?: string | null;
  vendorUserId?: string | null;
  amount: number;
}) {
  const { withdrawalId, status, transferCode, recipientCode, failureReason, amount } = params;

  const updated = await prisma.withdrawal.update({
    where: { id: withdrawalId },
    data: {
      status,
      paystackTransferCode: transferCode ?? undefined,
      recipientCode: recipientCode ?? undefined,
      failureReason: failureReason ?? null,
      processedAt: status === "PAID" ? new Date() : undefined,
    },
  });

  await writeAuditLog({
    action:
      status === "PAID"
        ? "WITHDRAWAL_PAID"
        : status === "FAILED" || status === "REVERSED"
          ? "WITHDRAWAL_FAILED"
          : "WITHDRAWAL_PROCESSING",
    entityType: "Withdrawal",
    entityId: withdrawalId,
    metadata: {
      status,
      amount,
      reference: updated.reference,
      transferCode: transferCode ?? null,
      failureReason: failureReason ?? null,
    },
  });

  if (params.vendorUserId && status !== "PROCESSING") {
    const paid = status === "PAID";
    await notifyUser({
      userId: params.vendorUserId,
      title: paid ? "Withdrawal sent" : "Withdrawal failed",
      body: paid
        ? `₦${amount.toLocaleString()} is on its way to your bank account.`
        : `We could not complete your ₦${amount.toLocaleString()} withdrawal. The amount is back in your available balance.${failureReason ? ` Reason: ${failureReason}` : ""}`,
      link: "/vendor/payouts",
    }).catch(() => {
      /* notification is best-effort */
    });
  }

  return updated;
}

/**
 * Executes a PENDING (or previously FAILED) withdrawal against Paystack.
 * Safe to call repeatedly: the status guard admits only one runner at a time.
 */
export async function processWithdrawal(withdrawalId: string) {
  const withdrawal = await prisma.withdrawal.findUnique({
    where: { id: withdrawalId },
    include: {
      vendor: { select: { id: true, userId: true, businessName: true, metadata: true } },
    },
  });
  if (!withdrawal) throw new WithdrawalError("Withdrawal not found", 404);
  if (withdrawal.status === "PAID") return withdrawal;
  if (withdrawal.status === "PROCESSING") {
    throw new WithdrawalError("Withdrawal is already being processed.", 409);
  }

  const vendorUserId = withdrawal.vendor.userId;

  if (!isPaystackConfigured()) {
    return finalizeWithdrawal({
      withdrawalId,
      status: "FAILED",
      failureReason: "Paystack is not configured on this environment.",
      vendorUserId,
      amount: withdrawal.amount,
    });
  }

  const bank = readVendorBankAccount(withdrawal.vendor.metadata);
  if (!bank || bank.verified === false) {
    return finalizeWithdrawal({
      withdrawalId,
      status: "FAILED",
      failureReason: "No verified payout bank account on file.",
      vendorUserId,
      amount: withdrawal.amount,
    });
  }

  // Claim the row so a retry or cron run cannot initiate a second transfer.
  const claimed = await prisma.withdrawal.updateMany({
    where: { id: withdrawalId, status: { in: ["PENDING", "FAILED"] } },
    data: { status: "PROCESSING", attempts: { increment: 1 }, failureReason: null },
  });
  if (claimed.count === 0) {
    throw new WithdrawalError("Withdrawal is already being processed.", 409);
  }

  let recipientCode: string | null = null;
  try {
    recipientCode = await ensureTransferRecipient(withdrawal.vendorId, bank);
  } catch (err) {
    const reason =
      err instanceof PaystackError ? err.message : "Could not register payout recipient.";
    return finalizeWithdrawal({
      withdrawalId,
      status: "FAILED",
      failureReason: reason,
      vendorUserId,
      amount: withdrawal.amount,
    });
  }

  try {
    const transfer = await initiateTransfer({
      amount: withdrawal.amount * 100,
      recipient: recipientCode,
      reference: withdrawal.reference,
      reason: `Evendor payout — ${withdrawal.vendor.businessName}`,
    });

    return finalizeWithdrawal({
      withdrawalId,
      status: mapTransferStatus(transfer.status),
      transferCode: transfer.transfer_code,
      recipientCode,
      // Paystack parks transfers at "otp" until an operator approves them; automated
      // payouts require Transfers OTP to be switched off in the Paystack dashboard.
      failureReason:
        transfer.status === "otp"
          ? "Awaiting OTP approval. Disable Transfers OTP in the Paystack dashboard for automated payouts."
          : null,
      vendorUserId,
      amount: withdrawal.amount,
    });
  } catch (err) {
    const paystackError = err instanceof PaystackError ? err : null;

    // The request may have reached Paystack before failing. Ask what happened to our
    // reference rather than assuming — assuming either double-pays or loses money.
    if (paystackError?.retryable) {
      try {
        const transfer = await fetchTransferByReference(withdrawal.reference);
        return finalizeWithdrawal({
          withdrawalId,
          status: mapTransferStatus(transfer.status),
          transferCode: transfer.transfer_code,
          recipientCode,
          vendorUserId,
          amount: withdrawal.amount,
        });
      } catch {
        /* reference unknown to Paystack — the transfer never started */
      }
    }

    return finalizeWithdrawal({
      withdrawalId,
      status: "FAILED",
      recipientCode,
      failureReason: paystackError?.message ?? "Transfer failed.",
      vendorUserId,
      amount: withdrawal.amount,
    });
  }
}

/** Convenience wrapper used by the vendor endpoint: record then execute. */
export async function createAndProcessWithdrawal(params: {
  vendorId: string;
  amount: number;
  requestedById: string;
}) {
  const { withdrawal } = await requestWithdrawal(params);
  const processed = await processWithdrawal(withdrawal.id);
  return processed;
}

/**
 * Cron entry: start Paystack transfers for stuck PENDING rows, then reconcile
 * PROCESSING transfers that Paystack queued asynchronously.
 */
export async function syncPendingWithdrawals(options?: { graceMs?: number }) {
  if (!isPaystackConfigured()) return { checked: 0, settled: 0, failed: 0, started: 0 };

  const graceMs = options?.graceMs ?? 2 * 60 * 1000;
  const cutoff = new Date(Date.now() - graceMs);

  // Kick off transfers that never reached Paystack (e.g. `after()` dropped on Hobby).
  const unstarted = await prisma.withdrawal.findMany({
    where: { status: "PENDING", createdAt: { lte: cutoff } },
    select: { id: true },
    take: 20,
    orderBy: { createdAt: "asc" },
  });

  let started = 0;
  for (const row of unstarted) {
    try {
      await processWithdrawal(row.id);
      started++;
    } catch (error) {
      console.error(`[payouts] cron processWithdrawal ${row.id} failed:`, error);
    }
  }

  const pending = await prisma.withdrawal.findMany({
    where: {
      status: "PROCESSING",
      updatedAt: { lte: cutoff },
    },
    include: { vendor: { select: { userId: true } } },
    take: 50,
    orderBy: { createdAt: "asc" },
  });

  let settled = 0;
  let failed = 0;

  for (const withdrawal of pending) {
    try {
      const transfer = await fetchTransferByReference(withdrawal.reference);
      const status = mapTransferStatus(transfer.status);
      if (status === "PROCESSING") continue;

      await finalizeWithdrawal({
        withdrawalId: withdrawal.id,
        status,
        transferCode: transfer.transfer_code,
        failureReason:
          status === "PAID" ? null : `Paystack reported transfer ${transfer.status}`,
        vendorUserId: withdrawal.vendor.userId,
        amount: withdrawal.amount,
      });

      if (status === "PAID") settled++;
      else failed++;
    } catch {
      /* leave PROCESSING; a later run retries */
    }
  }

  return {
    checked: pending.length + unstarted.length,
    settled,
    failed,
    started,
  };
}

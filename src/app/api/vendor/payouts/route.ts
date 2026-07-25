import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { jsonNoStore, jsonError, handleApiRoute } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { getVendorWalletStats } from "@/lib/vendor-wallet";
import { payoutLimiter, checkRateLimit } from "@/lib/rate-limit";
import {
  MAX_WITHDRAWAL_AMOUNT,
  MIN_WITHDRAWAL_AMOUNT,
  WithdrawalError,
  createAndProcessWithdrawal,
  readVendorBankAccount,
} from "@/core/payment-engine/payout-service";
import { isPaystackConfigured } from "@/core/payment-engine/paystack";

export async function GET() {
  return handleApiRoute(async () => {
    const user = await requireAuth();
    if (!user) return jsonError("Unauthorized", 401);

    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, metadata: true },
    });
    if (!vendor) return jsonError("Vendor not found", 404);

    const wallet = await getVendorWalletStats(vendor.id);
    const bank = readVendorBankAccount(vendor.metadata);

    return jsonNoStore({
      ...wallet,
      payoutsEnabled: isPaystackConfigured() && !!bank && bank.verified !== false,
      bankAccount: bank
        ? {
            bankName: bank.bankName,
            accountName: bank.accountName,
            accountNumberLast4: bank.accountNumber.slice(-4),
          }
        : null,
    });
  }, { route: "GET /api/vendor/payouts" });
}

const withdrawSchema = z.object({
  amount: z
    .number()
    .int("Enter a whole naira amount")
    .min(MIN_WITHDRAWAL_AMOUNT, `Minimum withdrawal is ₦${MIN_WITHDRAWAL_AMOUNT.toLocaleString()}`)
    .max(
      MAX_WITHDRAWAL_AMOUNT,
      `Single withdrawals are capped at ₦${MAX_WITHDRAWAL_AMOUNT.toLocaleString()}`
    ),
});

export async function POST(req: NextRequest) {
  return handleApiRoute(async () => {
    const user = await requireAuth();
    if (!user) return jsonError("Unauthorized", 401);

    const rate = await checkRateLimit(payoutLimiter, `withdraw:${user.id}`);
    if (!rate.success) {
      return jsonError("Too many withdrawal attempts. Try again later.", 429);
    }

    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!vendor) return jsonError("Vendor not found", 404);

    const parsed = withdrawSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return jsonError(
        parsed.error.issues[0]?.message ?? "Invalid withdrawal amount",
        400
      );
    }

    try {
      const withdrawal = await createAndProcessWithdrawal({
        vendorId: vendor.id,
        amount: parsed.data.amount,
        requestedById: user.id,
      });

      if (withdrawal.status === "FAILED" || withdrawal.status === "REVERSED") {
        return jsonError(
          withdrawal.failureReason ??
            "We could not complete the transfer. Your balance is unchanged.",
          502
        );
      }

      return jsonNoStore({
        id: withdrawal.id,
        reference: withdrawal.reference,
        amount: withdrawal.amount,
        status: withdrawal.status,
        message:
          withdrawal.status === "PAID"
            ? "Withdrawal sent to your bank account."
            : "Withdrawal is processing. Funds typically arrive within minutes.",
      });
    } catch (err) {
      if (err instanceof WithdrawalError) return jsonError(err.message, err.status);
      throw err;
    }
  }, { route: "POST /api/vendor/payouts" });
}

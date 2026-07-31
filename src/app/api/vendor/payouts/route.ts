import { after } from "next/server";
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
  processWithdrawal,
  requestWithdrawal,
  readVendorBankAccount,
} from "@/core/payment-engine/payout-service";
import { isPaystackConfigured } from "@/core/payment-engine/paystack";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Allow Paystack transfer work started via `after()` enough time on Pro; Hobby still returns fast. */
export const maxDuration = 60;

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

    if (!isPaystackConfigured()) {
      return jsonError(
        "Payouts are not configured yet. Add PAYSTACK_SECRET_KEY on the server.",
        503
      );
    }

    try {
      // Record first so the client always gets a JSON response. Awaiting Paystack for the
      // full transfer often blew the serverless deadline → browser "Failed to fetch".
      const { withdrawal } = await requestWithdrawal({
        vendorId: vendor.id,
        amount: parsed.data.amount,
        requestedById: user.id,
      });

      const processPromise = processWithdrawal(withdrawal.id).catch((error) => {
        console.error(`[payouts] processWithdrawal ${withdrawal.id} failed:`, error);
        return null;
      });

      const processed = await Promise.race([
        processPromise,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 8_000)),
      ]);

      if (!processed) {
        after(async () => {
          await processPromise;
        });
      }

      if (processed?.status === "FAILED" || processed?.status === "REVERSED") {
        return jsonError(
          processed.failureReason ??
            "We could not complete the transfer. Your balance is unchanged.",
          502
        );
      }

      return jsonNoStore({
        id: withdrawal.id,
        reference: withdrawal.reference,
        amount: withdrawal.amount,
        status: processed?.status ?? "PENDING",
        message:
          processed?.status === "PAID"
            ? "Withdrawal sent to your bank account."
            : "Withdrawal request received. Funds are being sent to your bank — refresh in a minute to check status.",
      });
    } catch (err) {
      if (err instanceof WithdrawalError) return jsonError(err.message, err.status);
      throw err;
    }
  }, { route: "POST /api/vendor/payouts" });
}

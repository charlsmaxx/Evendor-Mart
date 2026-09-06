import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { jsonNoStore, jsonError, handleApiRoute } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { getVendorWalletStats } from "@/lib/vendor-wallet";
import { payoutLimiter, authLimiter, checkRateLimit } from "@/lib/rate-limit";
import { readVendorBankAccount } from "@/core/payment-engine/payout-service";
import {
  PayoutRequestError,
  requestBookingPayout,
} from "@/core/payment-engine/manual-payout";
import {
  PayoutAuthError,
  getPayoutAuthStatus,
  verifyPayoutPassword,
  verifyWebauthnAssertion,
  webauthnRpFromRequest,
} from "@/core/payment-engine/payout-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const payoutAuth = getPayoutAuthStatus(vendor.metadata);

    return jsonNoStore({
      ...wallet,
      payoutsEnabled: !!bank && bank.verified !== false,
      payoutPasswordSet: payoutAuth.passwordSet,
      webauthnEnabled: payoutAuth.webauthnEnabled,
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

const requestSchema = z.object({
  bookingId: z.string().uuid("Select a completed booking to request payout."),
  payoutPassword: z.string().optional(),
  webauthn: z
    .object({
      credentialId: z.string().min(16).max(256),
      authenticatorData: z.string().min(16).max(8192),
      clientDataJSON: z.string().min(16).max(8192),
      signature: z.string().min(16).max(8192),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  return handleApiRoute(async () => {
    const user = await requireAuth();
    if (!user) return jsonError("Unauthorized", 401);

    const rate = await checkRateLimit(payoutLimiter, `withdraw:${user.id}`);
    if (!rate.success) {
      return jsonError("Too many payout requests. Try again later.", 429);
    }

    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, metadata: true },
    });
    if (!vendor) return jsonError("Vendor not found", 404);

    const body = await req.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      const askedAmount = body && typeof body === "object" && "amount" in body;
      return jsonError(
        askedAmount
          ? "Payout is requested per completed booking. The amount is calculated by Evendor, not entered on this page."
          : (parsed.error.issues[0]?.message ?? "Invalid payout request"),
        400
      );
    }

    const payoutAuth = getPayoutAuthStatus(vendor.metadata);
    if (!payoutAuth.passwordSet) {
      return jsonError(
        "Set a payout password before requesting payout.",
        403,
        "PAYOUT_PASSWORD_NOT_SET"
      );
    }

    const authRate = await checkRateLimit(authLimiter, `payout-auth:${user.id}`);
    if (!authRate.success) {
      return jsonError("Too many attempts. Try again later.", 429, "PAYOUT_AUTH_LOCKED");
    }

    try {
      if (parsed.data.webauthn) {
        const rp = webauthnRpFromRequest(req);
        await verifyWebauthnAssertion({
          vendorId: vendor.id,
          metadata: vendor.metadata,
          origin: rp.origin,
          rpId: rp.rpId,
          assertion: parsed.data.webauthn,
        });
      } else {
        await verifyPayoutPassword({
          vendorId: vendor.id,
          metadata: vendor.metadata,
          password: parsed.data.payoutPassword,
        });
      }
    } catch (err) {
      if (err instanceof PayoutAuthError) {
        return jsonError(err.message, err.status, err.code);
      }
      throw err;
    }

    try {
      const payout = await requestBookingPayout({
        vendorId: vendor.id,
        bookingId: parsed.data.bookingId,
        requestedById: user.id,
      });
      return jsonNoStore({
        id: payout.id,
        bookingId: payout.bookingId,
        amount: payout.amount,
        status: payout.status,
        message:
          "Payout request submitted. Evendor will review it before payment is made.",
      });
    } catch (err) {
      if (err instanceof PayoutRequestError) return jsonError(err.message, err.status);
      throw err;
    }
  }, { route: "POST /api/vendor/payouts" });
}

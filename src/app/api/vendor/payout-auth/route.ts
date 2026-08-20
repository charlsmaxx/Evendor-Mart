import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { jsonNoStore, jsonError, handleApiRoute } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { authLimiter, checkRateLimit } from "@/lib/rate-limit";
import { writeAuditLog } from "@/core/audit-engine";
import { verifyAccountPassword } from "@/core/identity-engine/verify-account-password";
import {
  PAYOUT_PASSWORD_MAX,
  PAYOUT_PASSWORD_MIN,
  PayoutAuthError,
  getPayoutAuthStatus,
  setPayoutPassword,
} from "@/core/payment-engine/payout-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const passwordSchema = z
  .string()
  .min(PAYOUT_PASSWORD_MIN, `Use at least ${PAYOUT_PASSWORD_MIN} characters`)
  .max(PAYOUT_PASSWORD_MAX, `Use at most ${PAYOUT_PASSWORD_MAX} characters`);

const setSchema = z.object({
  password: passwordSchema,
  confirmPassword: passwordSchema,
  currentPassword: z.string().optional(),
  accountPassword: z.string().optional(),
});

export async function GET() {
  return handleApiRoute(async () => {
    const user = await requireAuth();
    if (!user) return jsonError("Unauthorized", 401);

    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: user.id },
      select: { metadata: true },
    });
    if (!vendor) return jsonError("Vendor not found", 404);

    return jsonNoStore(getPayoutAuthStatus(vendor.metadata));
  }, { route: "GET /api/vendor/payout-auth" });
}

export async function POST(req: NextRequest) {
  return handleApiRoute(async () => {
    const user = await requireAuth();
    if (!user) return jsonError("Unauthorized", 401);

    const rate = await checkRateLimit(authLimiter, `payout-auth:${user.id}`);
    if (!rate.success) {
      return jsonError("Too many attempts. Try again later.", 429, "PAYOUT_AUTH_LOCKED");
    }

    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, metadata: true },
    });
    if (!vendor) return jsonError("Vendor not found", 404);

    const parsed = setSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return jsonError(
        parsed.error.issues[0]?.message ?? "Invalid withdrawal password",
        400,
        "PAYOUT_PASSWORD_INVALID"
      );
    }

    let accountVerified = false;
    if (parsed.data.accountPassword) {
      accountVerified = await verifyAccountPassword({
        userId: user.id,
        email: user.email,
        password: parsed.data.accountPassword,
      });
      if (!accountVerified) {
        return jsonError(
          "That Evendor login password is incorrect.",
          401,
          "ACCOUNT_PASSWORD_INVALID"
        );
      }
    }

    try {
      const result = await setPayoutPassword({
        vendorId: vendor.id,
        metadata: vendor.metadata,
        password: parsed.data.password,
        confirmPassword: parsed.data.confirmPassword,
        currentPassword: parsed.data.currentPassword,
        accountVerified,
      });

      await writeAuditLog({
        actorId: user.id,
        action: result.changed
          ? accountVerified
            ? "PAYOUT_PASSWORD_RECOVERED"
            : "PAYOUT_PASSWORD_CHANGED"
          : "PAYOUT_PASSWORD_SET",
        entityType: "VendorProfile",
        entityId: vendor.id,
        metadata: {},
      });

      return jsonNoStore({
        passwordSet: true,
        changed: result.changed,
        message: result.changed
          ? accountVerified
            ? "Withdrawal password reset. Use the new password to confirm payouts."
            : "Withdrawal password updated."
          : "Withdrawal password saved. Use it to confirm payouts.",
      });
    } catch (err) {
      if (err instanceof PayoutAuthError) {
        return jsonError(err.message, err.status, err.code);
      }
      throw err;
    }
  }, { route: "POST /api/vendor/payout-auth" });
}

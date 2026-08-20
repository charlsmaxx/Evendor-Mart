import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { jsonNoStore, jsonError, handleApiRoute } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { authLimiter, checkRateLimit } from "@/lib/rate-limit";
import { writeAuditLog } from "@/core/audit-engine";
import {
  PayoutAuthError,
  registerWebauthnCredential,
  storeWebauthnChallenge,
  verifyPayoutPassword,
  webauthnRpFromRequest,
} from "@/core/payment-engine/payout-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const beginSchema = z.object({
  action: z.enum(["register-begin", "assert-begin"]),
  password: z.string().optional(),
});

const finishSchema = z.object({
  action: z.literal("register-finish"),
  password: z.string().min(1),
  credentialId: z.string().min(16).max(256),
  publicKeyDer: z.string().min(16).max(4096),
  clientDataJSON: z.string().min(16).max(8192),
  authenticatorData: z.string().min(16).max(8192),
});

export async function POST(req: NextRequest) {
  return handleApiRoute(async () => {
    const user = await requireAuth();
    if (!user) return jsonError("Unauthorized", 401);

    const rate = await checkRateLimit(authLimiter, `payout-webauthn:${user.id}`);
    if (!rate.success) {
      return jsonError("Too many attempts. Try again later.", 429, "PAYOUT_AUTH_LOCKED");
    }

    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, userId: true, metadata: true, businessName: true },
    });
    if (!vendor) return jsonError("Vendor not found", 404);

    const body = await req.json().catch(() => null);
    const begin = beginSchema.safeParse(body);
    const finish = finishSchema.safeParse(body);
    if (!begin.success && !finish.success) {
      return jsonError("Invalid biometric request.", 400, "PAYOUT_WEBAUTHN_INVALID");
    }

    const rp = webauthnRpFromRequest(req);

    try {
      if (begin.success && begin.data.action === "register-begin") {
        await verifyPayoutPassword({
          vendorId: vendor.id,
          metadata: vendor.metadata,
          password: begin.data.password,
        });
        const challenge = await storeWebauthnChallenge({
          vendorId: vendor.id,
          metadata: vendor.metadata,
          purpose: "register",
        });
        return jsonNoStore({
          rp: { name: "Evendor", id: rp.rpId },
          user: {
            id: vendor.id,
            name: user.email,
            displayName: vendor.businessName || user.email,
          },
          challenge: challenge.challenge,
        });
      }

      if (begin.success && begin.data.action === "assert-begin") {
        const challenge = await storeWebauthnChallenge({
          vendorId: vendor.id,
          metadata: vendor.metadata,
          purpose: "assert",
        });
        return jsonNoStore({
          rpId: rp.rpId,
          challenge: challenge.challenge,
          credentialId: challenge.credentialId,
          credentialIds: challenge.credentialIds,
        });
      }

      if (finish.success) {
        await verifyPayoutPassword({
          vendorId: vendor.id,
          metadata: vendor.metadata,
          password: finish.data.password,
        });
        const fresh = await prisma.vendorProfile.findUnique({
          where: { id: vendor.id },
          select: { metadata: true },
        });
        await registerWebauthnCredential({
          vendorId: vendor.id,
          metadata: fresh?.metadata ?? vendor.metadata,
          origin: rp.origin,
          rpId: rp.rpId,
          credentialId: finish.data.credentialId,
          publicKeyDer: finish.data.publicKeyDer,
          clientDataJSON: finish.data.clientDataJSON,
          authenticatorData: finish.data.authenticatorData,
        });
        await writeAuditLog({
          actorId: user.id,
          action: "PAYOUT_WEBAUTHN_REGISTERED",
          entityType: "VendorProfile",
          entityId: vendor.id,
          metadata: {},
        });
        return jsonNoStore({
          webauthnEnabled: true,
          message: "Fingerprint or Face ID can now confirm withdrawals on this device.",
        });
      }

      return jsonError("Invalid biometric request.", 400, "PAYOUT_WEBAUTHN_INVALID");
    } catch (err) {
      if (err instanceof PayoutAuthError) {
        return jsonError(err.message, err.status, err.code);
      }
      throw err;
    }
  }, { route: "POST /api/vendor/payout-auth/webauthn" });
}

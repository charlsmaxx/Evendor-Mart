import { jsonOk, jsonError, handleApiRoute } from "@/lib/api-response";
import { requireVendorProfile } from "@/lib/vendor-api-auth";
import { activatePremiumSubscription } from "@/core/subscription-engine";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/core/audit-engine/service";

/** Called after Paystack redirect (?success=1) — activates pending subscription. Webhook can also call activatePremiumSubscription. */
export async function POST() {
  return handleApiRoute(async () => {
    const { error, user, vendor } = await requireVendorProfile();
    if (error) return error;

    const pending = await prisma.subscription.findFirst({
      where: { vendorId: vendor!.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });

    if (!pending && vendor!.subscriptionTier === "PREMIUM") {
      return jsonOk({ tier: "PREMIUM", alreadyActive: true });
    }

    if (!pending) {
      return jsonError("No pending subscription to confirm", 400);
    }

    await activatePremiumSubscription(vendor!.id, {
      paystackSubCode: pending.paystackSubCode ?? undefined,
      amount: pending.amount,
    });

    await writeAuditLog({
      actorId: user!.id,
      action: "SUBSCRIPTION_ACTIVATED",
      entityType: "VendorProfile",
      entityId: vendor!.id,
      metadata: { tier: "PREMIUM" },
    });

    return jsonOk({ tier: "PREMIUM", activated: true });
  });
}

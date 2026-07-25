import { NextRequest } from "next/server";
import { jsonOk, jsonError, handleApiRoute } from "@/lib/api-response";
import { requireVendorProfile } from "@/lib/vendor-api-auth";
import { requirePremium, PremiumRequiredError } from "@/core/subscription-engine";
import { loadVendorBusinessAnalytics } from "@/core/analytics-engine/vendor-business";

export async function GET() {
  return handleApiRoute(async () => {
    const { error, vendor } = await requireVendorProfile();
    if (error) return error;

    try {
      await requirePremium(vendor!.id, "advanced_analytics");
    } catch (err) {
      if (err instanceof PremiumRequiredError) {
        return jsonError("Premium subscription required", 402, err.feature);
      }
      throw err;
    }

    const data = await loadVendorBusinessAnalytics(vendor!.id);
    return jsonOk(data);
  });
}

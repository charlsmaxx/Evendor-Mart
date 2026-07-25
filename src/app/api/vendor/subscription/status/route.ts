import { jsonOk, handleApiRoute } from "@/lib/api-response";
import { requireVendorProfile } from "@/lib/vendor-api-auth";
import { getVendorSubscriptionSummary } from "@/core/subscription-engine";

export async function GET() {
  return handleApiRoute(async () => {
    const { error, vendor } = await requireVendorProfile();
    if (error) return error;

    const summary = await getVendorSubscriptionSummary(vendor!.id);
    return jsonOk(summary);
  });
}

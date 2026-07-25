import { jsonOk, jsonError, handleApiRoute } from "@/lib/api-response";
import { requireVendor } from "@/core/identity-engine";
import { loadVendorOverviewData } from "@/core/wallet-engine";

export async function GET() {
  return handleApiRoute(async () => {
    const auth = await requireVendor();
    if (!auth) return jsonError("Unauthorized", 401);

    const data = await loadVendorOverviewData(auth.vendor, auth.user.id);
    return jsonOk(data);
  });
}

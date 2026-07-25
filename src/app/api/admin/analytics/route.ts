import { requireAuth } from "@/lib/auth";
import { requireAdminSection } from "@/lib/rbac";
import { jsonNoStore, jsonError, handleApiRoute } from "@/lib/api-response";
import { getCachedAdminAnalyticsData } from "@/core/analytics-engine";

export async function GET() {
  return handleApiRoute(async () => {
    const user = await requireAuth();
    if (!user) return jsonError("Unauthorized", 401);
    try {
      await requireAdminSection(user, "analytics");
    } catch {
      return jsonError("Forbidden", 403);
    }

    const data = await getCachedAdminAnalyticsData();
    return jsonNoStore(data);
  });
}

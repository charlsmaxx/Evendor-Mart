import { requireAuth } from "@/lib/auth";
import { requireAdminSection } from "@/lib/rbac";
import { jsonNoStore, jsonError, handleApiRoute } from "@/lib/api-response";
import { getCachedAdminDashboardData, sanitizeAdminDashboardForUser } from "@/core/analytics-engine";

export async function GET() {
  return handleApiRoute(async () => {
    const user = await requireAuth();
    if (!user) return jsonError("Unauthorized", 401);
    try {
      await requireAdminSection(user, "dashboard");
    } catch {
      return jsonError("Forbidden", 403);
    }

    const data = await getCachedAdminDashboardData();
    return jsonNoStore(sanitizeAdminDashboardForUser(data, user));
  });
}

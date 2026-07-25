import { requireAuth } from "@/lib/auth";
import { requireAdminSection } from "@/lib/rbac";
import { jsonOk, jsonError, handleApiRoute } from "@/lib/api-response";
import { loadAdminTrustPanelData } from "@/core/analytics-engine";

export async function GET() {
  return handleApiRoute(async () => {
    const user = await requireAuth();
    if (!user) return jsonError("Unauthorized", 401);
    try {
      await requireAdminSection(user, "trust");
    } catch {
      return jsonError("Forbidden", 403);
    }

    const data = await loadAdminTrustPanelData();
    return jsonOk(data);
  });
}

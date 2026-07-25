import { requireAuth } from "@/lib/auth";
import { requireAdminSection } from "@/lib/rbac";
import { jsonOk, jsonError, handleApiRoute } from "@/lib/api-response";
import { getRewardsPlatformAnalytics } from "@/lib/rewards";

export async function GET() {
  return handleApiRoute(async () => {
    const user = await requireAuth();
    if (!user) return jsonError("Unauthorized", 401);
    try {
      await requireAdminSection(user, "rewards");
    } catch {
      return jsonError("Forbidden", 403);
    }

    return jsonOk(await getRewardsPlatformAnalytics());
  });
}

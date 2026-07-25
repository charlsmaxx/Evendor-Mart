import { requireAuth } from "@/lib/auth";
import { requireAdminSection } from "@/lib/rbac";
import { jsonOk, jsonError, handleApiRoute } from "@/lib/api-response";
import { runRewardsMaintenance } from "@/lib/rewards";

export async function POST() {
  return handleApiRoute(async () => {
    const user = await requireAuth();
    if (!user) return jsonError("Unauthorized", 401);
    try {
      await requireAdminSection(user, "rewards");
    } catch {
      return jsonError("Forbidden", 403);
    }

    const result = await runRewardsMaintenance();
    return jsonOk({
      ...result,
      message: `Expired ${result.count} reward(s); sent ${result.expiryWarningsSent} expiry warning(s).`,
    });
  });
}

import { requireAuth } from "@/lib/auth";
import { requireAdminSection } from "@/lib/rbac";
import { jsonOk, jsonError } from "@/lib/api-response";
import { detectFraudFlags } from "@/lib/fraud-detection";

export async function GET() {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);
  try {
    await requireAdminSection(user, "trust");
  } catch {
    return jsonError("Forbidden", 403);
  }

  const flags = await detectFraudFlags();
  return jsonOk({
    flags,
    summary: {
      total: flags.length,
      high: flags.filter((f) => f.severity === "high").length,
      medium: flags.filter((f) => f.severity === "medium").length,
    },
  });
}

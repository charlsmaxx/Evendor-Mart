import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { getWalletSummary } from "@/lib/rewards";

export async function GET() {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const summary = await getWalletSummary(user.id);
  return jsonOk(summary);
}

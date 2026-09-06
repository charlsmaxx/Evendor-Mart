import { requireAuth } from "@/lib/auth";
import { requireAdminSection } from "@/lib/rbac";
import { jsonOk, jsonError, handleApiRoute } from "@/lib/api-response";
import { getAdminPayoutReview } from "@/core/payment-engine/manual-payout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApiRoute(async () => {
    const user = await requireAuth();
    if (!user) return jsonError("Unauthorized", 401);
    try {
      await requireAdminSection(user, "escrow");
    } catch {
      return jsonError("Forbidden", 403);
    }

    const { id } = await params;
    const detail = await getAdminPayoutReview(id);
    if (!detail) return jsonError("Payout request not found", 404);
    return jsonOk(detail);
  }, { route: "GET /api/admin/payouts/[id]" });
}

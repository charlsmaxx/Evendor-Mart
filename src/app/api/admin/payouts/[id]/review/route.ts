import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { requireAdminSection } from "@/lib/rbac";
import { jsonOk, jsonError, handleApiRoute } from "@/lib/api-response";
import {
  PayoutRequestError,
  reviewPayoutRequest,
} from "@/core/payment-engine/manual-payout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["APPROVE", "REJECT", "HOLD"]),
  reason: z.string().max(1000).optional(),
});

export async function POST(
  req: NextRequest,
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
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return jsonError("Invalid review action.", 400);

    try {
      const payout = await reviewPayoutRequest({
        adminId: user.id,
        payoutId: id,
        action: parsed.data.action,
        reason: parsed.data.reason,
      });
      return jsonOk({
        id: payout.id,
        status: payout.status,
        amount: payout.amount,
      });
    } catch (err) {
      if (err instanceof PayoutRequestError) return jsonError(err.message, err.status);
      throw err;
    }
  }, { route: "POST /api/admin/payouts/[id]/review" });
}

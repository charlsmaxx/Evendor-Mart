import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { requireAdminSection } from "@/lib/rbac";
import { jsonOk, jsonError, handleApiRoute } from "@/lib/api-response";
import {
  PayoutRequestError,
  recordManualPayout,
} from "@/core/payment-engine/manual-payout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  transferReference: z.string().min(4).max(120),
  paidAmount: z.number().int().positive().optional(),
  paymentMethod: z.string().max(80).optional(),
  paidAt: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
  destinationBank: z.string().max(120).optional(),
  destinationAccountName: z.string().max(120).optional(),
  destinationAccountLast4: z.string().max(8).optional(),
  adjustmentReason: z.string().max(1000).optional(),
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
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid payment record.", 400);
    }

    try {
      const payout = await recordManualPayout({
        adminId: user.id,
        payoutId: id,
        transferReference: parsed.data.transferReference,
        paidAmount: parsed.data.paidAmount,
        paymentMethod: parsed.data.paymentMethod,
        paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : undefined,
        notes: parsed.data.notes,
        destinationBank: parsed.data.destinationBank,
        destinationAccountName: parsed.data.destinationAccountName,
        destinationAccountLast4: parsed.data.destinationAccountLast4,
        adjustmentReason: parsed.data.adjustmentReason,
      });
      return jsonOk({
        id: payout.id,
        status: payout.status,
        amount: payout.amount,
        paidAmount: payout.paidAmount,
      });
    } catch (err) {
      if (err instanceof PayoutRequestError) return jsonError(err.message, err.status);
      throw err;
    }
  }, { route: "POST /api/admin/payouts/[id]/record-payment" });
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { requireAdminSection } from "@/lib/rbac";
import { jsonOk, jsonError, handleApiRoute } from "@/lib/api-response";
import { adjustUserReward } from "@/lib/rewards";

const schema = z.object({
  userId: z.string().uuid(),
  /** Amount in kobo; positive = credit, negative = debit */
  amount: z.number().int().refine((n) => n !== 0, "Amount cannot be zero"),
  reason: z.string().min(3).max(500),
});

export async function POST(req: NextRequest) {
  return handleApiRoute(async () => {
    const user = await requireAuth();
    if (!user) return jsonError("Unauthorized", 401);
    try {
      await requireAdminSection(user, "rewards");
    } catch {
      return jsonError("Forbidden", 403);
    }

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return jsonError(parsed.error.message, 400);

    const target = await adjustUserReward(
      parsed.data.userId,
      parsed.data.amount,
      parsed.data.reason,
      user.id
    );

    return jsonOk({
      transactionId: target.id,
      message: "Rewards wallet updated",
    });
  });
}

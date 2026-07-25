import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { requireAdminSection } from "@/lib/rbac";
import { jsonNoStore, jsonError, handleApiRoute } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { isPaystackConfigured, isPaystackLiveMode } from "@/core/payment-engine/paystack";

const querySchema = z.object({
  status: z.enum(["PENDING", "PROCESSING", "PAID", "FAILED", "REVERSED"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export async function GET(req: NextRequest) {
  return handleApiRoute(async () => {
    const user = await requireAuth();
    if (!user) return jsonError("Unauthorized", 401);
    try {
      await requireAdminSection(user, "escrow");
    } catch {
      return jsonError("Forbidden", 403);
    }

    const parsed = querySchema.safeParse(
      Object.fromEntries(req.nextUrl.searchParams.entries())
    );
    if (!parsed.success) return jsonError("Invalid query", 400);

    const [withdrawals, grouped] = await Promise.all([
      prisma.withdrawal.findMany({
        where: parsed.data.status ? { status: parsed.data.status } : undefined,
        orderBy: { createdAt: "desc" },
        take: parsed.data.limit,
        select: {
          id: true,
          amount: true,
          status: true,
          reference: true,
          bankName: true,
          accountNumberLast4: true,
          failureReason: true,
          attempts: true,
          paystackTransferCode: true,
          processedAt: true,
          createdAt: true,
          vendor: { select: { id: true, businessName: true } },
        },
      }),
      prisma.withdrawal.groupBy({
        by: ["status"],
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);

    const totals = Object.fromEntries(
      grouped.map((g) => [g.status, { count: g._count._all, amount: g._sum.amount ?? 0 }])
    );

    return jsonNoStore({
      withdrawals: withdrawals.map((w) => ({
        ...w,
        processedAt: w.processedAt?.toISOString() ?? null,
        createdAt: w.createdAt.toISOString(),
      })),
      totals,
      paystackConfigured: isPaystackConfigured(),
      liveMode: isPaystackLiveMode(),
    });
  }, { route: "GET /api/admin/withdrawals" });
}

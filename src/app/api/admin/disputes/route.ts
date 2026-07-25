import { requireAuth } from "@/lib/auth";
import { requireAdminSection } from "@/lib/rbac";
import { jsonOk, jsonError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);
  try { await requireAdminSection(user, "trust"); } catch { return jsonError("Forbidden", 403); }

  const disputes = await prisma.dispute.findMany({
    include: {
      booking: {
        include: {
          listing: { select: { title: true } },
          customer: { select: { fullName: true, email: true } },
          vendor: { select: { businessName: true } },
          payments: { select: { amount: true, status: true, escrowStatus: true } },
        },
      },
      raisedBy: { select: { fullName: true, email: true } },
      evidence: {
        include: {
          uploadedBy: { select: { fullName: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return jsonOk(disputes);
}

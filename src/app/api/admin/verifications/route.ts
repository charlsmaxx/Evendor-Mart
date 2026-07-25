import { requireAuth } from "@/lib/auth";
import { requireAdminSection } from "@/lib/rbac";
import { jsonOk, jsonError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);
  try { await requireAdminSection(user, "verification"); } catch { return jsonError("Forbidden", 403); }

  const requests = await prisma.verificationRequest.findMany({
    include: {
      vendor: {
        include: {
          user: { select: { fullName: true, email: true } },
          listings: { select: { id: true, type: true, status: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return jsonOk(requests);
}

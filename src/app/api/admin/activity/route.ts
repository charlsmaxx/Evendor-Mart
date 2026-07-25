import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { requireAdminSection } from "@/lib/rbac";
import { jsonOk, jsonError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);
  try {
    await requireAdminSection(user, "dashboard");
  } catch {
    return jsonError("Forbidden", 403);
  }

  const since = req.nextUrl.searchParams.get("since");
  const logs = await prisma.auditLog.findMany({
    where: since ? { createdAt: { gt: new Date(since) } } : undefined,
    orderBy: { createdAt: "desc" },
    take: since ? 50 : 30,
    include: { actor: { select: { fullName: true, email: true } } },
  });

  return jsonOk(
    logs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      actorName: log.actor?.fullName ?? log.actor?.email ?? "System",
      createdAt: log.createdAt.toISOString(),
    }))
  );
}

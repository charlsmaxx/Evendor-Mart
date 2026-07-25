import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { requireAdminSection } from "@/lib/rbac";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);
  try {
    await requireAdminSection(user, "audit");
  } catch {
    return jsonError("Forbidden", 403);
  }

  const url = new URL(req.url);
  const search = url.searchParams.get("q")?.trim();
  const action = url.searchParams.get("action");

  const where: {
    action?: string;
    OR?: Array<Record<string, unknown>>;
  } = {};

  if (action && action !== "all") where.action = action;

  if (search) {
    where.OR = [
      { action: { contains: search, mode: "insensitive" } },
      { entityType: { contains: search, mode: "insensitive" } },
      { actor: { email: { contains: search, mode: "insensitive" } } },
      { actor: { fullName: { contains: search, mode: "insensitive" } } },
    ];
  }

  const logs = await prisma.auditLog.findMany({
    where,
    include: { actor: { select: { email: true, fullName: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return jsonOk(logs);
}

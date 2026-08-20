import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { requireAdminSection } from "@/lib/rbac";
import { jsonOk, jsonError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);
  try {
    await requireAdminSection(user, "users");
  } catch {
    return jsonError("Forbidden", 403);
  }

  const url = new URL(req.url);
  const search = url.searchParams.get("q")?.trim();
  const method = url.searchParams.get("method")?.trim();

  const rows = await prisma.legalAcceptance.findMany({
    where: {
      ...(method ? { acceptanceMethod: method } : {}),
      ...(search
        ? {
            user: {
              OR: [
                { email: { contains: search, mode: "insensitive" } },
                { fullName: { contains: search, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    },
    select: {
      id: true,
      termsVersion: true,
      privacyVersion: true,
      acceptedAt: true,
      acceptanceMethod: true,
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
        },
      },
    },
    orderBy: { acceptedAt: "desc" },
    take: 100,
  });

  return jsonOk(rows);
}

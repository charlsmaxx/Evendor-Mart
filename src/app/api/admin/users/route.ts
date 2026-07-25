import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { requireAdminSection } from "@/lib/rbac";
import { jsonOk, jsonError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);
  try {
    await requireAdminSection(user, "users");
  } catch {
    return jsonError("Forbidden", 403);
  }

  const url = new URL(req.url);
  const role = url.searchParams.get("role") as UserRole | "all" | null;
  const search = url.searchParams.get("q")?.trim();

  const where: {
    role?: UserRole;
    OR?: Array<Record<string, unknown>>;
  } = {};

  if (role && role !== "all") where.role = role;

  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      adminRole: true,
      phone: true,
      createdAt: true,
      vendorProfile: {
        select: {
          id: true,
          businessName: true,
          verified: true,
          verificationStatus: true,
          ratingAvg: true,
          cancellationRate: true,
          disputeRate: true,
        },
      },
      _count: {
        select: { bookings: true, reviews: true },
      },
      rewardsWallet: {
        select: { availableBalance: true, totalEarned: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return jsonOk(users);
}

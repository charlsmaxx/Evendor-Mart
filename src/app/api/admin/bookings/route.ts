import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { requireAdminSection } from "@/lib/rbac";
import { jsonOk, jsonError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import type { BookingStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);
  try {
    await requireAdminSection(user, "bookings");
  } catch {
    return jsonError("Forbidden", 403);
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("q")?.trim();

  const where: {
    status?: BookingStatus | { in: BookingStatus[] };
    OR?: Array<Record<string, unknown>>;
  } = {};

  if (status && status !== "all") {
    if (status === "disputed") {
      // Handled via dispute relation below
    } else {
      where.status = status.toUpperCase() as BookingStatus;
    }
  }

  if (search) {
    where.OR = [
      { listing: { title: { contains: search, mode: "insensitive" } } },
      { vendor: { businessName: { contains: search, mode: "insensitive" } } },
      { customer: { fullName: { contains: search, mode: "insensitive" } } },
      { customer: { email: { contains: search, mode: "insensitive" } } },
    ];
  }

  const bookings = await prisma.booking.findMany({
    where: status === "disputed" ? { ...where, dispute: { isNot: null } } : where,
    include: {
      customer: { select: { id: true, fullName: true, email: true, phone: true } },
      vendor: { select: { id: true, businessName: true, slug: true } },
      listing: { select: { id: true, title: true, type: true, city: true } },
      payments: { select: { id: true, amount: true, status: true, escrowStatus: true, paystackRef: true } },
      dispute: { select: { id: true, status: true, reason: true } },
      payout: { select: { id: true, amount: true, status: true, reference: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return jsonOk(bookings);
}

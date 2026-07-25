import { NextRequest } from "next/server";
import { writeAuditLog } from "@/core/audit-engine";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { requireAdminSection } from "@/lib/rbac";
import { jsonOk, jsonError } from "@/lib/api-response";
import { z } from "zod";

const patchSchema = z.object({
  listingId: z.string().uuid(),
  status: z.enum(["PUBLISHED", "REJECTED", "PENDING_REVIEW"]).optional(),
  featured: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);
  try {
    await requireAdminSection(user, "listings");
  } catch {
    return jsonError("Forbidden", 403);
  }

  const url = new URL(req.url);
  const queueOnly = url.searchParams.get("queue") === "true";

  const listings = await prisma.listing.findMany({
    where: queueOnly ? { status: { in: ["PENDING_REVIEW", "DRAFT"] } } : undefined,
    include: { vendor: true, category: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return jsonOk(listings);
}

export async function PATCH(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);
  try {
    await requireAdminSection(user, "listings");
  } catch {
    return jsonError("Forbidden", 403);
  }

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const listing = await prisma.listing.update({
    where: { id: parsed.data.listingId },
    data: {
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.featured !== undefined ? { featured: parsed.data.featured } : {}),
    },
  });

  await writeAuditLog({
    actorId: user.id,
    action: "LISTING_MODERATE",
    entityType: "Listing",
    entityId: listing.id,
    metadata: parsed.data,
  });

  return jsonOk(listing);
}

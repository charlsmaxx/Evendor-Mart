import { NextRequest } from "next/server";
import { writeAuditLog } from "@/core/audit-engine";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { requireAdminSection } from "@/lib/rbac";
import { jsonOk, jsonError } from "@/lib/api-response";
import { z } from "zod";
import { cacheDelete } from "@/lib/redis";
import { revalidateTag } from "next/cache";

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

  if (parsed.data.featured !== undefined) {
    await Promise.all([
      cacheDelete("featured:v2:4"),
      cacheDelete("featured:v2:8"),
      cacheDelete("featured:v2:12"),
      cacheDelete("featured:v2:vendors:4"),
      cacheDelete("featured:v2:vendors:8"),
      cacheDelete("featured:v2:venues:4"),
      cacheDelete("featured:v2:venues:8"),
      cacheDelete("featured:v2:venues:12"),
    ]);
    revalidateTag("listings");
  }

  return jsonOk(listing);
}

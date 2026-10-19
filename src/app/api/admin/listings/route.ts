import { NextRequest } from "next/server";
import { writeAuditLog } from "@/core/audit-engine";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { requireAdminSection } from "@/lib/rbac";
import { jsonOk, jsonError } from "@/lib/api-response";
import { z } from "zod";
import { cacheDelete, cacheDeletePrefix } from "@/lib/redis";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  ARCHIVE_LISTING_DATA,
  PUBLIC_SEARCH_CACHE_PREFIX,
  PUBLIC_LISTING_CACHE_KEYS,
  archiveAfterDatabaseUpdate,
} from "@/core/admin-engine/archive";

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

export async function DELETE(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);
  try {
    await requireAdminSection(user, "listings");
  } catch {
    return jsonError("Forbidden", 403);
  }

  const parsed = z.object({ listingId: z.string().uuid() }).safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const result = await archiveAfterDatabaseUpdate(
    () =>
      prisma.$transaction(async (tx) => {
        const listing = await tx.listing.findUnique({
          where: { id: parsed.data.listingId },
          select: { id: true, title: true, type: true, vendorId: true },
        });
        if (!listing) return null;
        if (listing.type !== "VENUE") {
          return { error: "Only event venue listings can be archived here." } as const;
        }

        const archived = await tx.listing.update({
          where: { id: listing.id },
          data: ARCHIVE_LISTING_DATA,
          select: { id: true, title: true, type: true, vendorId: true, status: true },
        });
        await writeAuditLog(
          {
            actorId: user.id,
            action: "VENUE_ARCHIVE",
            entityType: "Listing",
            entityId: listing.id,
            metadata: { title: listing.title },
          },
          tx
        );
        return archived;
      }),
    async () => {
      await Promise.all([
        ...PUBLIC_LISTING_CACHE_KEYS.map((key) => cacheDelete(key)),
        cacheDeletePrefix(PUBLIC_SEARCH_CACHE_PREFIX),
      ]);
      revalidateTag("listings");
      revalidateTag("vendors");
      revalidatePath("/");
    },
    (archived) => archived !== null && !("error" in archived)
  );

  if (!result) return jsonError("Listing not found", 404);
  if ("error" in result) return jsonError(result.error, 400);
  return jsonOk(result);
}

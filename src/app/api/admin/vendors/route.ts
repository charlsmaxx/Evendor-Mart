import { NextRequest } from "next/server";
import { writeAuditLog } from "@/core/audit-engine";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { requireAdminSection } from "@/lib/rbac";
import { jsonOk, jsonError } from "@/lib/api-response";
import { buildPaginationMeta, parsePaginationParams } from "@/lib/pagination";
import { z } from "zod";
import { cacheDelete, cacheDeletePrefix } from "@/lib/redis";
import { featuredVendorCacheKeys, updateVendorFeature } from "@/core/search-engine/featured-vendor-query";
import {
  ARCHIVE_LISTING_DATA,
  PUBLIC_SEARCH_CACHE_PREFIX,
  PUBLIC_LISTING_CACHE_KEYS,
  archiveAfterDatabaseUpdate,
} from "@/core/admin-engine/archive";
import { revalidatePath, revalidateTag } from "next/cache";

const patchSchema = z.object({
  vendorId: z.string().uuid(),
  verified: z.boolean().optional(),
  featured: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);
  try {
    await requireAdminSection(user, "vendors");
  } catch {
    return jsonError("Forbidden", 403);
  }

  const { page, limit } = parsePaginationParams(req.nextUrl.searchParams, { limit: 25 });

  const [vendors, total] = await Promise.all([
    prisma.vendorProfile.findMany({
      include: {
        user: { select: { email: true, fullName: true } },
        _count: { select: { listings: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.vendorProfile.count(),
  ]);

  const data = vendors.map(({ _count, ...vendor }) => ({
    ...vendor,
    listingCount: _count.listings,
  }));

  return jsonOk(data, 200, buildPaginationMeta(page, limit, total));
}

export async function PATCH(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);
  try {
    await requireAdminSection(user, "vendors");
  } catch {
    return jsonError("Forbidden", 403);
  }

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const vendor = await updateVendorFeature(
    () =>
      prisma.vendorProfile.update({
        where: { id: parsed.data.vendorId },
        data: {
          ...(parsed.data.verified !== undefined ? { verified: parsed.data.verified } : {}),
          ...(parsed.data.featured !== undefined ? { featured: parsed.data.featured } : {}),
        },
      }),
    parsed.data.featured,
    async () => {
      await Promise.all(featuredVendorCacheKeys.map((key) => cacheDelete(key)));
      revalidatePath("/");
    }
  );

  await writeAuditLog({
    actorId: user.id,
    action: "VENDOR_UPDATE",
    entityType: "VendorProfile",
    entityId: vendor.id,
    metadata: parsed.data,
  });

  return jsonOk(vendor);
}

export async function DELETE(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);
  try {
    await requireAdminSection(user, "vendors");
  } catch {
    return jsonError("Forbidden", 403);
  }

  const parsed = z.object({ vendorId: z.string().uuid() }).safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const result = await archiveAfterDatabaseUpdate(
    () =>
      prisma.$transaction(async (tx) => {
        const vendor = await tx.vendorProfile.findUnique({
          where: { id: parsed.data.vendorId },
          select: { id: true, businessName: true },
        });
        if (!vendor) return null;

        const archivedListings = await tx.listing.updateMany({
          where: { vendorId: vendor.id, status: { not: "ARCHIVED" } },
          data: ARCHIVE_LISTING_DATA,
        });
        await tx.vendorProfile.update({
          where: { id: vendor.id },
          data: { featured: false },
        });
        await writeAuditLog(
          {
            actorId: user.id,
            action: "VENDOR_ARCHIVE",
            entityType: "VendorProfile",
            entityId: vendor.id,
            metadata: {
              businessName: vendor.businessName,
              archivedListings: archivedListings.count,
            },
          },
          tx
        );
        return { ...vendor, archivedListings: archivedListings.count };
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
    (archived) => archived !== null
  );

  if (!result) return jsonError("Vendor not found", 404);
  return jsonOk(result);
}

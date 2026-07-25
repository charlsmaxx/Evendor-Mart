import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { createListingSchema, updateListingSchema } from "@/lib/validations/listing";
import { requireRole } from "@/lib/rbac";
import { apiLimiter, checkRateLimit } from "@/lib/rate-limit";
import { resolveCategoryIdForVendor, uniqueListingSlug } from "@/lib/vendor-listings";
import { mergeListingMetadata } from "@/lib/listing-metadata";
import type { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const rate = await checkRateLimit(apiLimiter, user.id);
  if (!rate.success) return jsonError("Rate limit exceeded", 429);

  try {
    await requireRole(user.id, ["VENDOR", "ADMIN"]);
  } catch {
    return jsonError("Forbidden", 403);
  }

  const body = await req.json();
  const parsed = createListingSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } });
  if (!vendor) return jsonError("Vendor profile required", 400);

  const { capacity, amenities, services, termsAndConditions, address, ...data } = parsed.data;
  const categoryId =
    data.categoryId || (await resolveCategoryIdForVendor(vendor.category));
  if (!categoryId) return jsonError("Category not found", 400);

  const slug = await uniqueListingSlug(data.title);

  const listing = await prisma.listing.create({
    data: {
      ...data,
      categoryId,
      slug,
      vendorId: vendor.id,
      status: "DRAFT",
      images: data.coverImage ? [data.coverImage] : [],
      metadata: mergeListingMetadata(null, {
        services: services ?? [],
        termsAndConditions: termsAndConditions ?? undefined,
      }) as Prisma.InputJsonValue,
    },
  });

  if (data.type === "VENUE" && capacity) {
    await prisma.venueDetails.create({
      data: {
        listingId: listing.id,
        capacity,
        amenities: amenities ?? [],
        address: address ?? null,
      },
    });
  }

  return jsonOk(listing, 201);
}

export async function PATCH(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const body = await req.json();
  const parsed = updateListingSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const { id, ...updates } = parsed.data;
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: { vendor: true },
  });
  if (!listing || (listing.vendor.userId !== user.id && user.role !== "ADMIN")) {
    return jsonError("Forbidden", 403);
  }

  const updated = await prisma.listing.update({ where: { id }, data: updates });
  return jsonOk(updated);
}

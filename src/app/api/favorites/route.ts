import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { buildPaginationMeta, parsePaginationParams } from "@/lib/pagination";
import { resolvePublicListingCover } from "@/lib/images";
import { z } from "zod";

const favoriteSchema = z.object({ listingId: z.string().uuid() });

const favoriteListingSelect = {
  id: true,
  slug: true,
  title: true,
  city: true,
  coverImage: true,
  images: true,
  priceMin: true,
  priceMax: true,
  ratingAvg: true,
  reviewCount: true,
  verified: true,
  featured: true,
  type: true,
  vendor: {
    select: {
      slug: true,
      businessName: true,
      metadata: true,
      portfolioMedia: {
        orderBy: { sortOrder: "asc" as const },
        take: 1,
        select: { id: true, url: true },
      },
    },
  },
  portfolioMedia: {
    orderBy: { sortOrder: "asc" as const },
    take: 1,
    select: { url: true },
  },
} as const;

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const { page, limit } = parsePaginationParams(req.nextUrl.searchParams, { limit: 24 });

  const where = { userId: user.id };

  const [favorites, total] = await Promise.all([
    prisma.favorite.findMany({
      where,
      select: {
        id: true,
        createdAt: true,
        listing: { select: favoriteListingSelect },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.favorite.count({ where }),
  ]);

  const data = favorites.map((f) => ({
    id: f.id,
    createdAt: f.createdAt.toISOString(),
    listing: {
      id: f.listing.id,
      slug: f.listing.slug,
      vendorSlug: f.listing.vendor.slug,
      title: f.listing.title,
      city: f.listing.city,
      coverImage: resolvePublicListingCover(f.listing, f.listing.vendor),
      priceMin: f.listing.priceMin,
      priceMax: f.listing.priceMax,
      ratingAvg: f.listing.ratingAvg,
      reviewCount: f.listing.reviewCount,
      verified: f.listing.verified,
      featured: f.listing.featured,
      vendorName: f.listing.vendor.businessName,
      type: f.listing.type,
    },
  }));

  return jsonOk(data, 200, buildPaginationMeta(page, limit, total));
}

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const parsed = favoriteSchema.safeParse(await req.json());
  if (!parsed.success) return jsonError("Invalid input", 400);

  const favorite = await prisma.favorite.upsert({
    where: {
      userId_listingId: { userId: user.id, listingId: parsed.data.listingId },
    },
    update: {},
    create: { userId: user.id, listingId: parsed.data.listingId },
  });
  return jsonOk(favorite, 201);
}

export async function DELETE(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const listingId = req.nextUrl.searchParams.get("listingId");
  if (!listingId) return jsonError("listingId required", 400);

  await prisma.favorite.deleteMany({
    where: { userId: user.id, listingId },
  });
  return jsonOk({ removed: true });
}

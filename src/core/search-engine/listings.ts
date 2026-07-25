import { Prisma } from "@prisma/client";
import { prisma } from "@/core/infrastructure/prisma";
import { listingSearchSchema } from "@/lib/validations/listing";
import { cacheGet, cacheSet } from "@/lib/redis";
import { CACHE_TTL } from "@/lib/cache-policy";
import { createCachedByKey } from "@/lib/server-cache";
import type { VendorCardData } from "@/components/marketplace/vendor-card";
import { DEMO_LISTINGS } from "@/data/demo-listings";
import { resolvePublicListingCover } from "@/core/media-engine/images";
import crypto from "crypto";

const SEARCH_CACHE_TTL_SECONDS = CACHE_TTL.search;
const FEATURED_CACHE_TTL_SECONDS = CACHE_TTL.featured;

const listingCardSelect = {
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
} satisfies Prisma.ListingSelect;

export async function searchListings(raw: Record<string, string | undefined>) {
  const parsed = listingSearchSchema.safeParse(raw);
  if (!parsed.success) return { listings: [], total: 0, page: 1, limit: 12 };

  const { q, category, type, city, minBudget, maxBudget, minRating, verified, page, limit } =
    parsed.data;

  const cacheKey = `search:v4:${crypto.createHash("md5").update(JSON.stringify(parsed.data)).digest("hex")}`;
  const cached = await cacheGet<{ listings: VendorCardData[]; total: number; page: number; limit: number }>(
    cacheKey
  );
  if (cached) return cached;

  const where: Prisma.ListingWhereInput = {
    status: "PUBLISHED",
    ...(type ? { type } : {}),
    ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
    ...(verified ? { verified: true } : {}),
    ...(minBudget ? { priceMax: { gte: minBudget } } : {}),
    ...(maxBudget ? { priceMin: { lte: maxBudget } } : {}),
    ...(minRating ? { ratingAvg: { gte: minRating } } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { vendor: { businessName: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
    ...(category ? { category: { slug: category } } : {}),
  };

  try {
    const [rows, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        select: listingCardSelect,
        orderBy: [{ featured: "desc" }, { ratingAvg: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.listing.count({ where }),
    ]);

    const listings: VendorCardData[] = rows.map((l) => ({
      id: l.id,
      slug: l.slug,
      vendorSlug: l.vendor.slug,
      title: l.title,
      city: l.city,
      coverImage: resolvePublicListingCover(l, l.vendor),
      priceMin: l.priceMin,
      priceMax: l.priceMax,
      ratingAvg: l.ratingAvg,
      reviewCount: l.reviewCount,
      verified: l.verified,
      featured: l.featured,
      vendorName: l.vendor.businessName,
      type: l.type,
    }));

    const result = { listings, total, page, limit };
    if (listings.length || total === 0) await cacheSet(cacheKey, result, SEARCH_CACHE_TTL_SECONDS);
    return result;
  } catch {
    const filtered = DEMO_LISTINGS.filter((l) => {
      if (type === "VENUE" && l.type !== "VENUE") return false;
      if (type === "SERVICE" && l.type !== "SERVICE") return false;
      if (city && !l.city.toLowerCase().includes(city.toLowerCase())) return false;
      if (q && !l.title.toLowerCase().includes(q.toLowerCase())) return false;
      if (verified && !l.verified) return false;
      return true;
    });
    const start = (page - 1) * limit;
    return {
      listings: filtered.slice(start, start + limit),
      total: filtered.length,
      page,
      limit,
    };
  }
}

export async function getFeaturedListings(limit = 4) {
  const cacheKey = `featured:v2:${limit}`;
  const cached = await cacheGet<VendorCardData[]>(cacheKey);
  if (cached) return cached;

  try {
    const rows = await prisma.listing.findMany({
      where: { status: "PUBLISHED", featured: true },
      select: listingCardSelect,
      take: limit,
      orderBy: { ratingAvg: "desc" },
    });
    if (rows.length) {
      const listings = rows.map((l) => ({
        id: l.id,
        slug: l.slug,
        vendorSlug: l.vendor.slug,
        title: l.title,
        city: l.city,
        coverImage: resolvePublicListingCover(l, l.vendor),
        priceMin: l.priceMin,
        priceMax: l.priceMax,
        ratingAvg: l.ratingAvg,
        reviewCount: l.reviewCount,
        verified: l.verified,
        featured: l.featured,
        vendorName: l.vendor.businessName,
        type: l.type,
      })) as VendorCardData[];
      await cacheSet(cacheKey, listings, FEATURED_CACHE_TTL_SECONDS);
      return listings;
    }
  } catch {
    /* fallback */
  }
  return DEMO_LISTINGS.filter((l) => l.featured).slice(0, limit);
}

export async function getListingBySlug(slug: string) {
  try {
    const listing = await prisma.listing.findUnique({
      where: { slug },
      include: {
        vendor: {
          include: {
            user: { select: { id: true, fullName: true, avatarUrl: true } },
            portfolioMedia: { orderBy: { sortOrder: "asc" } },
          },
        },
        category: true,
        venueDetails: true,
        reviews: {
          where: { moderated: false },
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { user: { select: { fullName: true, avatarUrl: true } } },
        },
        portfolioMedia: true,
      },
    });
    return listing;
  } catch {
    return null;
  }
}

export async function getPublishedListingBySlug(slug: string) {
  const listing = await getListingBySlug(slug);
  if (!listing || listing.status !== "PUBLISHED") return null;
  return listing;
}

const getPublishedListingCached = createCachedByKey(
  "published-listing",
  CACHE_TTL.publicListing,
  ["listings"],
  getPublishedListingBySlug
);

/** ISR-cached published listing for public detail pages. */
export function getPublishedListingBySlugCached(slug: string) {
  return getPublishedListingCached(slug);
}

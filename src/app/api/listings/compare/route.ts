import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonPublic, jsonError } from "@/lib/api-response";
import { resolvePublicListingCover } from "@/lib/images";
import { cacheGet, cacheSet } from "@/lib/redis";
import { CACHE_TTL } from "@/lib/cache-policy";
import crypto from "crypto";

const COMPARE_CACHE_TTL_SECONDS = CACHE_TTL.compare;

const compareListingSelect = {
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
  type: true,
  vendorId: true,
  vendor: {
    select: {
      businessName: true,
      metadata: true,
      portfolioMedia: {
        orderBy: { sortOrder: "asc" as const },
        take: 1,
        select: { id: true, url: true },
      },
    },
  },
  category: { select: { name: true } },
  venueDetails: { select: { capacity: true } },
  portfolioMedia: {
    orderBy: { sortOrder: "asc" as const },
    take: 1,
    select: { url: true },
  },
} as const;

type CompareRow = Awaited<ReturnType<typeof fetchListings>>[number];

function mapListing(l: CompareRow) {
  return {
    id: l.id,
    slug: l.slug,
    title: l.title,
    city: l.city,
    priceMin: l.priceMin,
    priceMax: l.priceMax,
    ratingAvg: l.ratingAvg,
    reviewCount: l.reviewCount,
    verified: l.verified,
    type: l.type,
    vendorId: l.vendorId,
    vendorName: l.vendor.businessName,
    capacity: l.venueDetails?.capacity ?? null,
    categoryName: l.category.name,
    coverImage: resolvePublicListingCover(l, l.vendor),
  };
}

async function fetchListings(ids: string[]) {
  return prisma.listing.findMany({
    where: { id: { in: ids }, status: "PUBLISHED" },
    select: compareListingSelect,
  });
}

export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get("ids") ?? "";
  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
  if (!ids.length) return jsonPublic([]);

  const cacheKey = `compare:v1:${crypto.createHash("md5").update(ids.join(",")).digest("hex")}`;
  const cached = await cacheGet<ReturnType<typeof mapListing>[]>(cacheKey);
  if (cached) return jsonPublic(cached);

  try {
    const rows = await fetchListings(ids);
    const seenVendors = new Set<string>();
    const listings = ids
      .map((id) => rows.find((r) => r.id === id))
      .filter((r): r is NonNullable<typeof r> => Boolean(r))
      .filter((l) => {
        if (seenVendors.has(l.vendorId)) return false;
        seenVendors.add(l.vendorId);
        return true;
      })
      .map(mapListing);

    await cacheSet(cacheKey, listings, COMPARE_CACHE_TTL_SECONDS);
    return jsonPublic(listings);
  } catch {
    return jsonError("Could not load listings for comparison", 500);
  }
}

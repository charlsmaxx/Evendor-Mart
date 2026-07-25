import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonPublic, jsonError } from "@/lib/api-response";
import { resolvePublicListingCover } from "@/lib/images";
import { cacheGet, cacheSet } from "@/lib/redis";
import { CACHE_TTL } from "@/lib/cache-policy";
import crypto from "crypto";

const SUGGESTIONS_CACHE_TTL_SECONDS = CACHE_TTL.suggestions;

const suggestionListingSelect = {
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

type SuggestionRow = {
  id: string;
  slug: string;
  title: string;
  city: string;
  coverImage: string | null;
  images: string[];
  priceMin: number;
  priceMax: number;
  ratingAvg: number;
  reviewCount: number;
  verified: boolean;
  type: "SERVICE" | "VENUE";
  vendorId: string;
  vendor: {
    businessName: string;
    metadata: unknown;
    portfolioMedia: { id: string; url: string }[];
  };
  category: { name: string };
  venueDetails: { capacity: number | null } | null;
  portfolioMedia: { url: string }[];
};

function mapSuggestion(l: SuggestionRow) {
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

export async function GET(req: NextRequest) {
  const listingId = req.nextUrl.searchParams.get("listingId");
  if (!listingId) return jsonError("listingId required", 400);

  const excludeListingIds =
    req.nextUrl.searchParams.get("exclude")?.split(",").filter(Boolean) ?? [];
  const excludeVendorIds =
    req.nextUrl.searchParams.get("excludeVendors")?.split(",").filter(Boolean) ?? [];

  const cacheKey = `compare:suggestions:v1:${crypto
    .createHash("md5")
    .update(JSON.stringify({ listingId, excludeListingIds, excludeVendorIds }))
    .digest("hex")}`;
  const cached = await cacheGet<ReturnType<typeof mapSuggestion>[]>(cacheKey);
  if (cached) return jsonPublic(cached);

  try {
    const source = await prisma.listing.findUnique({
      where: { id: listingId, status: "PUBLISHED" },
      select: { id: true, vendorId: true, city: true, type: true },
    });
    if (!source) return jsonPublic([]);

    const typeFilter =
      source.type === "VENUE"
        ? ("VENUE" as const)
        : source.type === "SERVICE"
          ? ("SERVICE" as const)
          : null;

    const baseWhere = {
      status: "PUBLISHED" as const,
      ...(typeFilter ? { type: typeFilter } : {}),
      id: { notIn: [source.id, ...excludeListingIds] },
      vendorId: { notIn: [source.vendorId, ...excludeVendorIds] },
    };

    const rows = await prisma.listing.findMany({
      where: {
        ...baseWhere,
        ...(source.city
          ? { city: { contains: source.city, mode: "insensitive" as const } }
          : {}),
      },
      select: suggestionListingSelect,
      orderBy: [{ featured: "desc" }, { ratingAvg: "desc" }],
      take: 6,
    });

    if (rows.length < 3) {
      const more = await prisma.listing.findMany({
        where: baseWhere,
        select: suggestionListingSelect,
        orderBy: [{ featured: "desc" }, { ratingAvg: "desc" }],
        take: 6,
      });
      const seen = new Set(rows.map((r) => r.id));
      for (const row of more) {
        if (!seen.has(row.id)) {
          rows.push(row);
          seen.add(row.id);
        }
        if (rows.length >= 6) break;
      }
    }

    const listings = rows.slice(0, 6).map(mapSuggestion);
    await cacheSet(cacheKey, listings, SUGGESTIONS_CACHE_TTL_SECONDS);
    return jsonPublic(listings);
  } catch {
    return jsonError("Could not load comparison suggestions", 500);
  }
}

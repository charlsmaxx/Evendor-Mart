import { prisma } from "@/lib/prisma";
import { resolveVendorCover, resolveVendorAvatar } from "@/lib/images";
import { getEnabledPackages } from "@/lib/vendor-packages";
import { createCachedByKey } from "@/lib/server-cache";
import { CACHE_TTL } from "@/lib/cache-policy";

export async function getVendorPublicProfile(slug: string) {
  try {
    let highlightListingId: string | null = null;
    let vendorId: string | null = null;

    const vendorBySlug = await prisma.vendorProfile.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (vendorBySlug) {
      vendorId = vendorBySlug.id;
    } else {
      const listing = await prisma.listing.findFirst({
        where: { slug },
        select: { id: true, vendorId: true, status: true },
      });
      if (!listing) return null;
      vendorId = listing.vendorId;
      if (listing.status === "PUBLISHED") highlightListingId = listing.id;
    }

    const profile = await prisma.vendorProfile.findUnique({
      where: { id: vendorId },
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true } },
        portfolioMedia: { orderBy: { sortOrder: "asc" } },
        listings: {
          where: { status: "PUBLISHED" },
          include: {
            category: true,
            venueDetails: true,
            portfolioMedia: true,
            reviews: {
              where: { moderated: false },
              orderBy: { createdAt: "desc" },
              take: 10,
              select: {
                id: true,
                rating: true,
                comment: true,
                vendorReply: true,
                createdAt: true,
                user: { select: { fullName: true, avatarUrl: true } },
              },
            },
          },
          orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
        },
      },
    });

    if (!profile) return null;

    const published = profile.listings;
    const primaryListing =
      published.find((l) => l.id === highlightListingId) ?? published[0] ?? null;

    const coverImage = resolveVendorCover(profile, primaryListing ?? undefined);
    const avatarUrl = resolveVendorAvatar(profile, coverImage);

    const allReviews = published.flatMap((l) => l.reviews);
    const ratingAvg =
      published.length > 0
        ? published.reduce((sum, l) => sum + l.ratingAvg, 0) / published.length
        : profile.ratingAvg;
    const reviewCount =
      published.length > 0
        ? published.reduce((sum, l) => sum + l.reviewCount, 0)
        : profile.reviewCount;

    const meta = (profile.metadata as Record<string, unknown>) ?? {};

    return {
      vendor: profile,
      primaryListing,
      coverImage,
      avatarUrl,
      allReviews,
      ratingAvg,
      reviewCount,
      packages: getEnabledPackages(profile.metadata),
      about: {
        tagline: (meta.tagline as string) ?? "",
        experience: (meta.experience as string) ?? "",
        teamSize: (meta.teamSize as string) ?? "",
        languages: (meta.languages as string[]) ?? [],
        establishedYear: (meta.establishedYear as string) ?? "",
        secondaryCategory: (meta.secondaryCategory as string) ?? "",
      },
      seo: meta.seo as
        | { title: string; description: string; canonicalPath: string; keywords: string[]; openGraphImage?: string }
        | undefined,
    };
  } catch (e) {
    console.error("getVendorPublicProfile error:", e);
    return null;
  }
}

const getVendorProfileCached = createCachedByKey(
  "vendor-profile",
  CACHE_TTL.publicVendor,
  ["vendors"],
  getVendorPublicProfile
);

/** ISR-cached vendor public profile. */
export function getVendorPublicProfileCached(slug: string) {
  return getVendorProfileCached(slug);
}

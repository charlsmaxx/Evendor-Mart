export const DEFAULT_LISTING_COVER =
  "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_800,h_600,c_fill/sample.jpg";

type ListingCoverSource = {
  coverImage?: string | null;
  images?: string[];
  portfolioMedia?: { url: string }[];
};

export type VendorBrandingSource = {
  metadata?: unknown;
  portfolioMedia?: { id?: string; url: string }[];
  user?: { avatarUrl?: string | null };
};

export function getVendorProfileImages(metadata: unknown) {
  const m = (metadata as Record<string, unknown>) ?? {};
  return {
    coverImageUrl: typeof m.coverImageUrl === "string" ? m.coverImageUrl : undefined,
    portfolioCoverUrl: typeof m.portfolioCoverUrl === "string" ? m.portfolioCoverUrl : undefined,
    portfolioCoverMediaId:
      typeof m.portfolioCoverMediaId === "string" ? m.portfolioCoverMediaId : undefined,
  };
}

/** Profile cover from vendor settings — used on marketplace cards and public pages. */
export function resolveVendorCover(
  vendor: VendorBrandingSource,
  listing?: ListingCoverSource
): string {
  const meta = getVendorProfileImages(vendor.metadata);
  const coverMedia = meta.portfolioCoverMediaId
    ? vendor.portfolioMedia?.find((m) => m.id === meta.portfolioCoverMediaId)
    : null;

  return (
    meta.coverImageUrl ||
    meta.portfolioCoverUrl ||
    coverMedia?.url ||
    (listing ? resolveListingCover(listing, vendor.portfolioMedia) : undefined) ||
    vendor.portfolioMedia?.[0]?.url ||
    DEFAULT_LISTING_COVER
  );
}

export function resolveVendorAvatar(
  vendor: VendorBrandingSource,
  coverFallback?: string | null
): string | null {
  return vendor.user?.avatarUrl ?? coverFallback ?? null;
}

export function resolveListingCover(
  listing: ListingCoverSource,
  vendorPortfolio?: { url: string }[]
) {
  return (
    listing.coverImage ||
    listing.images?.[0] ||
    listing.portfolioMedia?.[0]?.url ||
    vendorPortfolio?.[0]?.url ||
    DEFAULT_LISTING_COVER
  );
}

/** Customer-facing listing card / hero image — profile cover wins over stale listing art. */
export function resolvePublicListingCover(
  listing: ListingCoverSource,
  vendor: VendorBrandingSource
) {
  return resolveVendorCover(vendor, listing);
}

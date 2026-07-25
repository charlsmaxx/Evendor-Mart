import { VendorCategory, ListingType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { mergeListingMetadata } from "@/lib/listing-metadata";
import { syncListingPortfolioMedia } from "@/lib/vendor-media-server";
import type { UploadedMedia } from "@/lib/vendor-media";
import { vendorCategoryToSlug } from "@/lib/categories";

export { vendorCategoryToSlug } from "@/lib/categories";

export async function resolveCategoryIdForVendor(vendorCategory: VendorCategory) {
  const slug = vendorCategoryToSlug[vendorCategory];
  const category = await prisma.category.findUnique({ where: { slug } });
  if (category) return category.id;
  return (await prisma.category.findFirst({ orderBy: { sortOrder: "asc" } }))?.id ?? null;
}

export async function uniqueListingSlug(base: string) {
  const root = slugify(base) || "listing";
  let candidate = root;
  let n = 0;
  while (await prisma.listing.findUnique({ where: { slug: candidate } })) {
    n += 1;
    candidate = `${root}-${n}`;
  }
  return candidate;
}

export type VendorListingInput = {
  vendorId: string;
  vendorCategory: VendorCategory;
  city: string;
  businessName: string;
  bio?: string | null;
  listingTitle?: string;
  listingDescription?: string;
  priceMin?: number;
  priceMax?: number;
  coverImage?: string;
  featuredImages?: UploadedMedia[];
  featuredClips?: UploadedMedia[];
  address?: string;
  capacity?: number;
  amenities?: string[];
  services?: string[];
  termsAndConditions?: string | null;
};

/** Creates or updates the vendor's primary marketplace listing as PUBLISHED. */
export async function upsertPublishedVendorListing(input: VendorListingInput) {
  const categoryId = await resolveCategoryIdForVendor(input.vendorCategory);
  if (!categoryId) throw new Error("No marketplace categories found. Run db:seed.");

  const title = input.listingTitle?.trim() || input.businessName;
  const description =
    input.listingDescription?.trim() ||
    input.bio?.trim() ||
    `${input.businessName} — book with confidence on Evendor.`;
  const priceMin = input.priceMin ?? 100_000;
  const priceMax = input.priceMax ?? Math.max(priceMin, 500_000);
  const type = input.vendorCategory === "VENUE" ? ListingType.VENUE : ListingType.SERVICE;

  const existing = await prisma.listing.findFirst({
    where: { vendorId: input.vendorId },
    orderBy: { createdAt: "asc" },
  });

  const slug = existing?.slug ?? (await uniqueListingSlug(title));

  const data = {
    title,
    slug,
    description,
    city: input.city,
    priceMin,
    priceMax,
    categoryId,
    type,
    status: "PUBLISHED" as const,
    metadata: mergeListingMetadata(null, {
      services: input.services ?? [],
      termsAndConditions: input.termsAndConditions ?? undefined,
    }),
    ...(input.coverImage
      ? { coverImage: input.coverImage, images: input.featuredImages?.map((m) => m.url) ?? [input.coverImage] }
      : input.featuredImages?.length
        ? { images: input.featuredImages.map((m) => m.url) }
        : {}),
  };

  let listing;
  if (existing) {
    listing = await prisma.listing.update({ where: { id: existing.id }, data });
  } else {
    listing = await prisma.listing.create({
      data: { ...data, vendorId: input.vendorId },
    });
  }

  if (type === ListingType.VENUE && input.capacity) {
    await prisma.venueDetails.upsert({
      where: { listingId: listing.id },
      create: {
        listingId: listing.id,
        capacity: input.capacity,
        amenities: input.amenities ?? [],
        address: input.address,
      },
      update: {
        capacity: input.capacity,
        amenities: input.amenities ?? [],
        address: input.address,
      },
    });
  }

  if (input.featuredImages?.length || input.featuredClips?.length) {
    await syncListingPortfolioMedia(
      input.vendorId,
      listing.id,
      input.featuredImages ?? [],
      input.featuredClips ?? []
    );
  }

  return listing;
}

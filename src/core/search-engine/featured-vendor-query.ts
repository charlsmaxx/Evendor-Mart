import type { Prisma } from "@prisma/client";

export const featuredVendorListingWhere = {
  status: "PUBLISHED",
  type: "SERVICE",
  vendor: { is: { featured: true } },
} satisfies Prisma.ListingWhereInput;

export const featuredVendorCacheKeys = [
  "featured:v2:vendors:4",
  "featured:v2:vendors:8",
  "featured:v2:vendors:12",
] as const;

export async function updateVendorFeature<T>(
  update: () => Promise<T>,
  featured: boolean | undefined,
  invalidateFeaturedVendors: () => Promise<void>
): Promise<T> {
  const result = await update();
  if (featured !== undefined) await invalidateFeaturedVendors();
  return result;
}

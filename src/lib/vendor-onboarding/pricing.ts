import {
  getEnabledPackages,
  normalizePackages,
  packageBasePrice,
  type VendorPackage,
} from "@/lib/vendor-packages";

export function derivePackageStartingPrice(rawPackages: unknown): number | null {
  if (!Array.isArray(rawPackages)) return null;

  const validPrices = getEnabledPackages({ packages: rawPackages })
    .map(packageBasePrice)
    .filter((price) => Number.isSafeInteger(price) && price > 0);

  return validPrices.length > 0 ? Math.min(...validPrices) : null;
}

export type ExistingListingPrices = {
  priceMin: number;
  priceMax: number;
};

export function resolveOnboardingListingPrices(input: {
  requestedPriceMin?: number;
  requestedPriceMax?: number;
  existing?: ExistingListingPrices | null;
  preserveExistingNonzero?: boolean;
}) {
  const requestedPriceMin = input.requestedPriceMin ?? 100_000;
  const existing = input.existing;
  const priceMin = input.preserveExistingNonzero && existing && existing.priceMin > 0
    ? existing.priceMin
    : requestedPriceMin;
  const priceMax = input.preserveExistingNonzero && existing && existing.priceMax > 0
    ? existing.priceMax
    : input.requestedPriceMax ?? Math.max(priceMin, 500_000);

  return { priceMin, priceMax };
}

export function packagesForOnboardingPrice(
  draftPackages: VendorPackage[],
  storedPackages: unknown
): VendorPackage[] {
  const realDraftPackages = draftPackages.filter((pkg) => !pkg.tier);
  if (draftPackages.length > 0) return realDraftPackages;
  return Array.isArray(storedPackages)
    ? normalizePackages(storedPackages).filter((pkg) => !pkg.tier)
    : [];
}

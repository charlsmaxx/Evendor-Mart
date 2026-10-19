import assert from "node:assert/strict";
import test from "node:test";
import { emptyPackage } from "@/lib/vendor-packages";
import { mergeDraft, parseDraft } from "@/lib/vendor-onboarding/types";
import { vendorPackageDraftsSchema } from "@/lib/vendor-onboarding/package-schema";
import {
  derivePackageStartingPrice,
  resolveOnboardingListingPrices,
} from "@/lib/vendor-onboarding/pricing";

test("vendor onboarding derives the starting price from its enabled package", () => {
  const pkg = emptyPackage({ price: 42_000, enabled: true });
  assert.equal(derivePackageStartingPrice([pkg]), 42_000);
});

test("the lowest valid package price is independent of package order", () => {
  const packages = [
    emptyPackage({ price: 75_000, enabled: true }),
    emptyPackage({ price: 32_000, enabled: true }),
    emptyPackage({ price: 60_000, enabled: true }),
  ];
  assert.equal(derivePackageStartingPrice(packages), 32_000);
  assert.equal(derivePackageStartingPrice([...packages].reverse()), 32_000);
});

test("venue package pricing uses the same enabled-package derivation", () => {
  const venuePackages = [emptyPackage({ price: 250_000, enabled: true })];
  assert.equal(derivePackageStartingPrice(venuePackages), 250_000);
});

test("disabled, missing, and invalid package prices do not become a starting price", () => {
  assert.equal(derivePackageStartingPrice([emptyPackage({ price: 10_000, enabled: false })]), null);
  assert.equal(derivePackageStartingPrice([emptyPackage({ price: 0, enabled: true })]), null);
  assert.equal(derivePackageStartingPrice([emptyPackage({ price: -5, enabled: true })]), null);
  assert.equal(derivePackageStartingPrice([emptyPackage({ price: 1.5, enabled: true })]), null);
  assert.equal(derivePackageStartingPrice([]), null);
});

test("fixed package price uses packageBasePrice and ignores the optional maximum cap", () => {
  const pkg = emptyPackage({ price: 50_000, fixedPrice: 44_000, maxPrice: 40_000, enabled: true });
  assert.equal(derivePackageStartingPrice([pkg]), 44_000);
});

test("validated packages survive draft autosave and resume without unknown fields", () => {
  const pkg = emptyPackage({ price: 55_000, enabled: true });
  const parsed = vendorPackageDraftsSchema.parse([{ ...pkg, unexpected: "discarded" }]);
  assert.equal("unexpected" in parsed[0], false);

  const draft = mergeDraft(
    { ...parseDraft(null, "SERVICE"), packages: [] },
    { packages: parsed as typeof pkg[] }
  );
  const resumed = parseDraft(draft, "SERVICE");
  assert.equal(derivePackageStartingPrice(resumed.packages), 55_000);
});

test("existing positive manual prices and priceMax semantics are preserved", () => {
  assert.deepEqual(
    resolveOnboardingListingPrices({
      requestedPriceMin: 20_000,
      existing: { priceMin: 90_000, priceMax: 300_000 },
      preserveExistingNonzero: true,
    }),
    { priceMin: 90_000, priceMax: 300_000 }
  );
});

test("new listing priceMax retains the existing default behavior", () => {
  assert.deepEqual(
    resolveOnboardingListingPrices({ requestedPriceMin: 20_000 }),
    { priceMin: 20_000, priceMax: 500_000 }
  );
});

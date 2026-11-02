import assert from "node:assert/strict";
import test from "node:test";
import {
  featuredVendorCacheKeys,
  featuredVendorListingWhere,
  updateVendorFeature,
} from "@/core/search-engine/featured-vendor-query";
import { ensureApiResponseOk } from "@/lib/parse-paginated-api-response";

test("featured vendor query selects published service listings of featured profiles", () => {
  assert.deepEqual(featuredVendorListingWhere, {
    status: "PUBLISHED",
    type: "SERVICE",
    vendor: { is: { featured: true } },
  });

  const fixtures = [
    {
      status: "PUBLISHED",
      type: "SERVICE",
      listingFeatured: false,
      vendor: { featured: true },
      expected: true,
    },
    { status: "PUBLISHED", type: "SERVICE", vendor: { featured: false }, expected: false },
    { status: "DRAFT", type: "SERVICE", vendor: { featured: true }, expected: false },
    { status: "PUBLISHED", type: "VENUE", vendor: { featured: true }, expected: false },
  ];
  for (const listing of fixtures) {
    const matches =
      listing.status === featuredVendorListingWhere.status &&
      listing.type === featuredVendorListingWhere.type &&
      listing.vendor.featured === featuredVendorListingWhere.vendor.is.featured;
    assert.equal(matches, listing.expected);
  }
});

test("vendor feature cache invalidation runs after a successful update", async () => {
  const events: string[] = [];
  const result = await updateVendorFeature(
    async () => {
      events.push("database-update");
      return { id: "vendor-1" };
    },
    true,
    async () => {
      events.push("invalidate");
    }
  );

  assert.deepEqual(result, { id: "vendor-1" });
  assert.deepEqual(events, ["database-update", "invalidate"]);
  assert.deepEqual(featuredVendorCacheKeys, [
    "featured:v2:vendors:4",
    "featured:v2:vendors:8",
    "featured:v2:vendors:10",
    "featured:v2:vendors:12",
  ]);
});

test("vendor feature cache invalidation does not run after a failed update", async () => {
  let invalidated = false;
  await assert.rejects(
    updateVendorFeature(
      async () => {
        throw new Error("database update failed");
      },
      true,
      async () => {
        invalidated = true;
      }
    ),
    /database update failed/
  );
  assert.equal(invalidated, false);
});

test("vendor verification-only update does not invalidate featured vendor cache", async () => {
  let invalidated = false;
  await updateVendorFeature(async () => undefined, undefined, async () => {
    invalidated = true;
  });
  assert.equal(invalidated, false);
});

test("admin mutation HTTP errors are surfaced with the API message", async () => {
  await assert.rejects(
    ensureApiResponseOk(
      new Response(JSON.stringify({ error: { message: "Forbidden" } }), { status: 403 })
    ),
    /Forbidden/
  );
});

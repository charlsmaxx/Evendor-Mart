import assert from "node:assert/strict";
import test from "node:test";
import {
  ARCHIVE_LISTING_DATA,
  PUBLIC_LISTING_CACHE_KEYS,
  PUBLIC_SEARCH_CACHE_PREFIX,
  archiveAfterDatabaseUpdate,
  isRestorableListingSnapshot,
} from "@/core/admin-engine/archive";

test("archiving unpublishes a listing and removes its featured flag", () => {
  assert.deepEqual(ARCHIVE_LISTING_DATA, { status: "ARCHIVED", featured: false });
});

test("archive cache invalidation follows a successful database transaction", async () => {
  const events: string[] = [];
  const result = await archiveAfterDatabaseUpdate(
    async () => {
      events.push("database-transaction");
      return { archived: true };
    },
    async () => {
      events.push("invalidate-caches");
    }
  );

  assert.deepEqual(result, { archived: true });
  assert.deepEqual(events, ["database-transaction", "invalidate-caches"]);
  assert.ok(PUBLIC_LISTING_CACHE_KEYS.includes("featured:v2:vendors:4"));
  assert.ok(PUBLIC_LISTING_CACHE_KEYS.includes("featured:v2:venues:8"));
  assert.equal(PUBLIC_SEARCH_CACHE_PREFIX, "search:v4:");
});

test("archive cache invalidation does not run after a failed transaction", async () => {
  let invalidated = false;
  await assert.rejects(
    archiveAfterDatabaseUpdate(
      async () => {
        throw new Error("archive transaction failed");
      },
      async () => {
        invalidated = true;
      }
    ),
    /archive transaction failed/
  );
  assert.equal(invalidated, false);
});

test("archive cache invalidation is skipped for a missing or ineligible record", async () => {
  let invalidations = 0;
  await archiveAfterDatabaseUpdate(
    async () => null,
    async () => {
      invalidations += 1;
    },
    Boolean
  );
  await archiveAfterDatabaseUpdate(
    async () => ({ error: "wrong type" }),
    async () => {
      invalidations += 1;
    },
    (result) => !("error" in result)
  );
  assert.equal(invalidations, 0);
});

test("restore snapshots accept only known prior listing states", () => {
  assert.equal(isRestorableListingSnapshot([
    { id: "listing-1", title: "Published service", slug: "published-service", status: "PUBLISHED" },
    { id: "listing-2", title: "Draft service", slug: "draft-service", status: "DRAFT" },
    { id: "listing-3", title: "Pending service", slug: "pending-service", status: "PENDING_REVIEW" },
  ]), true);
  assert.equal(isRestorableListingSnapshot([{ id: "listing-1", title: "Unknown", slug: "unknown", status: "ARCHIVED" }]), false);
  assert.equal(isRestorableListingSnapshot([{ id: "listing-1", title: "Missing status", slug: "missing" }]), false);
});

test("a recorded unpublished state remains unpublished and does not restore featured placement", () => {
  const snapshot = [{ id: "listing-1", title: "Draft", slug: "draft", status: "DRAFT" }];
  assert.equal(isRestorableListingSnapshot(snapshot), true);
  assert.deepEqual({ status: snapshot[0].status, featured: false }, { status: "DRAFT", featured: false });
});

test("restore invalidates public caches only after a successful restore transaction", async () => {
  const events: string[] = [];
  await archiveAfterDatabaseUpdate(
    async () => { events.push("restore-transaction-committed"); return { restored: true }; },
    async () => { events.push("invalidate-search-and-featured-caches"); },
    (result) => result.restored
  );
  assert.deepEqual(events, ["restore-transaction-committed", "invalidate-search-and-featured-caches"]);

  let invalidated = false;
  await assert.rejects(archiveAfterDatabaseUpdate(
    async () => { throw new Error("restore transaction failed"); },
    async () => { invalidated = true; }
  ), /restore transaction failed/);
  assert.equal(invalidated, false);
});

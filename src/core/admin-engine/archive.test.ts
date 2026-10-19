import assert from "node:assert/strict";
import test from "node:test";
import {
  ARCHIVE_LISTING_DATA,
  PUBLIC_LISTING_CACHE_KEYS,
  PUBLIC_SEARCH_CACHE_PREFIX,
  archiveAfterDatabaseUpdate,
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

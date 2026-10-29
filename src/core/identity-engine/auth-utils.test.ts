import assert from "node:assert/strict";
import test from "node:test";
import {
  findByAuthenticatedUserId,
  getAuthenticatedUserId,
  isNextDynamicServerUsageError,
} from "./auth-utils";

test("missing or invalid sessions do not produce an authenticated user ID", () => {
  assert.equal(getAuthenticatedUserId(null), null);
  assert.equal(getAuthenticatedUserId(undefined), null);
  assert.equal(getAuthenticatedUserId({}), null);
  assert.equal(getAuthenticatedUserId({ id: "  " }), null);
});

test("a valid session retains its user ID", () => {
  assert.equal(getAuthenticatedUserId({ id: "user-123" }), "user-123");
});

test("vendor lookup skips Prisma when the user ID is missing and queries for a valid ID", async () => {
  const queriedIds: string[] = [];
  const lookup = async (userId: string) => {
    queriedIds.push(userId);
    return { id: "vendor-1", userId };
  };

  assert.equal(await findByAuthenticatedUserId(undefined, lookup), null);
  assert.deepEqual(queriedIds, []);

  assert.deepEqual(await findByAuthenticatedUserId("user-123", lookup), {
    id: "vendor-1",
    userId: "user-123",
  });
  assert.deepEqual(queriedIds, ["user-123"]);
});

test("Next dynamic-render signals are distinguished from ordinary auth errors", () => {
  assert.equal(isNextDynamicServerUsageError({ digest: "DYNAMIC_SERVER_USAGE" }), true);
  assert.equal(isNextDynamicServerUsageError(new Error("invalid credentials")), false);
});

import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

function isRedisConfigured() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return false;
  if (
    url.includes("xxx.upstash.io") ||
    url.includes("your-") ||
    token === "your-token" ||
    token.startsWith("your-")
  ) {
    return false;
  }
  return true;
}

export function getRedis() {
  if (!isRedisConfigured()) {
    return null;
  }
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redis;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;
  try {
    return (await client.get<T>(key)) ?? null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 60) {
  const client = getRedis();
  if (!client) return;
  try {
    await client.set(key, value, { ex: ttlSeconds });
  } catch {
    /* noop */
  }
}

export async function cacheDelete(key: string): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    await client.del(key);
  } catch {
    /* noop */
  }
}

/** Delete only keys in a namespaced cache; useful when query keys contain hashes. */
export async function cacheDeletePrefix(prefix: string): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await client.scan(cursor, { match: `${prefix}*`, count: 100 });
      if (keys.length) await client.del(...keys);
      cursor = nextCursor;
    } while (cursor !== "0");
  } catch {
    /* Cache invalidation must not fail the database mutation. */
  }
}

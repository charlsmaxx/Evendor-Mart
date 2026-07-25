import "server-only";

import { unstable_cache } from "next/cache";
import { cacheGet, cacheSet } from "@/lib/redis";
import { CACHE_TTL } from "@/lib/cache-policy";

/** Redis-backed cache with loader fallback (no-op when Redis unavailable). */
export async function cacheGetOrSet<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;
  const value = await loader();
  await cacheSet(key, value, ttlSeconds);
  return value;
}

/** Next.js ISR wrapper for slug-scoped public reads. */
export function createCachedByKey<T>(
  namespace: string,
  revalidateSeconds: number,
  tags: string[],
  loader: (key: string) => Promise<T | null>
) {
  return (key: string) =>
    unstable_cache(() => loader(key), [namespace, key], {
      revalidate: revalidateSeconds,
      tags: [...tags, `${namespace}:${key}`],
    })();
}

export { CACHE_TTL };

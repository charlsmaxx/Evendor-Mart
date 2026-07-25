import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

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

function createLimiter(requests: number, window: `${number} s` | `${number} m`) {
  if (!isRedisConfigured()) return null;
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
  });
}

export const authLimiter = createLimiter(10, "1 m");
export const apiLimiter = createLimiter(60, "1 m");
export const searchLimiter = createLimiter(30, "1 m");
export const messageLimiter = createLimiter(20, "1 m");

export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ success: boolean }> {
  if (!limiter) return { success: true };
  try {
    const { success } = await limiter.limit(identifier);
    return { success };
  } catch {
    return { success: true };
  }
}

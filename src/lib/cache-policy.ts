/** Central TTL + HTTP cache policy — public reads may cache; auth/payments must not. */

export const CACHE_TTL = {
  /** Homepage featured vendors + marketing blocks */
  featured: 300,
  /** Marketplace search (Redis) */
  search: 60,
  /** Admin control center aggregates */
  adminDashboard: 90,
  /** Admin analytics charts */
  adminAnalytics: 120,
  /** Public listing detail ISR */
  publicListing: 120,
  /** Public vendor profile ISR */
  publicVendor: 180,
  compare: 60,
  suggestions: 60,
  banks: 3600,
} as const;

export const HTTP_CACHE = {
  publicShort: {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
  },
  publicMedium: {
    "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
  },
  privateNoStore: {
    "Cache-Control": "private, no-store, max-age=0, must-revalidate",
    Pragma: "no-cache",
  },
} as const;

/** Path prefixes that must never be edge-cached (payments, auth, user data). */
export const NO_STORE_API_PREFIXES = [
  "/api/auth",
  "/api/me",
  "/api/payments",
  "/api/bookings",
  "/api/messages",
  "/api/favorites",
  "/api/rewards",
  "/api/subscriptions",
  "/api/webhooks",
  "/api/onboarding",
  "/api/admin",
  "/api/vendor",
] as const;

export function shouldUseNoStoreApiPath(pathname: string): boolean {
  return NO_STORE_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

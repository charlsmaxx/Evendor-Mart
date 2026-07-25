import "server-only";

import { cacheGetOrSet } from "@/lib/server-cache";
import { CACHE_TTL } from "@/lib/cache-policy";
import { loadAdminAnalyticsData, loadAdminDashboardData } from "./platform-stats";

const DASHBOARD_CACHE_KEY = "admin:dashboard:v2";
const ANALYTICS_CACHE_KEY = "admin:analytics:v2";

/** Cached platform aggregates — sanitize per admin role after fetch. */
export async function getCachedAdminDashboardData() {
  return cacheGetOrSet(DASHBOARD_CACHE_KEY, CACHE_TTL.adminDashboard, loadAdminDashboardData);
}

export async function getCachedAdminAnalyticsData() {
  return cacheGetOrSet(ANALYTICS_CACHE_KEY, CACHE_TTL.adminAnalytics, loadAdminAnalyticsData);
}

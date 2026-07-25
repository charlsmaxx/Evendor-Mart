/**
 * Client-safe subscription types and constants.
 * No Prisma or server-only imports here.
 */

export type PremiumFeature =
  | "manual_booking"
  | "crm"
  | "staff"
  | "advanced_analytics"
  | "exports"
  | "business_reports"
  | "advanced_calendar"
  | "priority_support";

export const PREMIUM_FEATURE_LABELS: Record<PremiumFeature, string> = {
  manual_booking: "Manual Bookings",
  crm: "Customer CRM",
  staff: "Staff Accounts",
  advanced_analytics: "Advanced Analytics",
  exports: "Export Reports",
  business_reports: "Business Reports",
  advanced_calendar: "Advanced Calendar",
  priority_support: "Priority Support",
};

const PREMIUM_FEATURES = new Set<PremiumFeature>([
  "manual_booking",
  "crm",
  "staff",
  "advanced_analytics",
  "exports",
  "business_reports",
  "advanced_calendar",
  "priority_support",
]);

export class PremiumRequiredError extends Error {
  feature: PremiumFeature;
  constructor(feature: PremiumFeature) {
    super("PREMIUM_REQUIRED");
    this.name = "PremiumRequiredError";
    this.feature = feature;
  }
}

export function isPremiumFeature(feature: string): feature is PremiumFeature {
  return PREMIUM_FEATURES.has(feature as PremiumFeature);
}

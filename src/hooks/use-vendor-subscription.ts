"use client";

import { useQuery } from "@tanstack/react-query";
import type { PremiumFeature } from "@/core/subscription-engine/types";

export type VendorSubscriptionStatus = {
  tier: "FREE" | "PREMIUM";
  isPremium: boolean;
  currentPeriodEnd: string | null;
  hasPremiumBadge: boolean;
  hasPriorityRanking: boolean;
};

export function useVendorSubscription() {
  return useQuery({
    queryKey: ["vendor-subscription"],
    queryFn: async () => {
      const res = await fetch("/api/vendor/subscription/status", { credentials: "same-origin" });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data as VendorSubscriptionStatus;
    },
    staleTime: 60_000,
  });
}

export const PREMIUM_BENEFITS: { title: string; desc: string }[] = [
  { title: "Manual Bookings", desc: "Record walk-ins, phone & WhatsApp clients in one calendar." },
  { title: "Customer CRM", desc: "Track spend, history, notes, and repeat clients." },
  { title: "Staff Accounts", desc: "Invite managers and reception with role-based access." },
  { title: "Advanced Analytics", desc: "Marketplace vs manual revenue, occupancy, and trends." },
  { title: "Export Reports", desc: "Download bookings, customers, and revenue as CSV." },
  { title: "Priority Ranking", desc: "Stand out in marketplace search with a Premium badge." },
];

export const FEATURE_HEADLINES: Partial<Record<PremiumFeature, string>> = {
  manual_booking: "Record offline bookings",
  crm: "Manage your customer database",
  staff: "Invite your team",
  advanced_analytics: "Unlock business insights",
  exports: "Export your data",
  business_reports: "Generate business reports",
  advanced_calendar: "Advanced calendar tools",
  priority_support: "Get priority support",
};

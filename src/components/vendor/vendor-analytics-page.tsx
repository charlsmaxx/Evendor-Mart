"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Crown, Download, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { parseApiResponse } from "@/lib/parse-api-response";
import { VendorPageHeader, VendorSection, VendorSkeleton } from "@/components/vendor/vendor-ui";
import { PremiumUpgradeModal } from "@/components/vendor/premium-upgrade-modal";
import { useVendorSubscription } from "@/hooks/use-vendor-subscription";
import { Button } from "@/components/ui/button";

type AnalyticsData = {
  revenue: {
    marketplaceTotal: number;
    manualTotal: number;
    marketplaceMonth: number;
    manualMonth: number;
  };
  bookings: { marketplaceCount: number; manualCount: number };
  customers: { total: number; repeatRate: number };
  monthlyTrend: {
    label: string;
    marketplaceRevenue: number;
    manualRevenue: number;
  }[];
};

export function VendorAnalyticsPage() {
  const { data: sub } = useVendorSubscription();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const isPremium = sub?.isPremium ?? false;

  const { data, isLoading } = useQuery({
    queryKey: ["vendor-analytics"],
    queryFn: async () => {
      const res = await fetch("/api/vendor/analytics", { credentials: "same-origin" });
      if (res.status === 402) {
        setUpgradeOpen(true);
        throw new Error("Premium required");
      }
      const parsed = await parseApiResponse<AnalyticsData>(res);
      if (!parsed.ok) throw new Error(parsed.message);
      return parsed.data;
    },
    enabled: isPremium,
  });

  if (!isPremium) {
    return (
      <div className="space-y-6">
        <VendorPageHeader title="Business Analytics" subtitle="Marketplace vs manual — revenue, trends, and growth." />
        <Button variant="gradient" className="gap-2" onClick={() => setUpgradeOpen(true)}>
          <Crown className="h-4 w-4" /> Upgrade to Premium
        </Button>
        <PremiumUpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} feature="advanced_analytics" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <VendorPageHeader title="Business Analytics" subtitle="Marketplace vs manual performance." />
        <Button variant="outline" size="sm" className="gap-2" asChild>
          <a href="/api/vendor/exports?type=bookings&format=csv" download>
            <Download className="h-4 w-4" /> Export CSV
          </a>
        </Button>
      </div>
      {isLoading && <VendorSkeleton rows={2} />}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Marketplace revenue</p>
              <p className="mt-1 text-xl font-bold">{formatCurrency(data.revenue.marketplaceTotal)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Manual revenue</p>
              <p className="mt-1 text-xl font-bold">{formatCurrency(data.revenue.manualTotal)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">CRM customers</p>
              <p className="mt-1 text-xl font-bold">{data.customers.total}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Repeat rate</p>
              <p className="mt-1 text-xl font-bold">{data.customers.repeatRate}%</p>
            </div>
          </div>
          <VendorSection title="Revenue trend">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="text-sm text-muted-foreground">Combined monthly (marketplace + manual in chart as total)</p>
            </div>
            <div className="space-y-2">
              {data.monthlyTrend.map((m) => (
                <div key={m.label} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <span className="font-medium">{m.label}</span>
                  <span>
                    {formatCurrency(m.marketplaceRevenue + m.manualRevenue)}
                    <span className="ml-2 text-xs text-muted-foreground">
                      (MP {formatCurrency(m.marketplaceRevenue)} · Manual {formatCurrency(m.manualRevenue)})
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </VendorSection>
        </>
      )}
    </div>
  );
}

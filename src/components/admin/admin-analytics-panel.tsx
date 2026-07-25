"use client";

import { useQuery } from "@tanstack/react-query";
import { TrendingUp, MapPin, Star, Repeat } from "lucide-react";
import { AdminBarChart, AdminPageHeader } from "@/components/admin/admin-ui";

type AnalyticsData = {
  revenueTrend: { label: string; value: number }[];
  bookingTrend: { label: string; value: number }[];
  cityPerformance: { city: string; listings: number }[];
  topVendors: {
    id: string;
    businessName: string;
    ratingAvg: number;
    reviewCount: number;
    verified: boolean;
    _count: { bookings: number };
  }[];
  disputeTrend: { label: string; value: number }[];
  verification: { pending: number; approved: number; rejected: number; verifiedVendors: number };
  repeatCustomerRate: number;
};

export function AdminAnalyticsPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async () => (await fetch("/api/admin/analytics")).json().then((j) => j.data as AnalyticsData),
  });

  if (isLoading || !data) {
    return <div className="h-96 animate-pulse rounded-2xl bg-white/5" />;
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Analytics"
        subtitle="Revenue, bookings, cities, vendors, and platform growth insights."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Repeat Customers", value: `${data.repeatCustomerRate}%`, icon: Repeat },
          { label: "Verified Vendors", value: data.verification.verifiedVendors, icon: Star },
          { label: "Pending Verifications", value: data.verification.pending, icon: TrendingUp },
          { label: "Cities Active", value: data.cityPerformance.length, icon: MapPin },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-[#1a1215]/60 p-5">
            <s.icon className="h-4 w-4 text-[#7A2E3D]" />
            <p className="mt-2 font-display text-2xl font-bold text-[#E5DFD9]">{s.value}</p>
            <p className="text-xs text-[#E5DFD9]/40">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-[#1a1215]/60 p-5">
          <p className="mb-4 font-semibold text-[#E5DFD9]">Revenue Trend (6 mo)</p>
          <AdminBarChart data={data.revenueTrend} />
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#1a1215]/60 p-5">
          <p className="mb-4 font-semibold text-[#E5DFD9]">Booking Trend (6 mo)</p>
          <AdminBarChart data={data.bookingTrend} color="#E5DFD9" />
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#1a1215]/60 p-5">
          <p className="mb-4 font-semibold text-[#E5DFD9]">Dispute Trend (6 mo)</p>
          <AdminBarChart data={data.disputeTrend} color="#ef4444" />
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#1a1215]/60 p-5">
          <p className="mb-4 font-semibold text-[#E5DFD9]">Top Cities</p>
          <div className="space-y-2">
            {data.cityPerformance.map((c) => (
              <div key={c.city} className="flex items-center justify-between text-sm">
                <span className="text-[#E5DFD9]/70">{c.city}</span>
                <span className="text-[#E5DFD9]/40">{c.listings} listings</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#1a1215]/60 p-5">
        <p className="mb-4 font-semibold text-[#E5DFD9]">Top Performing Vendors</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {data.topVendors.map((v) => (
            <div key={v.id} className="flex items-center justify-between rounded-xl border border-white/5 px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-[#E5DFD9]">{v.businessName}</p>
                <p className="text-xs text-[#E5DFD9]/40">
                  {v.ratingAvg.toFixed(1)} ★ · {v._count.bookings} bookings
                </p>
              </div>
              {v.verified && <span className="text-[10px] text-emerald-400">✓ Verified</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { format } from "date-fns";
import {
  TrendingUp,
  Wallet,
  Lock,
  Gift,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { VendorPageHeader, VendorSummaryCard, VendorSection, VendorSkeleton } from "@/components/vendor/vendor-ui";

type RevenueData = {
  monthlyRevenue: { label: string; revenue: number }[];
  weeklyRevenue: { label: string; revenue: number }[];
  dailyRevenue: { label: string; date: string; revenue: number }[];
  totalRevenue: number;
  availableBalance: number;
  pendingEarnings: number;
  escrowBalance: number;
  pendingRelease: number;
  withdrawnAmount: number;
  monthEarnings: number;
  yearEarnings: number;
  completedBookings: number;
  cancelledBookings: number;
  rewardSubsidy: number;
  bookingGrowthPct: number | null;
  conversionRate: number;
  payouts: {
    id: string;
    reference: string;
    amount: number;
    status: string;
    processedAt: string | null;
    createdAt: string;
    bookingTitle: string;
  }[];
};

export default function VendorRevenuePage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["vendor-revenue"],
    queryFn: async () => {
      const res = await fetch("/api/vendor/revenue");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message);
      return json.data as RevenueData;
    },
  });

  if (isLoading) return <VendorSkeleton rows={2} />;
  if (isError || !data) {
    return (
      <div>
        <VendorPageHeader title="Revenue Center" subtitle="Track earnings and payouts." />
      </div>
    );
  }

  const revenue = data;
  const maxMonthly = Math.max(...revenue.monthlyRevenue.map((m) => m.revenue), 1);
  const maxWeekly = Math.max(...revenue.weeklyRevenue.map((m) => m.revenue), 1);
  const maxDaily = Math.max(...(revenue.dailyRevenue ?? []).map((m) => m.revenue), 1);

  function exportCsv() {
    const rows = [
      ["Period", "Date", "Revenue (NGN)"],
      ...revenue.monthlyRevenue.map((m) => ["Month", m.label, String(m.revenue)]),
      ...(revenue.dailyRevenue ?? []).map((d) => ["Day", d.date, String(d.revenue)]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `evendor-revenue-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <VendorPageHeader
        title="Revenue Center"
        subtitle="Earnings, escrow, and payout history in one place."
        action={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-1 rounded-xl border border-border px-4 py-2 text-sm font-medium"
            >
              Export CSV
            </button>
            <Link
              href="/vendor/payouts"
              className="inline-flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Withdraw <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <VendorSummaryCard label="Available Balance" value={formatCurrency(data.availableBalance)} accent icon={Wallet} href="/vendor/payouts" />
        <VendorSummaryCard label="Pending Earnings" value={formatCurrency(data.pendingEarnings)} sub="In escrow" icon={Lock} />
        <VendorSummaryCard label="This Month" value={formatCurrency(data.monthEarnings)} icon={TrendingUp} accent />
        <VendorSummaryCard label="Total Revenue" value={formatCurrency(data.totalRevenue)} sub={`${data.completedBookings} completed`} icon={TrendingUp} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/80 bg-card/60 p-4 backdrop-blur-sm">
          <p className="text-sm text-muted-foreground">Escrow Balance</p>
          <p className="mt-1 text-xl font-bold">{formatCurrency(data.escrowBalance)}</p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card/60 p-4 backdrop-blur-sm">
          <p className="text-sm text-muted-foreground">Withdrawn</p>
          <p className="mt-1 text-xl font-bold">{formatCurrency(data.withdrawnAmount)}</p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card/60 p-4 backdrop-blur-sm">
          <p className="text-sm text-muted-foreground">Conversion Rate</p>
          <p className="mt-1 text-xl font-bold">{data.conversionRate}%</p>
          {data.bookingGrowthPct !== null && (
            <p className="text-xs text-muted-foreground">{data.bookingGrowthPct >= 0 ? "+" : ""}{data.bookingGrowthPct}% bookings vs last month</p>
          )}
        </div>
      </div>

      <VendorSection title="Daily Revenue (last 14 days)">
        <div className="flex h-32 items-end gap-1 overflow-x-auto">
          {(data.dailyRevenue ?? []).map((d) => (
            <div key={d.date} className="flex min-w-[28px] flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t-lg bg-primary/60"
                style={{ height: `${Math.max(4, (d.revenue / maxDaily) * 100)}%` }}
                title={formatCurrency(d.revenue)}
              />
              <span className="text-[9px] text-muted-foreground">{d.label}</span>
            </div>
          ))}
        </div>
      </VendorSection>

      <div className="grid gap-6 lg:grid-cols-2">
        <VendorSection title="Monthly Revenue">
          <div className="flex h-40 items-end gap-2">
            {data.monthlyRevenue.map((m) => (
              <div key={m.label} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-lg bg-primary/80"
                  style={{ height: `${Math.max(4, (m.revenue / maxMonthly) * 100)}%` }}
                  title={formatCurrency(m.revenue)}
                />
                <span className="text-[10px] text-muted-foreground">{m.label}</span>
              </div>
            ))}
          </div>
        </VendorSection>

        <VendorSection title="Weekly Revenue">
          <div className="flex h-40 items-end gap-2">
            {data.weeklyRevenue.map((m) => (
              <div key={m.label} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-lg bg-primary/50"
                  style={{ height: `${Math.max(4, (m.revenue / maxWeekly) * 100)}%` }}
                  title={formatCurrency(m.revenue)}
                />
                <span className="text-[10px] text-muted-foreground">{m.label}</span>
              </div>
            ))}
          </div>
        </VendorSection>
      </div>

      <VendorSection title="Recent Payouts" href="/vendor/payouts">
        {data.payouts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No payouts yet.</p>
        ) : (
          <div className="space-y-2">
            {data.payouts.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-border/60 p-3 text-sm">
                <div>
                  <p className="font-medium">{p.bookingTitle}</p>
                  <p className="text-xs text-muted-foreground">{p.reference} · {format(new Date(p.createdAt), "MMM d, yyyy")}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary">{formatCurrency(p.amount)}</p>
                  <p className="text-xs capitalize text-muted-foreground">{p.status.toLowerCase()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </VendorSection>

      {data.rewardSubsidy > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary">
          <Gift className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            Platform subsidised <strong>{formatCurrency(data.rewardSubsidy)}</strong> in Evendor Rewards — your payout remains unchanged.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-2xl border border-border/80 p-4">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          <div>
            <p className="text-2xl font-bold">{data.completedBookings}</p>
            <p className="text-sm text-muted-foreground">Completed Events</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border/80 p-4">
          <XCircle className="h-8 w-8 text-red-500" />
          <div>
            <p className="text-2xl font-bold">{data.cancelledBookings}</p>
            <p className="text-sm text-muted-foreground">Cancelled / Declined</p>
          </div>
        </div>
      </div>
    </div>
  );
}

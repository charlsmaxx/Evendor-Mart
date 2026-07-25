"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  TrendingUp,
  Lock,
  CheckCircle2,
  Calendar,
  BadgeCheck,
  ShieldAlert,
  Users,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { healthLabel } from "@/lib/admin-dashboard";
import {
  AdminKpiCard,
  AdminHealthRing,
  AdminBarChart,
  AdminPageHeader,
} from "@/components/admin/admin-ui";
import { AdminActivityPanel } from "@/components/admin/admin-activity-panel";
import { useAdminSessionGuard } from "@/components/admin/use-admin-me";
import type { AdminSection } from "@/lib/admin-permissions";

type DashboardData = {
  capabilities?: { revenue: boolean; escrow: boolean };
  kpis: {
    totalRevenue?: number;
    escrowHeld?: number;
    completedBookings: number;
    activeBookings: number;
    pendingVerifications: number;
    openDisputes: number;
    activeUsers: number;
    healthScore: number;
    pendingPayoutAmount: number;
    failedPayments: number;
    rewardLiability: number;
    revenueGrowth?: number | null;
  };
  health: { score: number; bookingSuccessRate: number; disputeRate: number; verificationRate: number };
  revenueTrend: { label: string; revenue: number; bookings: number }[];
  recentBookings: {
    id: string;
    status: string;
    totalAmount: number;
    customerName: string | null;
    listingTitle: string;
    vendorName: string;
    createdAt: string;
  }[];
  alerts: { type: string; severity: string; message: string }[];
};

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "text-emerald-400",
  COMPLETED: "text-emerald-400",
  RESERVED: "text-amber-400",
  PENDING_PAYMENT: "text-amber-400",
  CANCELLED: "text-red-400",
  EXPIRED: "text-[#E5DFD9]/40",
};

export function AdminDashboardHome() {
  const { isAdminReady, allowedSections } = useAdminSessionGuard();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/admin/dashboard", { credentials: "same-origin" });
      const json = await res.json();
      if (res.status === 401) return null;
      if (!res.ok) throw new Error(json.error?.message ?? "Failed to load dashboard");
      if (json.data == null) throw new Error("Dashboard data missing");
      return json.data as DashboardData;
    },
    enabled: isAdminReady,
    refetchInterval: isAdminReady ? 30_000 : false,
    retry: false,
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-64 rounded-lg bg-white/5" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  const { kpis, health, revenueTrend, recentBookings, alerts } = data;
  const healthInfo = healthLabel(health.score);
  const showRevenue = data.capabilities?.revenue ?? allowedSections.has("analytics");
  const showEscrow = data.capabilities?.escrow ?? allowedSections.has("escrow");
  const showRewards = allowedSections.has("rewards");

  const quickActions = (
    [
      { href: "/admin/escrow", icon: Lock, label: "Escrow & Payouts", section: "escrow" },
      { href: "/admin/trust", icon: ShieldAlert, label: "Trust & Safety", section: "trust" },
      { href: "/admin/verification", icon: BadgeCheck, label: "Verifications", section: "verification" },
      { href: "/admin/users", icon: Users, label: "User Management", section: "users" },
      { href: "/admin/trust", icon: CheckCircle2, label: "Resolve Disputes", section: "trust" },
      { href: "/admin/analytics", icon: TrendingUp, label: "Analytics", section: "analytics" },
    ] satisfies Array<{
      href: string;
      icon: typeof Lock;
      label: string;
      section: AdminSection;
    }>
  ).filter((item) => allowedSections.has(item.section));

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Control Center"
        subtitle={
          showRevenue || showEscrow
            ? "Platform health at a glance — revenue, bookings, trust, and growth."
            : "Platform health at a glance — bookings, trust, and operations."
        }
      />

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {a.message}
            </div>
          ))}
        </div>
      )}

      {/* Health + KPI grid */}
      <div className="grid gap-6 lg:grid-cols-[140px_1fr]">
        <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-[#1a1215]/60 p-6">
          <AdminHealthRing score={health.score} label={healthInfo.label} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {showRevenue && kpis.totalRevenue != null && (
            <AdminKpiCard
              label="Total Revenue"
              value={formatCurrency(kpis.totalRevenue)}
              sub={
                kpis.revenueGrowth != null
                  ? `${kpis.revenueGrowth >= 0 ? "+" : ""}${kpis.revenueGrowth}% this month`
                  : "All time"
              }
              href="/admin/analytics"
              accent
              highlight="primary"
            />
          )}
          {showEscrow && kpis.escrowHeld != null && (
            <AdminKpiCard
              label="Held In Escrow"
              value={formatCurrency(kpis.escrowHeld)}
              sub="Funds protected"
              href="/admin/escrow"
              highlight="amber"
            />
          )}
          <AdminKpiCard
            label="Completed Bookings"
            value={kpis.completedBookings}
            sub={`${health.bookingSuccessRate}% success rate`}
            href="/admin/bookings?status=COMPLETED"
            highlight="green"
          />
          <AdminKpiCard
            label="Active Bookings"
            value={kpis.activeBookings}
            sub="In progress or pending"
            href="/admin/bookings"
          />
          <AdminKpiCard
            label="Pending Verifications"
            value={kpis.pendingVerifications}
            sub="Awaiting review"
            href="/admin/verification"
            highlight={kpis.pendingVerifications > 0 ? "amber" : undefined}
          />
          <AdminKpiCard
            label="Open Disputes"
            value={kpis.openDisputes}
            sub={`${health.disputeRate}% dispute rate`}
            href="/admin/trust"
            highlight={kpis.openDisputes > 0 ? "red" : undefined}
          />
          <AdminKpiCard
            label="Active Users"
            value={kpis.activeUsers}
            sub="Registered accounts"
            href="/admin/users"
          />
          {showRewards && (
            <AdminKpiCard
              label="Rewards Liability"
              value={formatCurrency(kpis.rewardLiability)}
              sub="Outstanding balance"
              href="/admin/rewards"
            />
          )}
        </div>
      </div>

      {/* Charts row */}
      <div className={`grid gap-6 ${showRevenue ? "lg:grid-cols-2" : ""}`}>
        {showRevenue && (
          <div className="rounded-2xl border border-white/10 bg-[#1a1215]/60 p-5">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#7A2E3D]" />
              <p className="font-semibold text-[#E5DFD9]">Revenue Trend</p>
            </div>
            <AdminBarChart
              data={revenueTrend.map((r) => ({ label: r.label, value: r.revenue }))}
            />
          </div>
        )}
        <div className="rounded-2xl border border-white/10 bg-[#1a1215]/60 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#7A2E3D]" />
            <p className="font-semibold text-[#E5DFD9]">Booking Volume</p>
          </div>
          <AdminBarChart
            data={revenueTrend.map((r) => ({ label: r.label, value: r.bookings }))}
            color="#E5DFD9"
          />
        </div>
      </div>

      {/* Recent bookings + mobile activity */}
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-[#1a1215]/60 p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-semibold text-[#E5DFD9]">Recent Bookings</p>
            <Link href="/admin/bookings" className="text-xs text-[#7A2E3D] hover:underline">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {recentBookings.map((b) => (
              <Link
                key={b.id}
                href={`/admin/bookings?id=${b.id}`}
                className="flex items-center gap-3 rounded-xl border border-white/5 px-3 py-2.5 transition hover:bg-white/[0.04]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#E5DFD9]">{b.listingTitle}</p>
                  <p className="truncate text-xs text-[#E5DFD9]/40">
                    {b.customerName ?? "Customer"} · {b.vendorName}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-[#E5DFD9]/80">{formatCurrency(b.totalAmount)}</p>
                  <p className={`text-[10px] font-medium ${STATUS_COLORS[b.status] ?? "text-[#E5DFD9]/40"}`}>
                    {b.status.replace("_", " ")}
                  </p>
                </div>
              </Link>
            ))}
            {recentBookings.length === 0 && (
              <p className="text-sm text-[#E5DFD9]/40">No bookings yet.</p>
            )}
          </div>
        </div>

        {/* Activity on tablet/mobile where right panel is hidden */}
        <div className="xl:hidden">
          <AdminActivityPanel compact />
        </div>

        {/* Quick links */}
        <div className="hidden rounded-2xl border border-white/10 bg-[#1a1215]/60 p-5 xl:block">
          <p className="mb-4 font-semibold text-[#E5DFD9]">Quick Actions</p>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((item) => (
              <Link
                key={item.href + item.label}
                href={item.href}
                className="flex items-center gap-2 rounded-xl border border-white/5 px-3 py-3 text-sm text-[#E5DFD9]/70 transition hover:border-[#7A2E3D]/30 hover:bg-[#7A2E3D]/10 hover:text-[#E5DFD9]"
              >
                <item.icon className="h-4 w-4 text-[#7A2E3D]" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

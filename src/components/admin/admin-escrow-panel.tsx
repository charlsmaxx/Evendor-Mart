"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Lock, ArrowUpRight, ArrowDownLeft, AlertTriangle, Landmark, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AdminKpiCard, AdminPageHeader } from "@/components/admin/admin-ui";

type EscrowData = {
  escrowBalance: number;
  escrowCount: number;
  pendingPayouts: {
    id: string;
    amount: number;
    status: string;
    vendor: { businessName: string };
    booking: { listing: { title: string }; eventDate: string };
  }[];
  releasedTotal: number;
  releasedCount: number;
  disputedFunds: number;
  disputedCount: number;
  failedPayments: {
    id: string;
    amount: number;
    booking: { listing: { title: string }; customer: { fullName?: string } };
  }[];
  recentPayments: {
    id: string;
    amount: number;
    status: string;
    escrowStatus: string;
    listingTitle: string;
    customerName?: string;
    createdAt: string;
  }[];
  recentPayouts: {
    id: string;
    amount: number;
    status: string;
    reference: string;
    vendorName: string;
    listingTitle: string;
    createdAt: string;
  }[];
};

type WithdrawalRow = {
  id: string;
  amount: number;
  status: string;
  reference: string;
  bankName: string | null;
  accountNumberLast4: string | null;
  failureReason: string | null;
  attempts: number;
  createdAt: string;
  vendor: { id: string; businessName: string };
};

type WithdrawalsData = {
  withdrawals: WithdrawalRow[];
  totals: Record<string, { count: number; amount: number }>;
  paystackConfigured: boolean;
  liveMode: boolean;
};

export function AdminEscrowPanel() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-escrow"],
    queryFn: async () => (await fetch("/api/admin/escrow")).json().then((j) => j.data as EscrowData),
    refetchInterval: 30_000,
  });

  const withdrawals = useQuery({
    queryKey: ["admin-withdrawals"],
    queryFn: async () =>
      (await fetch("/api/admin/withdrawals")).json().then((j) => j.data as WithdrawalsData),
    refetchInterval: 30_000,
  });

  const retry = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/withdrawals/${id}/retry`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Retry failed");
      return json.data;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin-withdrawals"] }),
  });

  if (isLoading || !data) {
    return <div className="h-96 animate-pulse rounded-2xl bg-white/5" />;
  }

  const failedWithdrawals =
    withdrawals.data?.withdrawals.filter(
      (w) => w.status === "FAILED" || w.status === "REVERSED"
    ) ?? [];
  const inFlightWithdrawals =
    withdrawals.data?.withdrawals.filter(
      (w) => w.status === "PENDING" || w.status === "PROCESSING"
    ) ?? [];

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Escrow & Payments"
        subtitle="All customer funds flow through Evendor escrow. Vendors receive payout after event completion."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminKpiCard label="Escrow Balance" value={formatCurrency(data.escrowBalance)} sub={`${data.escrowCount} held payments`} href="/admin/escrow" accent highlight="amber" />
        <AdminKpiCard label="Pending Payouts" value={data.pendingPayouts.length} sub="Awaiting release" href="/admin/escrow" highlight="primary" />
        <AdminKpiCard label="Released Payouts" value={formatCurrency(data.releasedTotal)} sub={`${data.releasedCount} processed`} href="/admin/escrow" highlight="green" />
        <AdminKpiCard label="Disputed Funds" value={formatCurrency(data.disputedFunds)} sub={`${data.disputedCount} locked`} href="/admin/trust" highlight="red" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending payouts */}
        <section className="rounded-2xl border border-white/10 bg-[#1a1215]/60 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-400" />
            <p className="font-semibold text-[#E5DFD9]">Pending Payouts</p>
          </div>
          <div className="space-y-2">
            {data.pendingPayouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-white/5 px-3 py-2.5">
                <div>
                  <p className="text-sm text-[#E5DFD9]">{p.booking.listing.title}</p>
                  <p className="text-xs text-[#E5DFD9]/40">{p.vendor.businessName}</p>
                </div>
                <p className="font-semibold text-amber-300">{formatCurrency(p.amount)}</p>
              </div>
            ))}
            {data.pendingPayouts.length === 0 && (
              <p className="text-sm text-[#E5DFD9]/40">No pending payouts.</p>
            )}
          </div>
        </section>

        {/* Failed payments */}
        <section className="rounded-2xl border border-white/10 bg-[#1a1215]/60 p-5">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <p className="font-semibold text-[#E5DFD9]">Failed Payments</p>
          </div>
          <div className="space-y-2">
            {data.failedPayments.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-red-500/10 bg-red-500/5 px-3 py-2.5">
                <div>
                  <p className="text-sm text-[#E5DFD9]">{p.booking.listing.title}</p>
                  <p className="text-xs text-[#E5DFD9]/40">{p.booking.customer.fullName ?? "Customer"}</p>
                </div>
                <p className="font-semibold text-red-300">{formatCurrency(p.amount)}</p>
              </div>
            ))}
            {data.failedPayments.length === 0 && (
              <p className="text-sm text-[#E5DFD9]/40">No failed payments.</p>
            )}
          </div>
        </section>
      </div>

      {/* Vendor bank transfers */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-[#1a1215]/60 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <p className="font-semibold text-[#E5DFD9]">Failed Withdrawals</p>
            </div>
            {withdrawals.data && !withdrawals.data.liveMode && (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-300">
                Paystack test mode
              </span>
            )}
          </div>
          <div className="space-y-2">
            {failedWithdrawals.map((w) => (
              <div
                key={w.id}
                className="rounded-xl border border-red-500/10 bg-red-500/5 px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-[#E5DFD9]">{w.vendor.businessName}</p>
                    <p className="text-xs text-[#E5DFD9]/40">
                      {w.bankName ?? "Bank"}
                      {w.accountNumberLast4 ? ` ••••${w.accountNumberLast4}` : ""} ·{" "}
                      {w.attempts} attempt{w.attempts === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <p className="font-semibold text-red-300">{formatCurrency(w.amount)}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      disabled={retry.isPending}
                      onClick={() => retry.mutate(w.id)}
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Retry
                    </Button>
                  </div>
                </div>
                {w.failureReason && (
                  <p className="mt-1.5 text-xs text-red-300/70">{w.failureReason}</p>
                )}
              </div>
            ))}
            {failedWithdrawals.length === 0 && (
              <p className="text-sm text-[#E5DFD9]/40">No failed withdrawals.</p>
            )}
            {retry.error && (
              <p className="text-xs text-red-300">{(retry.error as Error).message}</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#1a1215]/60 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Landmark className="h-4 w-4 text-emerald-400" />
            <p className="font-semibold text-[#E5DFD9]">Withdrawals In Transit</p>
          </div>
          <div className="space-y-2">
            {inFlightWithdrawals.map((w) => (
              <div key={w.id} className="flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <p className="truncate text-[#E5DFD9]/80">{w.vendor.businessName}</p>
                  <p className="text-[10px] text-[#E5DFD9]/30">
                    {format(new Date(w.createdAt), "MMM d, HH:mm")} · {w.status.toLowerCase()}
                  </p>
                </div>
                <span className="font-medium text-emerald-400">{formatCurrency(w.amount)}</span>
              </div>
            ))}
            {inFlightWithdrawals.length === 0 && (
              <p className="text-sm text-[#E5DFD9]/40">Nothing in transit.</p>
            )}
          </div>
        </section>
      </div>

      {/* Transaction feeds */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-[#1a1215]/60 p-5">
          <div className="mb-4 flex items-center gap-2">
            <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
            <p className="font-semibold text-[#E5DFD9]">Recent Payments In</p>
          </div>
          <div className="space-y-2">
            {data.recentPayments.slice(0, 8).map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-[#E5DFD9]/80">{p.listingTitle}</p>
                  <p className="text-[10px] text-[#E5DFD9]/30">
                    {format(new Date(p.createdAt), "MMM d, HH:mm")} · {p.escrowStatus}
                  </p>
                </div>
                <span className="font-medium text-emerald-400">+{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#1a1215]/60 p-5">
          <div className="mb-4 flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-[#7A2E3D]" />
            <p className="font-semibold text-[#E5DFD9]">Recent Payouts Out</p>
          </div>
          <div className="space-y-2">
            {data.recentPayouts.slice(0, 8).map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-[#E5DFD9]/80">{p.vendorName}</p>
                  <p className="text-[10px] text-[#E5DFD9]/30">
                    {p.listingTitle} · {p.status}
                  </p>
                </div>
                <span className="font-medium text-[#E5DFD9]/70">-{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

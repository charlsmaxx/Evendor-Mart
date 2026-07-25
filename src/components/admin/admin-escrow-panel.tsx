"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Lock, ArrowUpRight, ArrowDownLeft, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
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

export function AdminEscrowPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-escrow"],
    queryFn: async () => (await fetch("/api/admin/escrow")).json().then((j) => j.data as EscrowData),
    refetchInterval: 30_000,
  });

  if (isLoading || !data) {
    return <div className="h-96 animate-pulse rounded-2xl bg-white/5" />;
  }

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

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, HelpCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";

type ReconciliationData = {
  summary: {
    total: number;
    matched: number;
    mismatch: number;
    pending: number;
    unverifiable: number;
    paystackConfigured: boolean;
  };
  payouts: {
    id: string;
    amount: number;
    status: string;
    reference: string;
    reconciliationStatus: string;
    reconciledAt: string | null;
    reconciliationNote: string | null;
    paystackTransferCode: string | null;
    vendor: { businessName: string };
    booking: { listing: { title: string }; payments: { paystackRef: string | null }[] };
  }[];
};

const STATUS_STYLE: Record<string, string> = {
  MATCHED: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  MISMATCH: "text-red-400 bg-red-500/10 border-red-500/20",
  PENDING: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  UNVERIFIABLE: "text-[#E5DFD9]/50 bg-white/5 border-white/10",
};

export function AdminReconciliationPanel() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reconciliation"],
    queryFn: async () => {
      const res = await fetch("/api/admin/reconciliation");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message);
      return json.data as ReconciliationData;
    },
  });

  const runReconciliation = useMutation({
    mutationFn: async (payoutId?: string) => {
      const res = await fetch("/api/admin/reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payoutId ? { payoutId } : {}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Reconciliation failed");
      return json.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-reconciliation"] }),
  });

  if (isLoading || !data) {
    return <div className="h-96 animate-pulse rounded-2xl bg-white/5" />;
  }

  const { summary, payouts } = data;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Paystack Reconciliation"
        subtitle="Compare local payout records against Paystack transactions and transfers."
        action={
          <Button
            size="sm"
            variant="outline"
            className="gap-2 border-white/10 bg-transparent text-[#E5DFD9] hover:bg-white/5"
            disabled={runReconciliation.isPending || !summary.paystackConfigured}
            onClick={() => runReconciliation.mutate(undefined)}
          >
            <RefreshCw className={`h-4 w-4 ${runReconciliation.isPending ? "animate-spin" : ""}`} />
            Run reconciliation
          </Button>
        }
      />

      {!summary.paystackConfigured && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Paystack is not configured. Add <code className="text-xs">PAYSTACK_SECRET_KEY</code> to verify payouts automatically.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Matched", value: summary.matched, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Mismatch", value: summary.mismatch, icon: XCircle, color: "text-red-400" },
          { label: "Pending", value: summary.pending, icon: AlertTriangle, color: "text-amber-400" },
          { label: "Unverifiable", value: summary.unverifiable, icon: HelpCircle, color: "text-[#E5DFD9]/50" },
          { label: "Total", value: summary.total, icon: RefreshCw, color: "text-[#E5DFD9]" },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-white/10 bg-[#1a1215]/60 p-4">
            <c.icon className={`h-4 w-4 ${c.color}`} />
            <p className={`mt-2 text-2xl font-bold ${c.color}`}>{c.value}</p>
            <p className="text-xs text-[#E5DFD9]/40">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {payouts.map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-white/10 bg-[#1a1215]/60 p-4"
          >
            <div className="min-w-0">
              <p className="font-medium text-[#E5DFD9]">{p.vendor.businessName}</p>
              <p className="text-sm text-[#E5DFD9]/50">{p.booking.listing.title}</p>
              <p className="mt-1 text-xs text-[#E5DFD9]/40">
                Ref: {p.reference} · Local: {p.status} · {formatCurrency(p.amount)}
              </p>
              {p.reconciliationNote && (
                <p className="mt-2 text-xs text-[#E5DFD9]/60">{p.reconciliationNote}</p>
              )}
              {p.reconciledAt && (
                <p className="mt-1 text-[10px] text-[#E5DFD9]/30">
                  Checked {format(new Date(p.reconciledAt), "MMM d, HH:mm")}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase ${STATUS_STYLE[p.reconciliationStatus] ?? STATUS_STYLE.PENDING}`}
              >
                {p.reconciliationStatus}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="text-[#E5DFD9]/60"
                disabled={runReconciliation.isPending || !summary.paystackConfigured}
                onClick={() => runReconciliation.mutate(p.id)}
              >
                Verify
              </Button>
            </div>
          </div>
        ))}
        {payouts.length === 0 && (
          <p className="py-12 text-center text-sm text-[#E5DFD9]/40">No payouts to reconcile yet.</p>
        )}
      </div>
    </div>
  );
}

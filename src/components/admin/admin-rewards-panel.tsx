"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Gift, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { reportClientError } from "@/lib/client-error";

type RewardsAnalytics = {
  totalIssued: number;
  totalIssuedCount: number;
  totalRedeemed: number;
  totalRedeemedCount: number;
  totalExpired: number;
  totalExpiredCount: number;
  totalAdjusted: number;
  totalAdjustedCount: number;
  activeLiability: number;
  totalWallets: number;
  repeatCustomerRate: number;
  redemptionRate: number;
  breakageRate: number;
  revenueImpact: number;
};

export function AdminRewardsPanel() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [amountNgn, setAmountNgn] = useState("");
  const [reason, setReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-rewards"],
    queryFn: async () => {
      const res = await fetch("/api/admin/rewards");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message);
      return json.data as RewardsAnalytics;
    },
  });

  const runMaintenance = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/rewards/expire", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Maintenance failed");
      return json.data as { count: number; expiryWarningsSent: number; message: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-rewards"] });
    },
    onError: (e) => reportClientError("admin-rewards", e),
  });

  const adjustWallet = useMutation({
    mutationFn: async () => {
      const lookup = await fetch(`/api/admin/users?q=${encodeURIComponent(email.trim())}`);
      const lookupJson = await lookup.json();
      if (!lookup.ok) throw new Error(lookupJson.error?.message ?? "User lookup failed");
      const users = lookupJson.data as { id: string; email: string }[];
      const match = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase()) ?? users[0];
      if (!match) throw new Error("No user found for that email");

      const amountKobo = Math.round(parseFloat(amountNgn) * 100);
      if (!amountKobo || Number.isNaN(amountKobo)) throw new Error("Enter a valid amount in NGN");

      const res = await fetch("/api/admin/rewards/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: match.id,
          amount: amountKobo,
          reason: reason.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Adjustment failed");
      return json.data;
    },
    onSuccess: () => {
      setAmountNgn("");
      setReason("");
      qc.invalidateQueries({ queryKey: ["admin-rewards"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e) => reportClientError("admin-rewards-adjust", e),
  });

  if (isLoading || !data) {
    return <div className="h-96 animate-pulse rounded-2xl bg-white/5" />;
  }

  const cards = [
    {
      label: "Total Issued",
      value: formatCurrency(data.totalIssued),
      sub: `${data.totalIssuedCount} transactions`,
    },
    {
      label: "Redemption Rate",
      value: `${data.redemptionRate}%`,
      sub: `${formatCurrency(data.totalRedeemed)} redeemed`,
      accent: true,
    },
    {
      label: "Breakage Rate",
      value: `${data.breakageRate}%`,
      sub: `${formatCurrency(data.totalExpired)} expired unused`,
    },
    {
      label: "Active Liability",
      value: formatCurrency(data.activeLiability),
      sub: `${data.totalWallets} wallets`,
    },
    {
      label: "Admin Adjustments",
      value: formatCurrency(data.totalAdjusted),
      sub: `${data.totalAdjustedCount} manual ops`,
    },
    {
      label: "Repeat Customers",
      value: `${data.repeatCustomerRate}%`,
      sub: "More than one booking",
    },
  ];

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Rewards Analytics"
        subtitle="Evendor Rewards — 2% cashback, expiry, and liability tracking."
        action={
          <Button
            size="sm"
            variant="outline"
            className="gap-2 border-white/10 bg-white/5 text-[#E5DFD9]"
            disabled={runMaintenance.isPending}
            onClick={() => runMaintenance.mutate()}
          >
            <RefreshCw className={`h-4 w-4 ${runMaintenance.isPending ? "animate-spin" : ""}`} />
            Run expiry & warnings
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-white/10 bg-[#1a1215]/60 p-5"
          >
            <p className="text-sm text-[#E5DFD9]/60">{c.label}</p>
            <p className={`mt-2 font-display text-2xl font-bold ${c.accent ? "text-emerald-400" : "text-[#E5DFD9]"}`}>
              {c.value}
            </p>
            <p className="mt-1 text-xs text-[#E5DFD9]/50">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#1a1215]/60 p-6">
        <p className="mb-4 flex items-center gap-2 font-semibold text-[#E5DFD9]">
          <Gift className="h-4 w-4" /> Rewards flow
        </p>
        <div className="space-y-4 text-sm">
          {[
            { label: "Issued", amount: data.totalIssued, color: "bg-[#7A2E3D]" },
            { label: "Redeemed", amount: data.totalRedeemed, color: "bg-emerald-600" },
            { label: "Expired (breakage)", amount: data.totalExpired, color: "bg-[#E5DFD9]/30" },
            { label: "Outstanding liability", amount: data.activeLiability, color: "bg-amber-500" },
          ].map((row) => (
            <div key={row.label} className="space-y-1">
              <div className="flex justify-between text-[#E5DFD9]/80">
                <span>{row.label}</span>
                <span className="font-medium text-[#E5DFD9]">{formatCurrency(row.amount)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/5">
                <div
                  className={`h-full rounded-full ${row.color}`}
                  style={{
                    width: `${Math.min(100, (row.amount / (data.totalIssued || 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-sm font-medium text-emerald-300">Redemption rate</p>
              <p className="text-xs text-emerald-400/80">
                {data.redemptionRate}% of issued rewards were used on bookings
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
            <TrendingDown className="h-5 w-5 text-[#E5DFD9]/60" />
            <div>
              <p className="text-sm font-medium text-[#E5DFD9]">Breakage rate</p>
              <p className="text-xs text-[#E5DFD9]/50">
                {data.breakageRate}% expired unused after 12 months
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#1a1215]/60 p-6">
        <p className="mb-4 font-semibold text-[#E5DFD9]">Manual wallet adjustment</p>
        <p className="mb-4 text-sm text-[#E5DFD9]/50">
          Credit or debit a customer wallet. Use a negative amount in NGN to debit (e.g. -500).
        </p>
        <div className="grid max-w-lg gap-4">
          <div>
            <Label className="text-[#E5DFD9]/80">Customer email</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@example.com"
              className="mt-1 border-white/10 bg-black/20 text-[#E5DFD9]"
            />
          </div>
          <div>
            <Label className="text-[#E5DFD9]/80">Amount (NGN)</Label>
            <Input
              type="number"
              step="0.01"
              value={amountNgn}
              onChange={(e) => setAmountNgn(e.target.value)}
              placeholder="500 or -200"
              className="mt-1 border-white/10 bg-black/20 text-[#E5DFD9]"
            />
          </div>
          <div>
            <Label className="text-[#E5DFD9]/80">Reason</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Goodwill credit for delayed event…"
              className="mt-1 border-white/10 bg-black/20 text-[#E5DFD9]"
            />
          </div>
          <Button
            variant="gradient"
            className="w-fit"
            disabled={adjustWallet.isPending || !email.trim() || !amountNgn || !reason.trim()}
            onClick={() => adjustWallet.mutate()}
          >
            {adjustWallet.isPending ? "Applying…" : "Apply adjustment"}
          </Button>
        </div>
      </div>
    </div>
  );
}

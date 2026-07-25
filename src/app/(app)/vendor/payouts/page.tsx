"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Banknote, Wallet, Clock, CheckCircle2, XCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VendorPageHeader, VendorSummaryCard, VendorSection, VendorSkeleton } from "@/components/vendor/vendor-ui";
import { reportClientError } from "@/lib/client-error";

type PayoutData = {
  availableBalance: number;
  pendingEarnings: number;
  escrowBalance: number;
  pendingRelease: number;
  withdrawnAmount: number;
  payouts: {
    id: string;
    reference: string;
    amount: number;
    status: string;
    processedAt: string | null;
    createdAt: string;
    bookingTitle: string;
    eventDate: string;
  }[];
};

const STATUS_ICON: Record<string, React.ElementType> = {
  PAID: CheckCircle2,
  PROCESSING: Clock,
  PENDING: Clock,
  FAILED: XCircle,
};

export default function VendorPayoutsPage() {
  const [amount, setAmount] = useState("");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["vendor-payouts"],
    queryFn: async () => {
      const res = await fetch("/api/vendor/payouts");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message);
      return json.data as PayoutData;
    },
  });

  const withdraw = useMutation({
    mutationFn: async (amt: number) => {
      const res = await fetch("/api/vendor/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message);
      return json.data;
    },
    onSuccess: () => {
      setAmount("");
      qc.invalidateQueries({ queryKey: ["vendor-payouts"] });
      qc.invalidateQueries({ queryKey: ["vendor-revenue"] });
      qc.invalidateQueries({ queryKey: ["vendor-overview"] });
    },
    onError: (e) => reportClientError("payouts", e),
  });

  if (isLoading || !data) return <VendorSkeleton />;

  const amountKobo = Math.round(parseFloat(amount || "0") * 100);

  return (
    <div className="space-y-8">
      <VendorPageHeader
        title="Escrow & Payouts"
        subtitle="Withdraw earnings and track payout history."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <VendorSummaryCard label="Available for Withdrawal" value={formatCurrency(data.availableBalance)} accent icon={Wallet} />
        <VendorSummaryCard label="Pending Release" value={formatCurrency(data.pendingRelease)} sub="Processing payouts" icon={Clock} />
        <VendorSummaryCard label="In Escrow" value={formatCurrency(data.escrowBalance)} icon={Banknote} />
        <VendorSummaryCard label="Total Withdrawn" value={formatCurrency(data.withdrawnAmount)} icon={CheckCircle2} />
      </div>

      <div className="rounded-2xl border border-border/80 bg-card/80 p-6 backdrop-blur-sm">
        <h3 className="font-semibold">Withdraw Funds</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Available: {formatCurrency(data.availableBalance)}
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Input
            type="number"
            placeholder="Amount in NGN"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="max-w-xs"
          />
          <Button
            variant="gradient"
            disabled={!amountKobo || amountKobo > data.availableBalance || withdraw.isPending}
            onClick={() => withdraw.mutate(amountKobo)}
          >
            {withdraw.isPending ? "Processing…" : "Request Withdrawal"}
          </Button>
        </div>
        {withdraw.isSuccess && (
          <p className="mt-2 text-sm text-emerald-600">Withdrawal request submitted successfully.</p>
        )}
      </div>

      <VendorSection title="Payout History">
        {data.payouts.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No payout records yet.</p>
        ) : (
          <div className="space-y-2">
            {data.payouts.map((p) => {
              const Icon = STATUS_ICON[p.status] ?? Clock;
              return (
                <div key={p.id} className="flex items-center gap-4 rounded-xl border border-border/60 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{p.bookingTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      Ref: {p.reference} · {format(new Date(p.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{formatCurrency(p.amount)}</p>
                    <p className="text-xs capitalize text-muted-foreground">{p.status.toLowerCase()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </VendorSection>
    </div>
  );
}

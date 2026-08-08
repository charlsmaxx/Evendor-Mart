"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Banknote, Wallet, Clock, CheckCircle2, XCircle, Send, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VendorPageHeader, VendorSummaryCard, VendorSection, VendorSkeleton } from "@/components/vendor/vendor-ui";
import { PayoutAccountForm } from "@/components/vendor/payout-account-form";
import { reportClientError } from "@/lib/client-error";

type Withdrawal = {
  id: string;
  reference: string;
  amount: number;
  status: string;
  bankName: string | null;
  accountNumberLast4: string | null;
  failureReason: string | null;
  processedAt: string | null;
  createdAt: string;
};

type PayoutData = {
  availableBalance: number;
  pendingEarnings: number;
  escrowBalance: number;
  pendingRelease: number;
  withdrawnAmount: number;
  withdrawalsInFlight: number;
  minWithdrawal: number;
  payoutsEnabled: boolean;
  paystackTestMode?: boolean;
  bankAccount: { bankName: string; accountName: string; accountNumberLast4: string } | null;
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
  withdrawals: Withdrawal[];
};

const STATUS_ICON: Record<string, React.ElementType> = {
  PAID: CheckCircle2,
  PROCESSING: Clock,
  PENDING: Clock,
  FAILED: XCircle,
  REVERSED: XCircle,
};

export default function VendorPayoutsPage() {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
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
      let res: Response;
      try {
        res = await fetch("/api/vendor/payouts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: amt }),
        });
      } catch {
        throw new Error(
          "Could not reach the server. Refresh this page — if a withdrawal appears below, it is already processing."
        );
      }
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error?.message ?? "Withdrawal failed");
      }
      return json.data as { message: string };
    },
    onMutate: () => setError(null),
    onSuccess: () => {
      setAmount("");
      qc.invalidateQueries({ queryKey: ["vendor-payouts"] });
      qc.invalidateQueries({ queryKey: ["vendor-revenue"] });
      qc.invalidateQueries({ queryKey: ["vendor-overview"] });
    },
    onError: (e: Error) => {
      setError(e.message);
      reportClientError("payouts", e);
    },
  });

  if (isLoading || !data) return <VendorSkeleton />;

  const requested = Math.floor(Number(amount) || 0);
  const canSubmit =
    data.payoutsEnabled &&
    requested >= data.minWithdrawal &&
    requested <= data.availableBalance &&
    !withdraw.isPending;

  return (
    <div className="space-y-8">
      <VendorPageHeader
        title="Escrow & Payouts"
        subtitle="Withdraw released earnings to your bank account and track every transfer."
      />

      {data.paystackTestMode && (
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <span className="font-semibold">Paystack test mode:</span> withdrawals show as
            successful so you can verify the flow, but Paystack does not debit the test balance
            or send real bank transfers. Switch to live keys when you go to production.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <VendorSummaryCard label="Available for Withdrawal" value={formatCurrency(data.availableBalance)} accent icon={Wallet} />
        <VendorSummaryCard label="In Escrow" value={formatCurrency(data.escrowBalance)} sub="Releases after the event" icon={Banknote} />
        <VendorSummaryCard label="In Transit" value={formatCurrency(data.withdrawalsInFlight)} sub="Heading to your bank" icon={Send} />
        <VendorSummaryCard label="Total Withdrawn" value={formatCurrency(data.withdrawnAmount)} icon={CheckCircle2} />
      </div>

      <PayoutAccountForm
        current={
          data.bankAccount
            ? {
                bankName: data.bankAccount.bankName,
                accountName: data.bankAccount.accountName,
                accountNumberMasked: `••••${data.bankAccount.accountNumberLast4}`,
              }
            : null
        }
      />

      <div className="rounded-2xl border border-border/80 bg-card/80 p-6 backdrop-blur-sm">
        <h3 className="font-semibold">Withdraw Funds</h3>
        {!data.payoutsEnabled && (
          <p className="mt-1 flex items-center gap-2 text-sm text-amber-600">
            <AlertTriangle className="h-4 w-4" />
            Add a verified payout account above to enable withdrawals.
          </p>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Input
            type="number"
            inputMode="numeric"
            min={data.minWithdrawal}
            placeholder={`Amount in NGN (min ${data.minWithdrawal.toLocaleString()})`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="max-w-xs"
            disabled={!data.payoutsEnabled}
          />
          <Button variant="gradient" disabled={!canSubmit} onClick={() => withdraw.mutate(requested)}>
            {withdraw.isPending ? "Processing…" : "Request Withdrawal"}
          </Button>
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          Available: {formatCurrency(data.availableBalance)} · Minimum{" "}
          {formatCurrency(data.minWithdrawal)}
        </p>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {withdraw.isSuccess && !error && (
          <p className="mt-2 text-sm text-emerald-600">{withdraw.data?.message}</p>
        )}
      </div>

      <VendorSection title="Withdrawals">
        {data.withdrawals.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No withdrawals yet.</p>
        ) : (
          <div className="space-y-2">
            {data.withdrawals.map((w) => {
              const Icon = STATUS_ICON[w.status] ?? Clock;
              const failed = w.status === "FAILED" || w.status === "REVERSED";
              return (
                <div key={w.id} className="flex items-center gap-4 rounded-xl border border-border/60 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Icon className={`h-5 w-5 ${failed ? "text-red-500" : "text-muted-foreground"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {w.bankName ?? "Bank transfer"}
                      {w.accountNumberLast4 ? ` ••••${w.accountNumberLast4}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(w.createdAt), "MMM d, yyyy HH:mm")} · {w.reference}
                    </p>
                    {failed && w.failureReason && (
                      <p className="mt-1 text-xs text-red-600">{w.failureReason}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{formatCurrency(w.amount)}</p>
                    <p className="text-xs capitalize text-muted-foreground">{w.status.toLowerCase()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </VendorSection>

      <VendorSection title="Escrow Releases">
        {data.payouts.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No released bookings yet.</p>
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

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
import {
  WithdrawalAuthDialog,
  type WebauthnAssertionPayload,
} from "@/components/vendor/withdrawal-auth-dialog";
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
  payoutPasswordSet?: boolean;
  webauthnEnabled?: boolean;
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

async function readApiError(res: Response) {
  const json = await res.json().catch(() => null);
  const error = new Error(json?.error?.message ?? "Request failed") as Error & { code?: string };
  error.code = json?.error?.code;
  return error;
}

export default function VendorPayoutsPage() {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingAmount, setPendingAmount] = useState(0);
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
    mutationFn: async (payload: {
      amount: number;
      payoutPassword?: string;
      webauthn?: WebauthnAssertionPayload;
    }) => {
      let res: Response;
      try {
        res = await fetch("/api/vendor/payouts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch {
        throw new Error(
          "Could not reach the server. Refresh this page — if a withdrawal appears below, it is already processing."
        );
      }
      if (!res.ok) throw await readApiError(res);
      const json = await res.json().catch(() => null);
      return json.data as { message: string };
    },
    onMutate: () => setError(null),
    onSuccess: () => {
      setAmount("");
      setAuthOpen(false);
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

  async function savePassword(
    password: string,
    confirmPassword: string,
    extra?: { currentPassword?: string; accountPassword?: string }
  ) {
    const res = await fetch("/api/vendor/payout-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password,
        confirmPassword,
        currentPassword: extra?.currentPassword,
        accountPassword: extra?.accountPassword,
      }),
    });
    if (!res.ok) throw await readApiError(res);
    await qc.invalidateQueries({ queryKey: ["vendor-payouts"] });
  }

  return (
    <div className="space-y-8">
      <VendorPageHeader
        title="Earnings & Payouts"
        subtitle="Track pending earnings, withdraw available funds to your bank, and follow every transfer."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <VendorSummaryCard
          label="Available for Payout"
          value={formatCurrency(data.availableBalance)}
          sub={
            data.availableBalance > 0
              ? "Ready to withdraw"
              : "Becomes available after service is completed"
          }
          accent
          icon={Wallet}
        />
        <VendorSummaryCard
          label="Pending Earnings"
          value={formatCurrency(data.pendingEarnings)}
          sub="Payout pending — not withdrawable yet"
          icon={Banknote}
        />
        <VendorSummaryCard
          label="Payout Processing"
          value={formatCurrency(data.withdrawalsInFlight)}
          sub="Transfer to your bank in progress"
          icon={Send}
        />
        <VendorSummaryCard
          label="Paid"
          value={formatCurrency(data.withdrawnAmount)}
          sub="Successfully sent to your bank"
          icon={CheckCircle2}
        />
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
        {data.payoutsEnabled && data.availableBalance < data.minWithdrawal && (
          <p className="mt-1 text-sm text-muted-foreground">
            Payout unavailable until your service is successfully completed and enough
            earnings are available (min {formatCurrency(data.minWithdrawal)}).
          </p>
        )}
        {data.payoutsEnabled && (
          <p className="mt-1 text-sm text-muted-foreground">
            {data.payoutPasswordSet
              ? "Withdrawals require your withdrawal password or this device’s fingerprint / Face ID."
              : "You’ll set a withdrawal password before the first payout is sent."}
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
          <Button
            variant="gradient"
            disabled={!canSubmit}
            onClick={() => {
              setError(null);
              setPendingAmount(requested);
              setAuthOpen(true);
            }}
          >
            Request Withdrawal
          </Button>
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          Available: {formatCurrency(data.availableBalance)} · Minimum{" "}
          {formatCurrency(data.minWithdrawal)}
        </p>

        {error && !authOpen && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {withdraw.isSuccess && !error && !authOpen && (
          <p className="mt-2 text-sm text-emerald-600">{withdraw.data?.message}</p>
        )}
      </div>

      <WithdrawalAuthDialog
        open={authOpen}
        amount={pendingAmount}
        passwordSet={!!data.payoutPasswordSet}
        webauthnEnabled={!!data.webauthnEnabled}
        submitting={withdraw.isPending}
        error={authOpen ? error : null}
        onOpenChange={setAuthOpen}
        onSetPassword={async (password, confirmPassword) => {
          try {
            await savePassword(password, confirmPassword);
          } catch (err) {
            const code = (err as Error & { code?: string }).code;
            if (code !== "PAYOUT_PASSWORD_ALREADY_SET" && code !== "PAYOUT_PASSWORD_REQUIRED") {
              throw err;
            }
          }
          await withdraw.mutateAsync({ amount: pendingAmount, payoutPassword: password });
        }}
        onChangePassword={async (currentPassword, password, confirmPassword) => {
          await savePassword(password, confirmPassword, { currentPassword });
          setError(null);
        }}
        onRecoverPassword={async (accountPassword, password, confirmPassword) => {
          await savePassword(password, confirmPassword, { accountPassword });
          setError(null);
        }}
        onConfirmPassword={async (password) => {
          await withdraw.mutateAsync({ amount: pendingAmount, payoutPassword: password });
        }}
        onConfirmBiometrics={async (webauthn) => {
          await withdraw.mutateAsync({ amount: pendingAmount, webauthn });
        }}
        onBiometricsEnabled={() => {
          qc.invalidateQueries({ queryKey: ["vendor-payouts"] });
        }}
      />

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

      <VendorSection title="Released Earnings">
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

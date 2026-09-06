"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Banknote, Wallet, Clock, CheckCircle2, XCircle, Send, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { payoutStatusLabel } from "@/lib/payout-labels";
import { Button } from "@/components/ui/button";
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

type BookingPayout = {
  id: string;
  bookingId: string;
  reference: string;
  amount: number;
  status: string;
  canRequest?: boolean;
  processedAt: string | null;
  createdAt: string;
  bookingTitle: string;
  eventDate: string;
};

type PayoutData = {
  availableBalance: number;
  pendingEarnings: number;
  payoutRequested?: number;
  payoutApproved?: number;
  payoutPaid?: number;
  payoutOnHold?: number;
  withdrawnAmount: number;
  withdrawalsInFlight: number;
  legacyLedgerBalance?: number;
  payoutsEnabled: boolean;
  payoutPasswordSet?: boolean;
  webauthnEnabled?: boolean;
  bankAccount: { bankName: string; accountName: string; accountNumberLast4: string } | null;
  payouts: BookingPayout[];
  withdrawals: Withdrawal[];
};

const STATUS_ICON: Record<string, React.ElementType> = {
  PAID: CheckCircle2,
  APPROVED: CheckCircle2,
  PROCESSING: Clock,
  PENDING: Clock,
  REQUESTED: Send,
  UNDER_REVIEW: Clock,
  ON_HOLD: AlertTriangle,
  REJECTED: XCircle,
  PAYMENT_FAILED: XCircle,
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
  const [error, setError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingPayout, setPendingPayout] = useState<BookingPayout | null>(null);
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

  const requestPayout = useMutation({
    mutationFn: async (payload: {
      bookingId: string;
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
        throw new Error("Could not reach the server. Refresh this page and check whether the request already appears.");
      }
      if (!res.ok) throw await readApiError(res);
      const json = await res.json().catch(() => null);
      return json.data as { message: string };
    },
    onMutate: () => setError(null),
    onSuccess: () => {
      setAuthOpen(false);
      setPendingPayout(null);
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
        subtitle="Pending earnings are not payable yet. Request payout on a completed booking — Evendor reviews each request before payment is made."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <VendorSummaryCard
          label="Pending Earnings"
          value={formatCurrency(data.pendingEarnings)}
          sub="Not payable until the job is completed"
          icon={Banknote}
        />
        <VendorSummaryCard
          label="Available for Payout"
          value={formatCurrency(data.availableBalance)}
          sub="Eligible to request — not paid yet"
          accent
          icon={Wallet}
        />
        <VendorSummaryCard
          label="Payout Under Review"
          value={formatCurrency((data.payoutRequested ?? 0) + (data.payoutApproved ?? 0))}
          sub="Requested or approved, awaiting payment"
          icon={Send}
        />
        <VendorSummaryCard
          label="Payout Paid"
          value={formatCurrency(data.payoutPaid ?? 0)}
          sub="Recorded as paid by Evendor"
          icon={CheckCircle2}
        />
      </div>

      {(data.payoutOnHold ?? 0) > 0 && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {formatCurrency(data.payoutOnHold ?? 0)} is on hold and cannot be paid until Evendor completes review.
        </p>
      )}

      {(data.legacyLedgerBalance ?? 0) > 0 && (
        <p className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Earlier earnings of {formatCurrency(data.legacyLedgerBalance ?? 0)} were credited before this
          payout-request process. Evendor will settle those separately — they cannot be requested again here.
        </p>
      )}

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
        <h3 className="font-semibold">Request payout</h3>
        {!data.payoutsEnabled && (
          <p className="mt-1 flex items-center gap-2 text-sm text-amber-600">
            <AlertTriangle className="h-4 w-4" />
            Add a verified payout account above before requesting payout.
          </p>
        )}
        <p className="mt-1 text-sm text-muted-foreground">
          You are requesting payout for a specific completed booking. The amount is calculated by
          Evendor. Your request will be reviewed before payment is made. This is not an instant transfer.
        </p>
        {error && !authOpen && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {requestPayout.isSuccess && !error && !authOpen && (
          <p className="mt-2 text-sm text-emerald-600">{requestPayout.data?.message}</p>
        )}
      </div>

      <WithdrawalAuthDialog
        open={authOpen}
        amount={pendingPayout?.amount ?? 0}
        passwordSet={!!data.payoutPasswordSet}
        webauthnEnabled={!!data.webauthnEnabled}
        submitting={requestPayout.isPending}
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
          if (pendingPayout) {
            await requestPayout.mutateAsync({
              bookingId: pendingPayout.bookingId,
              payoutPassword: password,
            });
          }
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
          if (!pendingPayout) return;
          await requestPayout.mutateAsync({
            bookingId: pendingPayout.bookingId,
            payoutPassword: password,
          });
        }}
        onConfirmBiometrics={async (webauthn) => {
          if (!pendingPayout) return;
          await requestPayout.mutateAsync({
            bookingId: pendingPayout.bookingId,
            webauthn,
          });
        }}
        onBiometricsEnabled={() => {
          qc.invalidateQueries({ queryKey: ["vendor-payouts"] });
        }}
      />

      <VendorSection title="Booking payouts">
        {data.payouts.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No completed bookings are available for payout yet.
          </p>
        ) : (
          <div className="space-y-2">
            {data.payouts.map((p) => {
              const Icon = STATUS_ICON[p.status] ?? Clock;
              const canRequest = !!p.canRequest && data.payoutsEnabled && !requestPayout.isPending;
              return (
                <div key={p.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-border/60 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{p.bookingTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      Booking #{p.bookingId.slice(0, 8)} · {format(new Date(p.eventDate), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{formatCurrency(p.amount)}</p>
                    <p className="text-xs text-muted-foreground">{payoutStatusLabel(p.status)}</p>
                  </div>
                  {canRequest ? (
                    <Button
                      variant="gradient"
                      size="sm"
                      onClick={() => {
                        setError(null);
                        setPendingPayout(p);
                        setAuthOpen(true);
                      }}
                    >
                      Request Payout
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </VendorSection>

      {data.withdrawals.length > 0 && (
        <VendorSection title="Earlier bank transfers">
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
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{formatCurrency(w.amount)}</p>
                    <p className="text-xs capitalize text-muted-foreground">{w.status.toLowerCase()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </VendorSection>
      )}
    </div>
  );
}

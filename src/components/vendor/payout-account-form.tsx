"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { reportClientError } from "@/lib/client-error";

type Bank = { code: string; name: string };

type SavedAccount = {
  bankName: string;
  accountName: string;
  accountNumberMasked: string;
} | null;

export function PayoutAccountForm({ current }: { current: SavedAccount }) {
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();

  const banks = useQuery({
    queryKey: ["paystack-banks"],
    queryFn: async () => {
      const res = await fetch("/api/payments/banks");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Could not load banks");
      return json.data as Bank[];
    },
    staleTime: 60 * 60 * 1000,
  });

  const save = useMutation({
    mutationFn: async () => {
      const bankName = banks.data?.find((b) => b.code === bankCode)?.name ?? "Bank";
      const res = await fetch("/api/vendor/bank-account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankCode, bankName, accountNumber }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Could not save account");
      return json.data as { accountName: string };
    },
    onMutate: () => setError(null),
    onSuccess: () => {
      setAccountNumber("");
      qc.invalidateQueries({ queryKey: ["vendor-payouts"] });
    },
    onError: (e: Error) => {
      setError(e.message);
      reportClientError("payout-account", e);
    },
  });

  const canSave = bankCode.length > 1 && /^\d{10}$/.test(accountNumber) && !save.isPending;

  return (
    <div className="rounded-2xl border border-border/80 bg-card/80 p-6 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <Landmark className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold">Payout Account</h3>
      </div>

      {current && (
        <p className="mt-2 flex items-center gap-2 text-sm text-emerald-600">
          <CheckCircle2 className="h-4 w-4" />
          {current.bankName} {current.accountNumberMasked} · {current.accountName}
        </p>
      )}

      <p className="mt-1 text-sm text-muted-foreground">
        {current
          ? "Replace it below. We verify the account with your bank before saving."
          : "Add the bank account that should receive your withdrawals."}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="payout-bank">Bank</Label>
          <select
            id="payout-bank"
            value={bankCode}
            onChange={(e) => setBankCode(e.target.value)}
            disabled={banks.isLoading || !!banks.error}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">
              {banks.isLoading ? "Loading banks…" : banks.error ? "Unavailable" : "Select bank"}
            </option>
            {banks.data?.map((b) => (
              <option key={b.code} value={b.code}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="payout-account">Account number</Label>
          <Input
            id="payout-account"
            inputMode="numeric"
            maxLength={10}
            placeholder="10 digits"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
          />
        </div>

        <div className="flex items-end">
          <Button disabled={!canSave} onClick={() => save.mutate()}>
            {save.isPending ? "Verifying…" : "Verify & save"}
          </Button>
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {save.isSuccess && !error && (
        <p className="mt-2 text-sm text-emerald-600">
          Verified as {save.data?.accountName}. Withdrawals will go to this account.
        </p>
      )}
    </div>
  );
}

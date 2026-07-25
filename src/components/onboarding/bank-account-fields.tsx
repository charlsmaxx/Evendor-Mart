"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { BankAccountInput } from "@/lib/validations/bank";

type BankOption = { code: string; name: string; slug: string };

export function BankAccountFields({
  value,
  onChange,
}: {
  value: Partial<BankAccountInput>;
  onChange: (next: Partial<BankAccountInput> & { verified?: boolean }) => void;
}) {
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verified, setVerified] = useState(Boolean(value.accountName));

  const { data: banks, isLoading: banksLoading } = useQuery({
    queryKey: ["nigerian-banks"],
    queryFn: async () => {
      const res = await fetch("/api/payments/banks");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Could not load banks");
      return json.data as BankOption[];
    },
    staleTime: 1000 * 60 * 60,
  });

  useEffect(() => {
    setVerified(Boolean(value.accountName));
  }, [value.accountName]);

  async function verifyAccount() {
    setVerifyError(null);
    if (!value.bankCode || !value.accountNumber || value.accountNumber.length !== 10) {
      setVerifyError("Select a bank and enter a 10-digit account number.");
      return;
    }

    setVerifying(true);
    try {
      const res = await fetch("/api/payments/verify-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankCode: value.bankCode,
          accountNumber: value.accountNumber,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setVerifyError(json.error?.message ?? "Verification failed");
        setVerified(false);
        onChange({ ...value, accountName: undefined, verified: false });
        return;
      }
      const accountName = json.data.accountName as string;
      setVerified(true);
      onChange({
        ...value,
        accountName,
        verified: true,
      });
    } catch {
      setVerifyError("Could not verify account. Try again.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
      <div>
        <p className="font-semibold">Payout bank account</p>
        <p className="text-xs text-muted-foreground">
          Payments from bookings are sent to this account. Verify your account number before continuing.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bankCode">Bank *</Label>
        <select
          id="bankCode"
          required
          disabled={banksLoading}
          value={value.bankCode ?? ""}
          onChange={(e) => {
            const bank = banks?.find((b) => b.code === e.target.value);
            setVerified(false);
            onChange({
              ...value,
              bankCode: e.target.value,
              bankName: bank?.name ?? "",
              accountName: undefined,
              verified: false,
            });
          }}
          className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
        >
          <option value="">{banksLoading ? "Loading banks…" : "Select your bank"}</option>
          {(banks ?? []).map((b) => (
            <option key={b.slug} value={b.code}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="accountNumber">Account number *</Label>
        <div className="flex gap-2">
          <Input
            id="accountNumber"
            inputMode="numeric"
            maxLength={10}
            placeholder="0123456789"
            value={value.accountNumber ?? ""}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
              setVerified(false);
              onChange({
                ...value,
                accountNumber: digits,
                accountName: undefined,
                verified: false,
              });
            }}
            required
          />
          <Button
            type="button"
            variant="outline"
            className="shrink-0 gap-1"
            disabled={verifying || !value.bankCode || (value.accountNumber?.length ?? 0) !== 10}
            onClick={verifyAccount}
          >
            {verifying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : verified ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : null}
            {verifying ? "Checking…" : verified ? "Verified" : "Verify"}
          </Button>
        </div>
        {verifyError && <p className="text-xs text-destructive">{verifyError}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="accountName">Account name</Label>
        <Input
          id="accountName"
          value={value.accountName ?? ""}
          readOnly
          placeholder="Click Verify to auto-fill account name"
          className="bg-muted/50"
        />
        {verified && (
          <p className="flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" /> Account verified
          </p>
        )}
      </div>
    </div>
  );
}

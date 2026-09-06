"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { payoutStatusLabel } from "@/lib/payout-labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AdminPageHeader } from "@/components/admin/admin-ui";

type ReviewData = {
  id: string;
  reference: string;
  status: string;
  vendorPayableAmount: number;
  paidAmount: number | null;
  adjustmentAmount: number;
  adjustmentReason: string | null;
  commissionPercent: number;
  commissionAmount: number;
  customerPaid: number;
  bookingTotal: number;
  transferReference: string | null;
  paymentMethod: string | null;
  notes: string | null;
  holdReason: string | null;
  rejectionReason: string | null;
  requestedAt: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  vendor: { id: string; businessName: string; category: string | null };
  booking: {
    id: string;
    status: string;
    eventDate: string;
    createdAt: string;
    vendorCompletedAt: string | null;
    completionConfirmedAt: string | null;
    customerApproved: boolean;
    autoReleased: boolean;
    listingTitle: string;
    listingType: string;
    customerName: string;
  };
  payments: {
    id: string;
    amount: number;
    status: string;
    escrowStatus: string;
    paystackRef: string | null;
    createdAt: string;
  }[];
  dispute: { id: string; status: string; reason: string } | null;
  destination: {
    bankName: string | null;
    accountName: string | null;
    accountNumber: string | null;
    accountNumberLast4: string | null;
  };
  previousAttempts: { action: string; actorId: string | null; createdAt: string; metadata: unknown }[];
};

export function AdminPayoutReview({ payoutId }: { payoutId: string }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const [transferReference, setTransferReference] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmApprove, setConfirmApprove] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-payout", payoutId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/payouts/${payoutId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Not found");
      return json.data as ReviewData;
    },
  });

  const review = useMutation({
    mutationFn: async (action: "APPROVE" | "REJECT" | "HOLD") => {
      const res = await fetch(`/api/admin/payouts/${payoutId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: reason.trim() || undefined }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error?.message ?? "Review failed");
    },
    onSuccess: () => {
      setConfirmApprove(false);
      setError(null);
      qc.invalidateQueries({ queryKey: ["admin-payout", payoutId] });
      qc.invalidateQueries({ queryKey: ["admin-escrow"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const record = useMutation({
    mutationFn: async () => {
      const amount = paidAmount.trim() ? Number(paidAmount) : undefined;
      const res = await fetch(`/api/admin/payouts/${payoutId}/record-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transferReference,
          paidAmount: Number.isInteger(amount) ? amount : undefined,
          adjustmentReason: adjustmentReason.trim() || undefined,
          notes: notes.trim() || undefined,
          paymentMethod: "manual_business_payout",
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error?.message ?? "Could not record payment");
    },
    onSuccess: () => {
      setError(null);
      qc.invalidateQueries({ queryKey: ["admin-payout", payoutId] });
      qc.invalidateQueries({ queryKey: ["admin-escrow"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  if (isLoading || !data) {
    return <div className="h-96 animate-pulse rounded-2xl bg-white/5" />;
  }

  const masked =
    data.destination.accountNumberLast4 ??
    (data.destination.accountNumber ? data.destination.accountNumber.slice(-4) : "—");

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Payout request review"
        subtitle={`${data.vendor.businessName} · ${payoutStatusLabel(data.status)}`}
      />
      <Link href="/admin/escrow" className="text-sm text-[#E5DFD9]/60 hover:underline">
        ← Back to Settlements
      </Link>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-[#1a1215]/60 p-5 space-y-2 text-sm text-[#E5DFD9]/80">
          <p className="font-semibold text-[#E5DFD9]">Booking & parties</p>
          <p>Vendor: {data.vendor.businessName} ({data.vendor.id.slice(0, 8)})</p>
          <p>Customer: {data.booking.customerName}</p>
          <p>Service: {data.booking.listingTitle} ({data.booking.listingType})</p>
          <p>Category: {data.vendor.category ?? "—"}</p>
          <p>Booking: {data.booking.id}</p>
          <p>Event date: {format(new Date(data.booking.eventDate), "PP p")}</p>
          <p>Booked: {format(new Date(data.booking.createdAt), "PP p")}</p>
          <p>Booking status: {data.booking.status}</p>
          <p>Customer approved: {data.booking.customerApproved ? "Yes" : "No"}</p>
          <p>48-hour completion: {data.booking.autoReleased ? "Yes (automatic)" : "No"}</p>
          <p>Vendor marked done: {data.booking.vendorCompletedAt ? format(new Date(data.booking.vendorCompletedAt), "PP p") : "—"}</p>
          <p>
            Dispute:{" "}
            {data.dispute ? `${data.dispute.status} — ${data.dispute.reason}` : "None"}
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#1a1215]/60 p-5 space-y-2 text-sm text-[#E5DFD9]/80">
          <p className="font-semibold text-[#E5DFD9]">Money (server-calculated)</p>
          <p>Customer paid: {formatCurrency(data.customerPaid || data.bookingTotal)}</p>
          <p>Evendor commission ({data.commissionPercent}%): {formatCurrency(data.commissionAmount)}</p>
          <p>Vendor payable: {formatCurrency(data.vendorPayableAmount)}</p>
          <p>Adjustments: {formatCurrency(data.adjustmentAmount)}</p>
          <p>Final recorded payout: {formatCurrency(data.paidAmount ?? data.vendorPayableAmount)}</p>
          {data.payments.map((p) => (
            <p key={p.id}>
              Payment {p.status} / {p.escrowStatus} · {formatCurrency(p.amount)} · {p.paystackRef ?? "no ref"}
            </p>
          ))}
          <p className="pt-2 font-semibold text-[#E5DFD9]">Destination</p>
          <p>{data.destination.bankName ?? "—"}</p>
          <p>{data.destination.accountName ?? "—"}</p>
          <p>Account: {data.destination.accountNumber ?? `••••${masked}`}</p>
          <p>Requested: {data.requestedAt ? format(new Date(data.requestedAt), "PP p") : "Not yet"}</p>
        </section>
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      {["REQUESTED", "UNDER_REVIEW", "ON_HOLD"].includes(data.status) && (
        <section className="rounded-2xl border border-white/10 bg-[#1a1215]/60 p-5 space-y-3">
          <p className="font-semibold text-[#E5DFD9]">Review</p>
          {!confirmApprove ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="gradient" onClick={() => setConfirmApprove(true)}>
                Approve payout
              </Button>
              <Button variant="outline" disabled={review.isPending} onClick={() => review.mutate("HOLD")}>
                Put on hold
              </Button>
              <Button variant="destructive" disabled={review.isPending} onClick={() => review.mutate("REJECT")}>
                Reject
              </Button>
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-sm text-[#E5DFD9]">
                Approve payout of {formatCurrency(data.vendorPayableAmount)} to {data.vendor.businessName} for
                booking {data.booking.id.slice(0, 8)}? This does not mark the vendor as paid.
              </p>
              <div className="flex gap-2">
                <Button variant="gradient" disabled={review.isPending} onClick={() => review.mutate("APPROVE")}>
                  Confirm approval
                </Button>
                <Button variant="ghost" onClick={() => setConfirmApprove(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
          <Textarea
            placeholder="Reason required for reject or hold"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </section>
      )}

      {data.status === "APPROVED" && (
        <section className="rounded-2xl border border-white/10 bg-[#1a1215]/60 p-5 space-y-3">
          <p className="font-semibold text-[#E5DFD9]">Record manual business payment</p>
          <p className="text-sm text-[#E5DFD9]/60">
            Only record this after the transfer has actually been made from Evendor&apos;s approved
            business payout account.
          </p>
          <Input
            placeholder="Bank transfer / payment reference"
            value={transferReference}
            onChange={(e) => setTransferReference(e.target.value)}
          />
          <Input
            placeholder={`Paid amount (default ${data.vendorPayableAmount})`}
            value={paidAmount}
            onChange={(e) => setPaidAmount(e.target.value)}
          />
          <Textarea
            placeholder="Required if paid amount differs from vendor payable"
            value={adjustmentReason}
            onChange={(e) => setAdjustmentReason(e.target.value)}
            rows={2}
          />
          <Textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          <Button variant="gradient" disabled={record.isPending} onClick={() => record.mutate()}>
            {record.isPending ? "Saving…" : "Confirm payment recorded"}
          </Button>
        </section>
      )}

      {data.previousAttempts.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-[#1a1215]/60 p-5">
          <p className="mb-3 font-semibold text-[#E5DFD9]">Audit trail</p>
          <ul className="space-y-1 text-xs text-[#E5DFD9]/60">
            {data.previousAttempts.map((row, i) => (
              <li key={`${row.action}-${i}`}>
                {row.action} · {format(new Date(row.createdAt), "PP p")}
                {row.actorId ? ` · ${row.actorId.slice(0, 8)}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

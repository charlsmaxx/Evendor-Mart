"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { reportClientError } from "@/lib/client-error";

type CancelPreview = {
  allowCancel: boolean;
  canCancelUi: boolean;
  refundPercent: number;
  feeAmount: number;
  refundAmount: number;
  vendorRetain: number;
  paidAmount: number;
  message: string;
  status: string;
};

export function CustomerCancelBooking({ bookingId }: { bookingId: string }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const preview = useQuery({
    queryKey: ["booking-cancel-preview", bookingId],
    queryFn: async () => {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Could not load cancel options");
      return json.data as CancelPreview;
    },
  });

  const cancel = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Cancellation failed");
      return json.data as { refundAmount: number };
    },
    onSuccess: (data) => {
      setConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking-cancel-preview", bookingId] });
      reportClientError(
        "booking",
        data.refundAmount > 0
          ? `Booking cancelled. Refund of ${formatCurrency(data.refundAmount)} initiated.`
          : "Booking cancelled."
      );
    },
    onError: (err: Error) => reportClientError("booking", err.message),
  });

  if (preview.isLoading || !preview.data) return null;

  const data = preview.data;

  if (["CANCELLED", "DECLINED", "EXPIRED", "COMPLETED"].includes(data.status)) {
    return null;
  }

  if (!data.canCancelUi) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        {data.message ||
          "This booking can no longer be cancelled because the vendor's cancellation window has expired."}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
      <p className="font-semibold text-amber-950">Cancel booking</p>
      <p className="mt-1 text-sm text-amber-900/80">{data.message}</p>
      <ul className="mt-3 space-y-1 text-sm text-amber-950/90">
        <li>Refund amount: {formatCurrency(data.refundAmount)}</li>
        {data.feeAmount > 0 && <li>Cancellation fee: {formatCurrency(data.feeAmount)}</li>}
        {data.vendorRetain > 0 && (
          <li>Vendor retained (after policy): {formatCurrency(data.vendorRetain)}</li>
        )}
        <li>Rewards redeemed on this booking will be returned if still pending.</li>
      </ul>

      {!confirmOpen ? (
        <Button
          type="button"
          variant="outline"
          className="mt-4 border-amber-300 text-amber-900"
          onClick={() => setConfirmOpen(true)}
        >
          Cancel Booking
        </Button>
      ) : (
        <div className="mt-4 space-y-3">
          <textarea
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            rows={2}
            placeholder="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate()}
            >
              {cancel.isPending ? "Cancelling…" : "Confirm cancellation"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)}>
              Keep booking
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

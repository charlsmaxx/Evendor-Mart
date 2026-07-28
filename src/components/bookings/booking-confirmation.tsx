"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { reportClientError } from "@/lib/client-error";

export function BookingConfirmation({
  bookingId,
  canConfirm = true,
  canDispute,
}: {
  bookingId: string;
  canConfirm?: boolean;
  canDispute: boolean;
}) {
  const router = useRouter();
  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/bookings/${bookingId}/confirm`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Failed to confirm");
      return json.data as { message?: string };
    },
    onMutate: () => setError(null),
    onSuccess: () => {
      setDone(true);
      router.refresh();
    },
    onError: (e: Error) => {
      setError(e.message);
      reportClientError("booking-confirm", e);
    },
  });

  const disputeMutation = useMutation({
    mutationFn: async () => {
      if (disputeReason.trim().length < 10) {
        throw new Error("Please describe the issue in at least 10 characters.");
      }
      const res = await fetch(`/api/bookings/${bookingId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: disputeReason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Failed to open dispute");
      return json.data as { message?: string };
    },
    onMutate: () => setError(null),
    onSuccess: () => {
      setDone(true);
      router.refresh();
    },
    onError: (e: Error) => {
      setError(e.message);
      reportClientError("booking-dispute", e);
    },
  });

  if (done) return null;

  return (
    <div
      className="rounded-2xl border border-primary/25 p-5 space-y-4"
      style={{ background: "linear-gradient(135deg,rgba(122,46,61,0.06) 0%,rgba(229,223,217,0.14) 100%)" }}
    >
      <div>
        <p className="font-display font-semibold text-base">
          {canConfirm ? "Did the event take place successfully?" : "Need help with this booking?"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {canConfirm
            ? "Approving releases the vendor's payment from escrow immediately. Reporting a problem keeps your money locked until our team resolves it."
            : "If something went wrong, report a problem to lock your payment in escrow while we investigate. You can confirm the job is done after the event or once the vendor marks it delivered."}
        </p>
      </div>

      {!showDispute ? (
        <div className="flex flex-wrap gap-3">
          {canConfirm && (
            <Button
              variant="gradient"
              className="gap-2"
              disabled={confirmMutation.isPending}
              onClick={() => confirmMutation.mutate()}
            >
              <CheckCircle2 className="h-4 w-4" />
              {confirmMutation.isPending ? "Releasing payment…" : "Approve — the job is done"}
            </Button>
          )}
          {canDispute && (
            <Button
              variant="outline"
              className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
              onClick={() => setShowDispute(true)}
            >
              <AlertTriangle className="h-4 w-4" />
              Report a problem
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-amber-800">
            Your payment stays locked in escrow while we review. The vendor cannot be paid
            until the dispute is resolved.
          </p>
          <Textarea
            placeholder="Describe the issue in detail (minimum 10 characters)…"
            rows={4}
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-50 gap-1"
              disabled={disputeMutation.isPending}
              onClick={() => disputeMutation.mutate()}
            >
              <AlertTriangle className="h-4 w-4" />
              {disputeMutation.isPending ? "Submitting…" : "Submit Dispute"}
            </Button>
            <Button variant="ghost" onClick={() => setShowDispute(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

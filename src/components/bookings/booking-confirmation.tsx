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
  canDispute,
}: {
  bookingId: string;
  canDispute: boolean;
}) {
  const router = useRouter();
  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [done, setDone] = useState(false);

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/bookings/${bookingId}/confirm`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to confirm");
      return res.json();
    },
    onSuccess: () => {
      setDone(true);
      router.refresh();
    },
    onError: (e) => reportClientError("booking-confirm", e),
  });

  const disputeMutation = useMutation({
    mutationFn: async () => {
      if (disputeReason.trim().length < 10) throw new Error("Please describe the issue in more detail.");
      const res = await fetch(`/api/bookings/${bookingId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: disputeReason }),
      });
      if (!res.ok) throw new Error("Failed to open dispute");
      return res.json();
    },
    onSuccess: () => {
      setDone(true);
      router.refresh();
    },
    onError: (e) => reportClientError("booking-dispute", e),
  });

  if (done) return null;

  return (
    <div
      className="rounded-2xl border border-primary/25 p-5 space-y-4"
      style={{ background: "linear-gradient(135deg,rgba(122,46,61,0.06) 0%,rgba(229,223,217,0.14) 100%)" }}
    >
      <div>
        <p className="font-display font-semibold text-base">Did the event take place successfully?</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirming will release the vendor&apos;s payment from escrow. If there was an issue, report it and our team will investigate.
        </p>
      </div>

      {!showDispute ? (
        <div className="flex flex-wrap gap-3">
          <Button
            variant="gradient"
            className="gap-2"
            disabled={confirmMutation.isPending}
            onClick={() => confirmMutation.mutate()}
          >
            <CheckCircle2 className="h-4 w-4" />
            {confirmMutation.isPending ? "Confirming…" : "Yes, it went well"}
          </Button>
          {canDispute && (
            <Button
              variant="outline"
              className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
              onClick={() => setShowDispute(true)}
            >
              <AlertTriangle className="h-4 w-4" />
              Report an issue
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
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

    </div>
  );
}

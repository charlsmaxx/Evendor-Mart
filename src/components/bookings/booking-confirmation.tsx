"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { reportClientError } from "@/lib/client-error";
import {
  apiErrorMessage,
  GENERIC_REQUEST_ERROR,
  readApiJson,
  userFacingRequestError,
} from "@/lib/api-client";
import { BookingReviewPrompt } from "@/components/bookings/booking-review-prompt";

export function BookingConfirmation({
  bookingId,
  listingId,
  listingTitle,
  vendorName,
  isVenue,
  canConfirm = true,
  canDispute,
}: {
  bookingId: string;
  listingId: string;
  listingTitle: string;
  vendorName: string;
  isVenue: boolean;
  canConfirm?: boolean;
  canDispute: boolean;
}) {
  const router = useRouter();
  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [disputed, setDisputed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!confirmed) return;
    document.getElementById("review")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [confirmed]);

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/bookings/${bookingId}/confirm`, { method: "POST" });
      const { ok, json } = await readApiJson<{
        data?: { message?: string; promptReview?: boolean };
        error?: { message?: string };
      }>(res);
      if (!ok) throw new Error(apiErrorMessage(json));
      return json?.data ?? { promptReview: true };
    },
    onMutate: () => setError(null),
    onSuccess: () => {
      setConfirmed(true);
    },
    onError: (e: Error) => {
      setError(userFacingRequestError(e, GENERIC_REQUEST_ERROR));
      reportClientError("booking-confirm", e);
      // Escrow may already have been released even if the response failed to parse.
      router.refresh();
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
      const { ok, json } = await readApiJson<{ error?: { message?: string } }>(res);
      if (!ok) throw new Error(apiErrorMessage(json));
    },
    onMutate: () => setError(null),
    onSuccess: () => {
      setDisputed(true);
      router.refresh();
    },
    onError: (e: Error) => {
      setError(userFacingRequestError(e, GENERIC_REQUEST_ERROR));
      reportClientError("booking-dispute", e);
    },
  });

  if (confirmed) {
    return (
      <div id="review" className="space-y-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <p className="font-semibold text-emerald-800">Payment released — thank you</p>
          <p className="mt-1 text-sm text-emerald-700">
            The vendor can now withdraw their earnings after settlement checks.
          </p>
        </div>
        <BookingReviewPrompt
          bookingId={bookingId}
          listingId={listingId}
          listingTitle={listingTitle}
          vendorName={vendorName}
          isVenue={isVenue}
          onSubmitted={() => router.refresh()}
        />
      </div>
    );
  }

  if (disputed) return null;

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
            ? "Approving releases the vendor's pending earnings for payout. Reporting a problem keeps your payment locked until our team resolves it."
            : "If something went wrong, report a problem to keep your payment locked while we investigate. You can confirm the job is done after the event or once the vendor marks it delivered."}
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
            Your payment stays locked while we review. The vendor cannot receive a payout
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

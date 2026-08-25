"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { apiErrorMessage, readApiJson, userFacingRequestError } from "@/lib/api-client";
import { reportClientError } from "@/lib/client-error";

export function BookingReviewPrompt({
  bookingId,
  listingId,
  listingTitle,
  vendorName,
  isVenue,
  onSubmitted,
}: {
  bookingId: string;
  listingId: string;
  listingTitle: string;
  vendorName: string;
  isVenue: boolean;
  onSubmitted?: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = useMutation({
    mutationFn: async () => {
      if (rating < 1) throw new Error("Please choose a star rating.");
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          bookingId,
          rating,
          comment: comment.trim() || undefined,
        }),
      });
      const { ok, status, json } = await readApiJson(res);
      if (!ok && status !== 409) throw new Error(apiErrorMessage(json));
    },
    onMutate: () => setError(null),
    onSuccess: () => {
      setDone(true);
      onSubmitted?.();
    },
    onError: (e: Error) => {
      setError(userFacingRequestError(e));
      reportClientError("booking-review", e);
    },
  });

  const subject = isVenue ? "this event hall" : "this vendor";

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
        <p className="font-semibold text-emerald-800">Thank you for your review</p>
        <p className="mt-1 text-sm text-emerald-700">
          Your feedback helps other people book with confidence on Evendor.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/25 bg-card p-5 shadow-sm">
      <p className="font-display text-base font-semibold">How was {vendorName}?</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Please write a short review for {subject}
        {listingTitle ? ` — ${listingTitle}` : ""}.
      </p>

      <div className="mt-4 flex gap-1" role="radiogroup" aria-label="Star rating">
        {[1, 2, 3, 4, 5].map((value) => {
          const active = (hover || rating) >= value;
          return (
            <button
              key={value}
              type="button"
              aria-label={`${value} star${value === 1 ? "" : "s"}`}
              onMouseEnter={() => setHover(value)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(value)}
              className="rounded-md p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Star
                className={cn(
                  "h-8 w-8 transition",
                  active ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"
                )}
              />
            </button>
          );
        })}
      </div>

      <Textarea
        className="mt-4"
        rows={4}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="What went well? Anything the next customer should know?"
      />

      {error ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button
        type="button"
        variant="gradient"
        className="mt-4"
        disabled={submit.isPending}
        onClick={() => submit.mutate()}
      >
        {submit.isPending ? "Submitting…" : "Submit review"}
      </Button>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { reportClientError } from "@/lib/client-error";

interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  vendorReply: string | null;
  repliedAt: string | null;
  createdAt: string;
  user: { fullName: string | null; avatarUrl: string | null };
  listing: { id: string; title: string; slug: string };
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: ReviewRow }) {
  const qc = useQueryClient();
  const [reply, setReply] = useState(review.vendorReply ?? "");
  const [editing, setEditing] = useState(!review.vendorReply);

  const replyMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/vendor/reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorReply: reply }),
      }).then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message ?? "Failed to save reply");
        return json.data;
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendor-reviews"] });
      setEditing(false);
    },
    onError: (e) => reportClientError("vendor-reviews", e),
  });

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{review.user.fullName ?? "Customer"}</p>
          <Link
            href={`/vendors/${review.listing.slug}`}
            className="text-sm text-primary hover:underline"
          >
            {review.listing.title}
          </Link>
        </div>
        <Stars rating={review.rating} />
      </div>

      {review.comment && (
        <p className="mt-3 text-sm text-muted-foreground">{review.comment}</p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        {new Date(review.createdAt).toLocaleDateString()}
      </p>

      <div className="mt-4 border-t border-border pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Your reply</p>
        {editing ? (
          <div className="mt-2 space-y-2">
            <Textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Thank the customer or address their feedback…"
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="gradient"
                onClick={() => replyMutation.mutate()}
                disabled={!reply.trim() || replyMutation.isPending}
              >
                {replyMutation.isPending ? "Saving…" : "Post reply"}
              </Button>
              {review.vendorReply && (
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-2">
            <p className="text-sm">{review.vendorReply}</p>
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => setEditing(true)}>
              Edit reply
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function VendorReviewsPanel() {
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["vendor-reviews"],
    queryFn: async () => {
      const res = await fetch("/api/vendor/reviews");
      const json = await res.json();
      return (json.data ?? []) as ReviewRow[];
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Loading reviews…</p>;
  if (reviews.length === 0) {
    return <p className="text-muted-foreground">No reviews yet. They will appear here when customers rate your listings.</p>;
  }

  return (
    <div className="space-y-4">
      {reviews.map((r) => (
        <ReviewCard key={r.id} review={r} />
      ))}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { VendorPageHeader, VendorSkeleton } from "@/components/vendor/vendor-ui";

type QuoteDetails = {
  eventType?: string;
  location?: string;
  guestCount?: number;
  listingTitle?: string;
};

type Lead = {
  id: string;
  message: string;
  status: string;
  budget: number | null;
  eventDate: string | null;
  details: QuoteDetails | null;
  createdAt: string;
  customer: { fullName: string | null; email: string };
  listing: { title: string } | null;
};

export default function VendorLeadsPage() {
  const qc = useQueryClient();
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [response, setResponse] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["vendor-leads"],
    queryFn: async () => {
      const res = await fetch("/api/quotes");
      const json = await res.json();
      return (json.data ?? []) as Lead[];
    },
  });

  const updateLead = useMutation({
    mutationFn: async ({
      id,
      status,
      response: msg,
    }: {
      id: string;
      status: "ACCEPTED" | "DECLINED";
      response?: string;
    }) => {
      const res = await fetch(`/api/quotes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, response: msg }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error?.message ?? "Failed");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendor-leads"] });
      setRespondingId(null);
      setResponse("");
    },
  });

  if (isLoading) return <VendorSkeleton />;

  const pending = (data ?? []).filter((q) => q.status === "PENDING");
  const processed = (data ?? []).filter((q) => q.status !== "PENDING");

  return (
    <div className="space-y-8">
      <VendorPageHeader
        title="Quote Leads"
        subtitle="Respond to customer quote requests from your profile pages."
      />

      {pending.length === 0 && processed.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">
          No leads yet. Customers can request quotes from your public profile.
        </p>
      )}

      {pending.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-semibold">Pending ({pending.length})</h2>
          {pending.map((q) => {
            const details = q.details ?? {};
            return (
              <div
                key={q.id}
                className="rounded-2xl border border-border/80 bg-card/80 p-5 backdrop-blur-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{q.customer.fullName ?? q.customer.email}</p>
                    {(q.listing || details.listingTitle) && (
                      <p className="text-sm text-muted-foreground">
                        {q.listing?.title ?? details.listingTitle}
                      </p>
                    )}
                  </div>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    {q.status}
                  </span>
                </div>

                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  {details.eventType && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Event type</dt>
                      <dd>{details.eventType}</dd>
                    </div>
                  )}
                  {details.location && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Location</dt>
                      <dd>{details.location}</dd>
                    </div>
                  )}
                  {details.guestCount != null && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Guests</dt>
                      <dd>{details.guestCount}</dd>
                    </div>
                  )}
                  {q.eventDate && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Event date</dt>
                      <dd>{format(new Date(q.eventDate), "MMM d, yyyy")}</dd>
                    </div>
                  )}
                  {q.budget != null && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Budget</dt>
                      <dd>{formatCurrency(q.budget)}</dd>
                    </div>
                  )}
                </dl>

                <p className="mt-3 text-sm leading-relaxed">{q.message}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Received {format(new Date(q.createdAt), "MMM d, yyyy")}
                </p>

                {respondingId === q.id ? (
                  <div className="mt-4 space-y-3 border-t border-border pt-4">
                    <Textarea
                      placeholder="Optional message to the customer..."
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      rows={2}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="gradient"
                        size="sm"
                        className="gap-1"
                        disabled={updateLead.isPending}
                        onClick={() =>
                          updateLead.mutate({ id: q.id, status: "ACCEPTED", response })
                        }
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Accept & notify
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-red-600"
                        disabled={updateLead.isPending}
                        onClick={() =>
                          updateLead.mutate({ id: q.id, status: "DECLINED", response })
                        }
                      >
                        <XCircle className="h-3.5 w-3.5" /> Decline
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setRespondingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="gradient" onClick={() => setRespondingId(q.id)}>
                      Respond
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => updateLead.mutate({ id: q.id, status: "ACCEPTED" })}
                      disabled={updateLead.isPending}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Quick accept
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {processed.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-muted-foreground">Processed</h2>
          {processed.map((q) => (
            <div key={q.id} className="rounded-xl border border-border/60 p-4 opacity-80">
              <div className="flex justify-between">
                <p className="font-medium">{q.customer.fullName ?? q.customer.email}</p>
                <span className="text-xs capitalize">{q.status.toLowerCase()}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{q.message}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

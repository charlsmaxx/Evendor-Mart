"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { VendorPageHeader, VendorSection, VendorSkeleton } from "@/components/vendor/vendor-ui";
import { EvidenceFileUpload, EvidenceLink } from "@/components/vendor/evidence-file-upload";

type Dispute = {
  id: string;
  status: string;
  reason: string;
  resolution: string | null;
  adminNotes: string | null;
  createdAt: string;
  booking: {
    id: string;
    eventDate: string;
    totalAmount: number;
    listing: { title: string };
    customer: { fullName: string | null };
  };
  evidence: { id: string; url: string; caption: string | null }[];
};

export default function VendorDisputesPage() {
  const qc = useQueryClient();
  const [captions, setCaptions] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["vendor-disputes"],
    queryFn: async () => {
      const res = await fetch("/api/vendor/disputes");
      const json = await res.json();
      return (json.data ?? []) as Dispute[];
    },
  });

  const uploadEvidence = useMutation({
    mutationFn: async ({
      disputeId,
      url,
      publicId,
      caption,
    }: {
      disputeId: string;
      url: string;
      publicId: string;
      caption?: string;
    }) => {
      const res = await fetch("/api/vendor/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disputeId, url, publicId, caption }),
      });
      if (!res.ok) throw new Error("Upload failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendor-disputes"] }),
  });

  if (isLoading) return <VendorSkeleton />;

  const open = (data ?? []).filter((d) => d.status === "OPEN");
  const resolved = (data ?? []).filter((d) => d.status !== "OPEN");

  return (
    <div className="space-y-8">
      <VendorPageHeader
        title="Dispute Center"
        subtitle="Review disputes, upload evidence, and track resolutions."
      />

      <VendorSection title={`Open Disputes (${open.length})`}>
        {open.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No open disputes.</p>
        ) : (
          <div className="space-y-4">
            {open.map((d) => (
              <div key={d.id} className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
                  <div className="flex-1">
                    <p className="font-semibold">{d.booking.listing.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {d.booking.customer.fullName ?? "Customer"} ·{" "}
                      {format(new Date(d.booking.eventDate), "MMM d, yyyy")} ·{" "}
                      {formatCurrency(d.booking.totalAmount)}
                    </p>
                    <p className="mt-2 text-sm">{d.reason}</p>
                    {d.evidence.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {d.evidence.map((e) => (
                          <EvidenceLink key={e.id} url={e.url} />
                        ))}
                      </div>
                    )}
                    <div className="mt-3 space-y-2">
                      <Input
                        placeholder="Caption (optional)"
                        value={captions[d.id] ?? ""}
                        onChange={(e) => setCaptions((s) => ({ ...s, [d.id]: e.target.value }))}
                        className="max-w-sm"
                      />
                      <EvidenceFileUpload
                        purpose="evidence"
                        label="Upload evidence file"
                        disabled={uploadEvidence.isPending}
                        onUploaded={(result) =>
                          uploadEvidence.mutate({
                            disputeId: d.id,
                            url: result.url,
                            publicId: result.publicId,
                            caption: captions[d.id]?.trim() || undefined,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </VendorSection>

      <VendorSection title={`Resolved (${resolved.length})`}>
        {resolved.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No resolved disputes.</p>
        ) : (
          <div className="space-y-3">
            {resolved.map((d) => (
              <div key={d.id} className="flex items-start gap-3 rounded-xl border border-border/60 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                <div>
                  <p className="font-medium">{d.booking.listing.title}</p>
                  <p className="text-sm text-muted-foreground capitalize">{d.status.toLowerCase()}</p>
                  {d.resolution && <p className="mt-1 text-sm">{d.resolution}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </VendorSection>
    </div>
  );
}

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EvidenceFileUpload, EvidenceLink } from "@/components/vendor/evidence-file-upload";

type Evidence = { id: string; url: string; caption: string | null };

export function CustomerDisputeEvidence({ bookingId }: { bookingId: string }) {
  const qc = useQueryClient();

  const { data: evidence = [] } = useQuery({
    queryKey: ["dispute-evidence", bookingId],
    queryFn: async () => {
      const res = await fetch(`/api/bookings/${bookingId}/dispute/evidence`);
      const json = await res.json();
      return (json.data ?? []) as Evidence[];
    },
  });

  const uploadEvidence = useMutation({
    mutationFn: async (payload: { url: string; publicId: string; caption?: string }) => {
      const res = await fetch(`/api/bookings/${bookingId}/dispute/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Upload failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dispute-evidence", bookingId] }),
  });

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
        <AlertTriangle className="h-4 w-4" /> Dispute evidence
      </p>
      <p className="text-sm text-amber-800">
        Upload photos or documents to support your dispute. Our team will review within 24–48 hours.
      </p>
      {evidence.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {evidence.map((e) => (
            <EvidenceLink key={e.id} url={e.url} />
          ))}
        </div>
      )}
      <Input placeholder="Caption (optional)" id={`caption-${bookingId}`} className="max-w-sm" />
      <EvidenceFileUpload
        purpose="evidence"
        label="Upload evidence file"
        disabled={uploadEvidence.isPending}
        onUploaded={(result) => {
          const caption = (
            document.getElementById(`caption-${bookingId}`) as HTMLInputElement
          )?.value?.trim();
          uploadEvidence.mutate({
            url: result.url,
            publicId: result.publicId,
            caption: caption || undefined,
          });
        }}
      />
    </div>
  );
}

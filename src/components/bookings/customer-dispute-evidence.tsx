"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EvidenceFileUpload, EvidenceLink } from "@/components/vendor/evidence-file-upload";
import { reportClientError } from "@/lib/client-error";

type Evidence = { id: string; url: string; caption: string | null };

export function CustomerDisputeEvidence({ bookingId }: { bookingId: string }) {
  const qc = useQueryClient();
  const router = useRouter();
  const [cancelError, setCancelError] = useState<string | null>(null);

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

  const cancelDisputeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/bookings/${bookingId}/dispute`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error?.message ?? "Could not cancel dispute");
      return json;
    },
    onMutate: () => setCancelError(null),
    onSuccess: () => {
      router.refresh();
      router.replace(`/bookings/${bookingId}#confirm`);
    },
    onError: (e: Error) => {
      setCancelError(e.message);
      reportClientError("dispute-cancel", e);
    },
  });

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
        <AlertTriangle className="h-4 w-4" /> Dispute evidence
      </p>
      <p className="text-sm text-amber-800">
        Upload photos or documents to support your dispute. Our team will review within 24–48 hours.
        An Evendor Admin message was also posted in your chat with the vendor.
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

      <div className="space-y-2 border-t border-amber-200/80 pt-3">
        <p className="text-xs text-amber-800">
          Changed your mind? You can cancel this dispute. Escrow stays locked until you confirm
          the job or the automatic release window ends.
        </p>
        <Button
          type="button"
          variant="outline"
          className="border-amber-300 text-amber-900 hover:bg-amber-100"
          disabled={cancelDisputeMutation.isPending}
          onClick={() => {
            if (
              typeof window !== "undefined" &&
              !window.confirm(
                "Cancel this dispute? Escrow will stay locked until you confirm delivery."
              )
            ) {
              return;
            }
            cancelDisputeMutation.mutate();
          }}
        >
          {cancelDisputeMutation.isPending ? "Cancelling…" : "Cancel dispute"}
        </Button>
        {cancelError && <p className="text-sm text-red-700">{cancelError}</p>}
      </div>
    </div>
  );
}

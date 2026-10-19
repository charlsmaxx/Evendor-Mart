"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { ensureApiResponseOk } from "@/lib/parse-paginated-api-response";

export default function AdminListingsPage() {
  const qc = useQueryClient();
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [mutationNotice, setMutationNotice] = useState<string | null>(null);
  const { data } = useQuery({
    queryKey: ["admin-listings"],
    queryFn: async () => (await fetch("/api/admin/listings")).json().then((j) => j.data ?? []),
  });

  const mutate = useMutation({
    mutationFn: async (body: { listingId: string; status?: string; featured?: boolean }) => {
      const res = await fetch("/api/admin/listings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await ensureApiResponseOk(res);
      return res;
    },
    onSuccess: () => {
      setMutationError(null);
      setMutationNotice(null);
      return qc.invalidateQueries({ queryKey: ["admin-listings"] });
    },
    onError: (error) => {
      setMutationNotice(null);
      setMutationError(error.message);
    },
  });

  const archiveVenue = useMutation({
    mutationFn: async (venue: { id: string; title: string }) => {
      const res = await fetch("/api/admin/listings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: venue.id }),
      });
      await ensureApiResponseOk(res);
      return res;
    },
    onSuccess: (_response, venue) => {
      setMutationError(null);
      setMutationNotice(`${venue.title} was archived. Its historical records were retained.`);
      return qc.invalidateQueries({ queryKey: ["admin-listings"] });
    },
    onError: (error) => {
      setMutationNotice(null);
      setMutationError(error.message);
    },
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Venues & Listings"
        subtitle="Moderation queue — approve, reject, feature, or promote listings."
      />
      {mutationError && (
        <p role="alert" className="text-sm text-red-400">
          {mutationError}
        </p>
      )}
      {mutationNotice && (
        <p role="status" className="text-sm text-emerald-400">
          {mutationNotice}
        </p>
      )}
      <div className="space-y-3">
        {(data ?? []).map((l: {
          id: string;
          title: string;
          status: string;
          type: string;
          city: string;
          featured: boolean;
          verified: boolean;
          vendor: { businessName: string };
        }) => (
          <div
            key={l.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#1a1215]/60 p-4"
          >
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-4 w-4 text-[#7A2E3D]" />
              <div>
                <p className="font-semibold text-[#E5DFD9]">{l.title}</p>
                <p className="text-sm text-[#E5DFD9]/40">
                  {l.vendor?.businessName} · {l.city} · {l.type} · {l.status}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="gradient" onClick={() => mutate.mutate({ listingId: l.id, status: "PUBLISHED" })}>
                Approve
              </Button>
              <Button size="sm" variant="outline" className="border-red-500/30 text-red-400" onClick={() => mutate.mutate({ listingId: l.id, status: "REJECTED" })}>
                Reject
              </Button>
              <Button size="sm" variant="outline" onClick={() => mutate.mutate({ listingId: l.id, featured: !l.featured })}>
                {l.featured ? "Unfeature" : "Feature"}
              </Button>
              {l.type === "VENUE" && l.status !== "ARCHIVED" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-500/30 text-red-400"
                  onClick={() => {
                    const confirmed = window.confirm(
                      `Archive venue ${l.title} for ${l.vendor.businessName}? It will be removed from the marketplace while its booking and financial history is retained.`
                    );
                    if (confirmed) archiveVenue.mutate({ id: l.id, title: l.title });
                  }}
                >
                  Archive
                </Button>
              )}
            </div>
          </div>
        ))}
        {!data?.length && <p className="text-sm text-[#E5DFD9]/40">Moderation queue is empty.</p>}
      </div>
    </div>
  );
}

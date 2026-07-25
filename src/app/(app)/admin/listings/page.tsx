"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/admin-ui";

export default function AdminListingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-listings"],
    queryFn: async () => (await fetch("/api/admin/listings")).json().then((j) => j.data ?? []),
  });

  const mutate = useMutation({
    mutationFn: (body: { listingId: string; status?: string; featured?: boolean }) =>
      fetch("/api/admin/listings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-listings"] }),
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Venues & Listings"
        subtitle="Moderation queue — approve, reject, feature, or promote listings."
      />
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
            </div>
          </div>
        ))}
        {!data?.length && <p className="text-sm text-[#E5DFD9]/40">Moderation queue is empty.</p>}
      </div>
    </div>
  );
}

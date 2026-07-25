"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { BadgeCheck, Building2, Store, XCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/admin-ui";

type Verification = {
  id: string;
  documents: string[];
  notes?: string;
  status: string;
  createdAt: string;
  vendor: {
    id: string;
    businessName: string;
    city: string;
    category: string;
    user: { fullName?: string; email: string };
    listings: { id: string; type: string; status: string }[];
  };
};

export function AdminVerificationCenter() {
  const [tab, setTab] = useState<"all" | "venue" | "vendor">("all");
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["admin-verifications"],
    queryFn: async () => (await fetch("/api/admin/verifications")).json().then((j) => j.data as Verification[]),
  });

  const review = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) => {
      await fetch(`/api/admin/verifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-verifications"] }),
  });

  const filtered = (data ?? []).filter((v) => {
    if (tab === "all") return true;
    const hasVenue = v.vendor.listings.some((l) => l.type === "VENUE");
    return tab === "venue" ? hasVenue : !hasVenue || v.vendor.listings.every((l) => l.type !== "VENUE");
  });

  const pending = filtered.filter((v) => v.status === "PENDING");

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Verification Center"
        subtitle="Review vendor and venue verification applications. CAC is optional — at least one valid document required."
      />

      <div className="flex gap-1.5 rounded-xl border border-white/10 bg-[#1a1215]/40 p-1">
        {[
          { id: "all" as const, label: "All", icon: BadgeCheck },
          { id: "venue" as const, label: "Venues", icon: Building2 },
          { id: "vendor" as const, label: "Vendors", icon: Store },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition ${
              tab === t.id ? "bg-[#7A2E3D]/30 text-[#E5DFD9]" : "text-[#E5DFD9]/40 hover:text-[#E5DFD9]"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {pending.map((v) => {
          const venueListings = v.vendor.listings.filter((l) => l.type === "VENUE");
          const profileCompletion = Math.min(
            100,
            40 +
              (v.documents.length > 0 ? 30 : 0) +
              (v.vendor.listings.length > 0 ? 20 : 0) +
              (venueListings.length > 0 ? 10 : 0)
          );

          return (
            <div key={v.id} className="rounded-2xl border border-white/10 bg-[#1a1215]/60 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-[#E5DFD9]">{v.vendor.businessName}</p>
                  <p className="text-sm text-[#E5DFD9]/40">
                    {v.vendor.user.email} · {v.vendor.city} · {v.vendor.category.replace("_", " ")}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-[#7A2E3D]"
                        style={{ width: `${profileCompletion}%` }}
                      />
                    </div>
                    <span className="text-xs text-[#E5DFD9]/40">{profileCompletion}% complete</span>
                  </div>
                  {v.notes && <p className="mt-2 text-sm text-[#E5DFD9]/50">{v.notes}</p>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {v.documents.map((doc, i) => (
                      <a
                        key={i}
                        href={doc}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[#7A2E3D] underline"
                      >
                        Document {i + 1}
                      </a>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="gradient"
                    className="gap-1"
                    disabled={review.isPending}
                    onClick={() => review.mutate({ id: v.id, action: "APPROVE" })}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                    disabled={review.isPending}
                    onClick={() => review.mutate({ id: v.id, action: "REJECT" })}
                  >
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={review.isPending}
                    onClick={() => review.mutate({ id: v.id, action: "REQUEST_MORE" })}
                  >
                    Request More
                  </Button>
                </div>
              </div>
              <p className="mt-2 text-[10px] text-[#E5DFD9]/30">
                Submitted {format(new Date(v.createdAt), "MMM d, yyyy")}
              </p>
            </div>
          );
        })}
        {pending.length === 0 && (
          <p className="py-12 text-center text-sm text-[#E5DFD9]/40">No pending verifications in this tab.</p>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Archive, BadgeCheck, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { ensureApiResponseOk, parsePaginatedApiResponse } from "@/lib/parse-paginated-api-response";

type AdminVendor = {
  id: string;
  businessName: string;
  city: string;
  verified: boolean;
  featured: boolean;
  verificationStatus: string;
  ratingAvg: number;
  reviewCount: number;
  cancellationRate: number | null;
  disputeRate: number | null;
  listingCount?: number;
  businessPhone: string | null;
  user: { email: string; fullName?: string };
};

export default function AdminVendorsPage() {
  const [page, setPage] = useState(1);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [mutationNotice, setMutationNotice] = useState<string | null>(null);
  const qc = useQueryClient();
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-vendors", page],
    queryFn: async () => {
      const res = await fetch(`/api/admin/vendors?page=${page}&limit=${limit}`);
      const parsed = await parsePaginatedApiResponse<AdminVendor>(res);
      if (!parsed.ok) throw new Error(parsed.message);
      return { vendors: parsed.data, meta: parsed.meta! };
    },
  });

  const mutate = useMutation({
    mutationFn: async (body: { vendorId: string; verified?: boolean; featured?: boolean }) => {
      const res = await fetch("/api/admin/vendors", {
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
      return qc.invalidateQueries({ queryKey: ["admin-vendors"] });
    },
    onError: (error) => {
      setMutationNotice(null);
      setMutationError(error.message);
    },
  });

  const archiveBusiness = useMutation({
    mutationFn: async (vendor: AdminVendor) => {
      const res = await fetch("/api/admin/vendors", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId: vendor.id }),
      });
      await ensureApiResponseOk(res);
      return res;
    },
    onSuccess: (_response, vendor) => {
      setMutationError(null);
      setMutationNotice(`${vendor.businessName} was archived. Its historical records were retained.`);
      return qc.invalidateQueries({ queryKey: ["admin-vendors"] });
    },
    onError: (error) => {
      setMutationNotice(null);
      setMutationError(error.message);
    },
  });

  const vendors = data?.vendors ?? [];
  const meta = data?.meta;
  const totalPages = meta ? Math.max(1, Math.ceil(meta.total / meta.limit)) : 1;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Vendors"
        subtitle="Manage vendor profiles, verification badges, and featured placement."
        action={<Button asChild size="sm" variant="outline"><Link href="/admin/archived-businesses">Archived Businesses</Link></Button>}
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
        {vendors.map((v) => (
          <div
            key={v.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#1a1215]/60 p-4"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-[#E5DFD9]">{v.businessName}</p>
                {v.verified && (
                  <span className="flex items-center gap-0.5 text-xs text-emerald-400">
                    <BadgeCheck className="h-3 w-3" /> Verified
                  </span>
                )}
                {v.featured && (
                  <span className="rounded-full bg-[#7A2E3D]/30 px-2 py-0.5 text-[10px] text-[#E5DFD9]">
                    Featured
                  </span>
                )}
              </div>
              <p className="text-sm text-[#E5DFD9]/40">
                {v.user?.email} · {v.city} · {v.listingCount ?? 0} listings
              </p>
              {v.businessPhone && (
                <p className="mt-1 flex items-center gap-1 text-xs text-[#E5DFD9]/30 font-mono">
                  📞 {v.businessPhone}
                </p>
              )}
              <p className="mt-1 flex items-center gap-1 text-xs text-[#E5DFD9]/30">
                <Star className="h-3 w-3 text-amber-400" />
                {v.ratingAvg.toFixed(1)} ({v.reviewCount} reviews)
                {v.cancellationRate != null && ` · Cancel ${v.cancellationRate}%`}
                {v.disputeRate != null && ` · Disputes ${v.disputeRate}%`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={v.verified ? "default" : "outline"}
                onClick={() => mutate.mutate({ vendorId: v.id, verified: !v.verified })}
              >
                {v.verified ? "Verified" : "Verify"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => mutate.mutate({ vendorId: v.id, featured: !v.featured })}
              >
                {v.featured ? "Unfeature" : "Feature"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-500/30 text-red-400"
                onClick={() => {
                  const confirmed = window.confirm(
                    `Archive ${v.businessName}? Its listings will be removed from the marketplace. Booking, payment, payout, dispute, and audit history will be retained.`
                  );
                  if (confirmed) archiveBusiness.mutate(v);
                }}
              >
                <Archive className="mr-1 h-3.5 w-3.5" /> Archive
              </Button>
            </div>
          </div>
        ))}
        {!isLoading && !vendors.length && (
          <p className="text-sm text-[#E5DFD9]/40">No vendors yet.</p>
        )}
      </div>

      {meta && totalPages > 1 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-[#E5DFD9]/50">
            Page {meta.page} of {totalPages} · {meta.total} vendors
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!meta.hasMore}
              onClick={() => setPage((p) => p + 1)}
              className="gap-1"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

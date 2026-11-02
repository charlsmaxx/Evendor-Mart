"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArchiveRestore, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { ConfirmModal } from "@/components/vendor/vendor-ui";
import { Button } from "@/components/ui/button";
import { ensureApiResponseOk, parsePaginatedApiResponse } from "@/lib/parse-paginated-api-response";

type ArchivedBusiness = {
  id: string;
  entityType: "VENDOR" | "VENUE";
  name: string;
  category: string;
  location: string;
  archivedAt: string;
  status: string;
  canRestore: boolean;
  restoreUnavailableReason: string | null;
};

export default function ArchivedBusinessesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [selected, setSelected] = useState<ArchivedBusiness | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const qc = useQueryClient();
  const limit = 25;
  const query = useQuery({
    queryKey: ["admin-archived-businesses", page, search, type],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), search, type });
      const response = await fetch(`/api/admin/archived-businesses?${params}`);
      const parsed = await parsePaginatedApiResponse<ArchivedBusiness>(response);
      if (!parsed.ok) throw new Error(parsed.message);
      return { entries: parsed.data, meta: parsed.meta! };
    },
  });
  const restore = useMutation({
    mutationFn: async (business: ArchivedBusiness) => {
      const response = await fetch("/api/admin/archived-businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: business.id, entityType: business.entityType }),
      });
      await ensureApiResponseOk(response);
    },
    onSuccess: async () => {
      setError("");
      setNotice(`${selected?.name ?? "Business"} was restored. Its previous publication states were retained; featured placement remains off.`);
      setSelected(null);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-archived-businesses"] }),
        qc.invalidateQueries({ queryKey: ["admin-vendors"] }),
        qc.invalidateQueries({ queryKey: ["admin-listings"] }),
      ]);
    },
    onError: (cause) => {
      setNotice("");
      setError(cause instanceof Error ? cause.message : "Restore failed. Please retry.");
    },
  });
  const meta = query.data?.meta;
  const pages = meta ? Math.max(1, Math.ceil(meta.total / meta.limit)) : 1;

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Archived Businesses" subtitle="Review and restore archived vendors and event venues." />
      {notice && <p role="status" className="text-sm text-emerald-400">{notice}</p>}
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input aria-label="Search archived businesses" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name, category, or location" className="h-10 w-full rounded-xl border border-white/10 bg-[#1a1215]/60 pl-9 pr-3 text-sm text-[#E5DFD9]" />
        </label>
        <select aria-label="Filter business type" value={type} onChange={(event) => { setType(event.target.value); setPage(1); }} className="h-10 rounded-xl border border-white/10 bg-[#1a1215] px-3 text-sm text-[#E5DFD9]">
          <option value="all">All types</option><option value="vendor">Vendors</option><option value="venue">Event venues</option>
        </select>
      </div>
      <div className="space-y-3">
        {(query.data?.entries ?? []).map((business) => (
          <article key={`${business.entityType}:${business.id}`} className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-[#1a1215]/60 p-4 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold text-[#E5DFD9]">{business.name}</h2>
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#E5DFD9]/60">{business.entityType === "VENDOR" ? "Vendor" : "Event venue"}</span>
              </div>
              <p className="mt-1 text-sm text-[#E5DFD9]/50">{business.category} · {business.location || "Location unavailable"}</p>
              <p className="mt-1 text-xs text-[#E5DFD9]/40">Archived {new Date(business.archivedAt).toLocaleString()} · {business.status}</p>
              {!business.canRestore && <p className="mt-2 text-xs text-amber-300">{business.restoreUnavailableReason}</p>}
            </div>
            <Button size="sm" variant="outline" disabled={!business.canRestore || restore.isPending} onClick={() => setSelected(business)}>
              <ArchiveRestore className="mr-1.5 h-4 w-4" /> Restore
            </Button>
          </article>
        ))}
        {!query.isLoading && !query.isError && !query.data?.entries.length && <p className="rounded-xl border border-white/10 p-6 text-center text-sm text-[#E5DFD9]/50">No archived businesses match this search.</p>}
        {query.isLoading && <p className="p-6 text-center text-sm text-[#E5DFD9]/50">Loading archived businesses…</p>}
        {query.isError && <p role="alert" className="p-6 text-center text-sm text-red-400">{query.error.message}</p>}
      </div>
      {meta && pages > 1 && <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-[#E5DFD9]/50">Page {meta.page} of {pages} · {meta.total} archived</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft className="h-4 w-4" /> Previous</Button>
          <Button size="sm" variant="outline" disabled={!meta.hasMore} onClick={() => setPage((value) => value + 1)}>Next <ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>}
      <ConfirmModal open={!!selected} title="Restore archived business?" message={selected ? `Restore ${selected.name} (${selected.entityType === "VENDOR" ? "vendor" : "event venue"})? Its recorded listing states will be restored. It will not be featured, and unpublished listings will remain unpublished.` : ""} confirmLabel="Restore business" loading={restore.isPending} onCancel={() => setSelected(null)} onConfirm={() => selected && restore.mutate(selected)} />
    </div>
  );
}

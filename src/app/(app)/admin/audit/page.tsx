"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Search, Download } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { ACTIVITY_LABELS } from "@/lib/admin-dashboard";

type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: unknown;
  createdAt: string;
  actor?: { email: string; fullName?: string } | null;
};

export default function AdminAuditPage() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const { data } = useQuery({
    queryKey: ["admin-audit", search, actionFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (actionFilter !== "all") params.set("action", actionFilter);
      const res = await fetch(`/api/admin/audit?${params}`);
      return (await res.json()).data as AuditLog[];
    },
  });

  function exportCsv() {
    if (!data?.length) return;
    const rows = [
      ["Timestamp", "Action", "Entity", "Actor", "Entity ID"].join(","),
      ...data.map((log) =>
        [
          log.createdAt,
          log.action,
          log.entityType,
          log.actor?.email ?? "system",
          log.entityId ?? "",
        ].join(",")
      ),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `evendor-audit-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const actions = Array.from(new Set((data ?? []).map((l) => l.action)));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Audit Logs"
        subtitle="Complete platform activity history — searchable, filterable, exportable."
        action={
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#7A2E3D]/20 px-4 py-2 text-sm font-medium text-[#E5DFD9] hover:bg-[#7A2E3D]/30"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#E5DFD9]/30" />
          <input
            className="w-full rounded-xl border border-white/10 bg-[#1a1215]/60 py-2.5 pl-10 pr-4 text-sm text-[#E5DFD9] placeholder:text-[#E5DFD9]/30 focus:outline-none focus:ring-2 focus:ring-[#7A2E3D]/50"
            placeholder="Search by action, entity, or actor…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="rounded-xl border border-white/10 bg-[#1a1215]/60 px-3 py-2.5 text-sm text-[#E5DFD9] focus:outline-none"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        >
          <option value="all">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {ACTIVITY_LABELS[a] ?? a}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1 rounded-2xl border border-white/10 bg-[#1a1215]/60 p-2">
        {(data ?? []).map((log) => (
          <div
            key={log.id}
            className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl px-3 py-2.5 hover:bg-white/[0.03]"
          >
            <div className="min-w-0">
              <span className="rounded bg-[#7A2E3D]/20 px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#E5DFD9]/80">
                {ACTIVITY_LABELS[log.action] ?? log.action}
              </span>
              <span className="ml-2 text-xs text-[#E5DFD9]/40">{log.entityType}</span>
              {log.entityId && (
                <span className="ml-1 font-mono text-[10px] text-[#E5DFD9]/25">{log.entityId.slice(0, 8)}…</span>
              )}
              <span className="ml-2 text-xs text-[#E5DFD9]/30">
                {log.actor?.fullName ?? log.actor?.email ?? "system"}
              </span>
            </div>
            <span className="shrink-0 text-[10px] text-[#E5DFD9]/30">
              {format(new Date(log.createdAt), "MMM d, yyyy HH:mm:ss")}
            </span>
          </div>
        ))}
        {!data?.length && (
          <p className="py-8 text-center text-sm text-[#E5DFD9]/40">No audit logs match your filters.</p>
        )}
      </div>
    </div>
  );
}

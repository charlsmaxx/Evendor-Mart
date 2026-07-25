"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { Activity } from "lucide-react";
import { ACTIVITY_LABELS } from "@/lib/admin-dashboard";
import { useAdminAuditRealtime, useAuditRealtimeLive } from "@/components/admin/use-admin-audit-realtime";
import { useAdminSessionGuard } from "@/components/admin/use-admin-me";
import { ClientErrorBoundary } from "@/components/client-error-boundary";

type ActivityItem = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  actorName: string;
  createdAt: string;
};

export function AdminActivityPanel({ compact }: { compact?: boolean }) {
  return (
    <ClientErrorBoundary scope="admin-activity-panel" fallback={<ActivityPanelShell compact={compact} />}>
      <AdminActivityPanelInner compact={compact} />
    </ClientErrorBoundary>
  );
}

function ActivityPanelShell({ compact }: { compact?: boolean }) {
  return (
    <aside
      className={
        compact
          ? "rounded-2xl border border-white/10 bg-[#1a1215]/60 p-4"
          : "hidden w-72 shrink-0 flex-col border-l border-white/10 bg-[#1a1215]/40 xl:flex"
      }
    >
      <div className="mb-4 flex items-center gap-2 px-1">
        <Activity className="h-4 w-4 text-[#7A2E3D]" />
        <p className="text-sm font-semibold text-[#E5DFD9]">Live Activity</p>
      </div>
      <p className="px-1 text-xs text-[#E5DFD9]/40">Activity feed unavailable.</p>
    </aside>
  );
}

function AdminActivityPanelInner({ compact }: { compact?: boolean }) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const isLive = useAuditRealtimeLive();
  const { isAdminReady } = useAdminSessionGuard();

  const loadInitial = useCallback(async () => {
    if (!isAdminReady) return;
    try {
      const res = await fetch("/api/admin/activity", { credentials: "same-origin" });
      if (res.status === 401) return;
      const json = await res.json();
      if (res.ok) setItems(json.data ?? []);
    } catch {
      /* offline / HMR — polling retries */
    } finally {
      setLoading(false);
    }
  }, [isAdminReady]);

  useEffect(() => {
    if (!isAdminReady) return;
    void loadInitial();
  }, [loadInitial, isAdminReady]);

  /* Poll when Realtime is offline (1006 / paused Supabase / dev HMR). */
  useEffect(() => {
    if (!isAdminReady || isLive) return;
    const timer = setInterval(() => void loadInitial(), 30_000);
    return () => clearInterval(timer);
  }, [isLive, loadInitial, isAdminReady]);

  useAdminAuditRealtime((item) => {
    setItems((prev) => {
      if (prev.some((p) => p.id === item.id)) return prev;
      return [item, ...prev].slice(0, 40);
    });
  });

  return (
    <aside
      className={
        compact
          ? "rounded-2xl border border-white/10 bg-[#1a1215]/60 p-4"
          : "hidden w-72 shrink-0 flex-col border-l border-white/10 bg-[#1a1215]/40 xl:flex"
      }
    >
      <div className="mb-4 flex items-center gap-2 px-1">
        <Activity className="h-4 w-4 text-[#7A2E3D]" />
        <p className="text-sm font-semibold text-[#E5DFD9]">Live Activity</p>
        <span
          className={`ml-auto h-2 w-2 rounded-full ${isLive ? "animate-pulse bg-emerald-500" : "bg-amber-500/80"}`}
          title={isLive ? "Realtime connected" : "Polling every 30s"}
        />
      </div>
      <div className={`space-y-2 overflow-y-auto ${compact ? "max-h-64" : "flex-1 max-h-[calc(100vh-12rem)]"}`}>
        {loading && items.length === 0 && (
          <p className="px-1 text-xs text-[#E5DFD9]/40">Loading activity…</p>
        )}
        {!loading && items.length === 0 && (
          <p className="px-1 text-xs text-[#E5DFD9]/40">No recent activity</p>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 transition hover:bg-white/[0.06]"
          >
            <p className="text-xs font-medium text-[#E5DFD9]">
              {ACTIVITY_LABELS[item.action] ?? item.action.replace(/_/g, " ")}
            </p>
            <p className="mt-0.5 truncate text-[10px] text-[#E5DFD9]/45">
              {item.actorName} · {item.entityType}
            </p>
            <p className="mt-1 text-[10px] text-[#E5DFD9]/30">
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
            </p>
          </div>
        ))}
      </div>
      {!compact && (
        <Link
          href="/admin/audit"
          className="mt-4 block text-center text-xs text-[#7A2E3D] hover:underline"
        >
          View full audit log →
        </Link>
      )}
    </aside>
  );
}

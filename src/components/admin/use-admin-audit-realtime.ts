"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type AuditActivityItem = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  actorName: string;
  createdAt: string;
};

type Listener = (item: AuditActivityItem) => void;

let channel: RealtimeChannel | null = null;
let refCount = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
let lastWarnAt = 0;
let isLive = false;
const listeners = new Set<Listener>();
const liveListeners = new Set<() => void>();

function emitLiveChange() {
  for (const fn of liveListeners) fn();
}

function setLive(next: boolean) {
  if (isLive === next) return;
  isLive = next;
  emitLiveChange();
}

function subscribeLive(onChange: () => void) {
  liveListeners.add(onChange);
  return () => liveListeners.delete(onChange);
}

function getLiveSnapshot() {
  return isLive;
}

function isBenignRealtimeDisconnect(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const lower = msg.toLowerCase();
  return (
    lower.includes("1006") ||
    lower.includes("socket closed") ||
    lower.includes("websocket") ||
    lower.includes("failed to connect") ||
    lower.includes("heartbeat timeout") ||
    lower.includes("timed out")
  );
}

/** Realtime is flaky during Next.js HMR — use HTTP polling in dev unless explicitly enabled. */
function shouldUseRealtime(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NODE_ENV === "development") {
    return process.env.NEXT_PUBLIC_ADMIN_AUDIT_REALTIME === "true";
  }
  return true;
}

function warnRealtimeOffline(err?: unknown) {
  const now = Date.now();
  if (now - lastWarnAt < 60_000) return;
  lastWarnAt = now;
  const detail =
    err instanceof Error ? err.message : err ? String(err) : "connection lost";
  console.warn(
    `[Evendor:admin-audit-realtime] Live feed offline (${detail}). Refreshing activity every 30s.`
  );
}

function parseInsert(payload: { new?: Record<string, unknown> }): AuditActivityItem | null {
  const row = payload.new ?? {};
  if (!row.id || !row.createdAt) return null;
  return {
    id: String(row.id),
    action: String(row.action ?? ""),
    entityType: String(row.entityType ?? ""),
    entityId: row.entityId ? String(row.entityId) : null,
    actorName: "System",
    createdAt: new Date(String(row.createdAt)).toISOString(),
  };
}

function resetChannel() {
  if (!channel) return;
  try {
    const supabase = createClient();
    void supabase.removeChannel(channel);
  } catch {
    /* ignore teardown errors */
  }
  channel = null;
}

function scheduleReconnect() {
  if (refCount <= 0 || reconnectTimer) return;
  setLive(false);
  resetChannel();
  const delay = Math.min(30_000, 2_000 * 2 ** reconnectAttempts);
  reconnectAttempts += 1;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (refCount > 0) ensureChannel();
  }, delay);
}

function ensureChannel() {
  if (!shouldUseRealtime() || channel || refCount <= 0) return;

  try {
    const supabase = createClient();
    channel = supabase
      .channel("admin-audit-log", {
        config: { broadcast: { self: false }, presence: { key: "" } },
      })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "AuditLog" },
        (payload) => {
          const item = parseInsert(payload as { new?: Record<string, unknown> });
          if (!item) return;
          for (const listener of listeners) listener(item);
        }
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          reconnectAttempts = 0;
          setLive(true);
          return;
        }

        if (err && isBenignRealtimeDisconnect(err)) warnRealtimeOffline(err);
        else if (err) console.warn("[Evendor:admin-audit-realtime]", err);

        if (
          err ||
          status === "CLOSED" ||
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT"
        ) {
          scheduleReconnect();
        }
      });
  } catch (err) {
    warnRealtimeOffline(err);
    scheduleReconnect();
  }
}

function teardownChannel() {
  if (refCount > 0 || !channel) return;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  resetChannel();
  reconnectAttempts = 0;
  setLive(false);
}

/** Whether the Supabase Realtime audit feed is connected. */
export function useAuditRealtimeLive() {
  return useSyncExternalStore(subscribeLive, getLiveSnapshot, () => false);
}

/** Shared AuditLog realtime channel; falls back to HTTP polling when offline. */
export function useAdminAuditRealtime(onInsert: (item: AuditActivityItem) => void) {
  const onInsertRef = useRef(onInsert);
  onInsertRef.current = onInsert;

  useEffect(() => {
    const listener: Listener = (item) => onInsertRef.current(item);
    listeners.add(listener);
    refCount += 1;
    ensureChannel();

    return () => {
      listeners.delete(listener);
      refCount -= 1;
      teardownChannel();
    };
  }, []);
}

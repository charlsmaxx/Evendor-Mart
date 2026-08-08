"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PushEnableCard } from "@/components/notifications/push-enable-card";
import type { AppNotification } from "@/components/notifications/notifications-bell";

export default function NotificationsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications-list"],
    queryFn: async () => {
      const res = await fetch("/api/notifications", { credentials: "same-origin" });
      if (!res.ok) throw new Error("Failed to load notifications");
      const json = await res.json();
      return {
        notifications: (json.data?.notifications ?? []) as AppNotification[],
        unreadCount: Number(json.data?.unreadCount ?? 0),
      };
    },
  });

  const markRead = useMutation({
    mutationFn: async (payload: { id?: string; markAllRead?: boolean }) => {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications-list"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
      qc.invalidateQueries({ queryKey: ["vendor-notifications"] });
    },
  });

  const items = data?.notifications ?? [];
  const unread = data?.unreadCount ?? 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bookings, payouts, messages updates, and platform alerts.
          </p>
        </div>
        {unread > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => markRead.mutate({ markAllRead: true })}
          >
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        )}
      </div>

      <PushEnableCard />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading notifications…</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
          <Bell className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-muted-foreground">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const inner = (
              <div
                className={[
                  "rounded-xl border p-4 transition",
                  n.read ? "border-border/60 bg-card/40" : "border-primary/20 bg-primary/5",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{n.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {!n.read && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        markRead.mutate({ id: n.id });
                      }}
                      className="shrink-0 text-xs text-primary hover:underline"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            );
            return n.link ? (
              <Link
                key={n.id}
                href={n.link}
                onClick={() => {
                  if (!n.read) markRead.mutate({ id: n.id });
                }}
              >
                {inner}
              </Link>
            ) : (
              <div key={n.id}>{inner}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}

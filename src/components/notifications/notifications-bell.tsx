"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnreadNotificationCount } from "@/hooks/use-unread-notification-count";
import { MessageNotificationBadge } from "@/components/messages/message-notification-badge";

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  link: string | null;
  createdAt: string;
};

export function NotificationsBell({
  className,
  variant = "default",
}: {
  className?: string;
  /** Admin shell uses a dark chrome — lighten the trigger. */
  variant?: "default" | "admin";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const { data: unread = 0 } = useUnreadNotificationCount();

  const list = useQuery({
    queryKey: ["notifications-list"],
    queryFn: async () => {
      const res = await fetch("/api/notifications", { credentials: "same-origin" });
      if (!res.ok) return { notifications: [] as AppNotification[], unreadCount: 0 };
      const json = await res.json();
      return {
        notifications: (json.data?.notifications ?? []) as AppNotification[],
        unreadCount: Number(json.data?.unreadCount ?? 0),
      };
    },
    enabled: open,
    staleTime: 15_000,
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
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
      qc.invalidateQueries({ queryKey: ["notifications-list"] });
      qc.invalidateQueries({ queryKey: ["vendor-notifications"] });
    },
  });

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items = list.data?.notifications ?? [];
  const panelUnread = list.data?.unreadCount ?? unread;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-label={unread > 0 ? `${unread} unread notifications` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative inline-flex h-9 w-9 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          variant === "admin"
            ? "text-[#E5DFD9]/80 hover:bg-white/10 hover:text-[#E5DFD9]"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Bell className="h-5 w-5" />
        <MessageNotificationBadge count={unread} className="-right-0.5 -top-0.5" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 z-50 mt-2 w-[min(100vw-1.5rem,22rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {panelUnread > 0 && (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                onClick={() => markRead.mutate({ markAllRead: true })}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {list.isLoading ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</p>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No notifications yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.slice(0, 12).map((n) => {
                  const content = (
                    <div
                      className={cn(
                        "px-4 py-3 transition hover:bg-muted/50",
                        !n.read && "bg-primary/5"
                      )}
                    >
                      <p className="text-sm font-medium leading-snug">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                      <p className="mt-1.5 text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  );
                  return (
                    <li key={n.id}>
                      {n.link ? (
                        <Link
                          href={n.link}
                          onClick={() => {
                            if (!n.read) markRead.mutate({ id: n.id });
                            setOpen(false);
                          }}
                        >
                          {content}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className="w-full text-left"
                          onClick={() => {
                            if (!n.read) markRead.mutate({ id: n.id });
                          }}
                        >
                          {content}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-border px-4 py-2.5">
            <Link
              href="/notifications"
              className="block text-center text-xs font-semibold text-primary hover:underline"
              onClick={() => setOpen(false)}
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

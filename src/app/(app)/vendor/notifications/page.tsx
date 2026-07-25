"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VendorPageHeader, VendorSkeleton } from "@/components/vendor/vendor-ui";

type Notification = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  link: string | null;
  createdAt: string;
};

export default function VendorNotificationsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["vendor-notifications"],
    queryFn: async () => {
      const res = await fetch("/api/vendor/notifications");
      const json = await res.json();
      return (json.data ?? []) as Notification[];
    },
  });

  const markRead = useMutation({
    mutationFn: async (payload: { id?: string; markAllRead?: boolean }) => {
      await fetch("/api/vendor/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendor-notifications"] }),
  });

  if (isLoading) return <VendorSkeleton />;

  const unread = (data ?? []).filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <VendorPageHeader
        title="Notifications"
        subtitle="Bookings, payouts, verification, and platform updates."
        action={
          unread > 0 ? (
            <Button size="sm" variant="outline" className="gap-2" onClick={() => markRead.mutate({ markAllRead: true })}>
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
          ) : undefined
        }
      />

      {(data ?? []).length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
          <Bell className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-muted-foreground">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((n) => {
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
              <Link key={n.id} href={n.link} onClick={() => !n.read && markRead.mutate({ id: n.id })}>
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

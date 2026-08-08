"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";

async function fetchUnreadCount(): Promise<number> {
  const res = await fetch("/api/notifications?unreadCount=1", {
    credentials: "same-origin",
  });
  if (res.status === 401 || !res.ok) return 0;
  const json = await res.json();
  return Number(json.data?.unreadCount ?? 0);
}

/** Polls unread in-app notification count for the signed-in user. */
export function useUnreadNotificationCount() {
  const pathname = usePathname();
  const onNotifications = pathname.startsWith("/notifications") || pathname.startsWith("/vendor/notifications");

  return useQuery({
    queryKey: ["notifications-unread"],
    queryFn: fetchUnreadCount,
    staleTime: 30_000,
    refetchInterval: onNotifications ? false : 60_000,
    refetchOnWindowFocus: !onNotifications,
    retry: false,
  });
}

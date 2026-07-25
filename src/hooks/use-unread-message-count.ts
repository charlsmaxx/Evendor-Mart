"use client";

import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { parseApiResponse } from "@/lib/parse-api-response";
import type { AdminSection } from "@/lib/admin-permissions";

async function fetchMe() {
  const res = await fetch("/api/me", { credentials: "same-origin" });
  if (res.status === 401 || !res.ok) return null;
  return (await res.json()).data as { role: string };
}

async function fetchAdminMe() {
  const res = await fetch("/api/admin/me", { credentials: "same-origin" });
  if (!res.ok) return null;
  return (await res.json()).data as { sections: AdminSection[] };
}

export function useUnreadMessageCount() {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin") ?? false;
  const onMessagesPage =
    pathname?.startsWith("/messages") || pathname?.startsWith("/admin/messages");

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const { data: adminMe, isLoading: adminMeLoading } = useQuery({
    queryKey: ["admin-me"],
    queryFn: fetchAdminMe,
    enabled: isAdminRoute && me != null,
    staleTime: 60_000,
    retry: false,
  });

  const canPoll =
    !meLoading &&
    me != null &&
    (!isAdminRoute ||
      (!adminMeLoading && (adminMe?.sections.includes("messages") ?? false)));

  return useQuery({
    queryKey: ["message-unread-count"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/messages/unread", { credentials: "same-origin" });
        if (res.status === 401) return 0;
        const parsed = await parseApiResponse<{ count: number }>(res);
        if (!parsed.ok) return 0;
        return parsed.data.count ?? 0;
      } catch {
        return 0;
      }
    },
    enabled: canPoll,
    staleTime: 45_000,
    refetchInterval: canPoll && !onMessagesPage ? 120_000 : false,
    refetchOnWindowFocus: canPoll && !onMessagesPage,
    retry: false,
  });
}

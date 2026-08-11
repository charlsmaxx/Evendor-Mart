"use client";

import { useQuery } from "@tanstack/react-query";

export type MeUser = {
  id: string;
  isVendor: boolean;
  role: string;
};

async function fetchMe(): Promise<MeUser | null> {
  const res = await fetch("/api/me", { credentials: "same-origin" });
  if (res.status === 401 || !res.ok) return null;
  const json = await res.json();
  return (json.data as MeUser | null) ?? null;
}

/** Shared session probe — same cache key as AppNav. */
export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

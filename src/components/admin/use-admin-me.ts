"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { AdminRole } from "@prisma/client";
import type { AdminSection } from "@/lib/admin-permissions";

export type AdminMe = {
  id: string;
  email: string;
  fullName: string | null;
  adminRole: AdminRole | null;
  adminRoleLabel: string | null;
  sections: AdminSection[];
  isSuperAdmin: boolean;
};

async function fetchAdminMe(): Promise<AdminMe | null> {
  try {
    const res = await fetch("/api/admin/me", { credentials: "same-origin" });
    if (res.status === 401) return null;
    if (!res.ok) return null;
    const json = await res.json();
    return json.data as AdminMe;
  } catch {
    return null;
  }
}

/** Redirect to login when admin session is missing (expired cookie or auth backend unreachable). */
export function useAdminSessionGuard() {
  const router = useRouter();
  const redirected = useRef(false);

  const query = useQuery({
    queryKey: ["admin-me"],
    queryFn: fetchAdminMe,
    staleTime: 60_000,
    retry: 1,
    retryDelay: 1_500,
  });

  useEffect(() => {
    if (query.isLoading || redirected.current) return;
    if (!query.data) {
      redirected.current = true;
      router.replace("/login?redirect=/admin");
    }
  }, [query.isLoading, query.data, router]);

  return {
    ...query,
    adminMe: query.data,
    isAdminReady: !!query.data,
    sections: query.data?.sections ?? (query.isLoading ? (["dashboard"] as AdminSection[]) : []),
    allowedSections: new Set(query.data?.sections ?? []),
  };
}

/** @deprecated Prefer useAdminSessionGuard — kept for nav imports. */
export function useAdminMe() {
  const guard = useAdminSessionGuard();
  return {
    ...guard,
    adminMe: guard.adminMe,
    sections: guard.sections,
    allowedSections: guard.allowedSections,
  };
}

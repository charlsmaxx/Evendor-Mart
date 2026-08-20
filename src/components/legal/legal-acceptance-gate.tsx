"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

async function fetchLegalNeed(): Promise<boolean | null> {
  const res = await fetch("/api/me", { credentials: "same-origin" });
  if (res.status === 401 || !res.ok) return null;
  const json = await res.json();
  return Boolean(json.data?.needsLegalAcceptance);
}

/** Redirects signed-in users who have not accepted the current Terms/Privacy versions. */
export function LegalAcceptanceGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: needsLegalAcceptance } = useQuery({
    queryKey: ["me", "legal"],
    queryFn: fetchLegalNeed,
    staleTime: 60_000,
    retry: false,
  });

  useEffect(() => {
    if (!needsLegalAcceptance) return;
    if (pathname.startsWith("/legal/accept")) return;
    const next = `${pathname}${window.location.search}`;
    router.replace(`/legal/accept?next=${encodeURIComponent(next)}`);
  }, [needsLegalAcceptance, pathname, router]);

  return <>{children}</>;
}

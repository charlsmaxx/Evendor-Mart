"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LegalReconsentForm } from "@/components/auth/legal-reconsent-form";

function safeNextPath(raw: string | null) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  if (raw.startsWith("/legal/accept")) return "/dashboard";
  return raw;
}

function LegalAcceptInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const [status, setStatus] = useState<"loading" | "needs" | "unauthenticated">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 8000);
        const res = await fetch("/api/auth/legal-session", {
          credentials: "same-origin",
          signal: controller.signal,
        }).finally(() => window.clearTimeout(timeout));
        if (res.status === 401) {
          if (!cancelled) setStatus("unauthenticated");
          return;
        }
        const json = await res.json().catch(() => null);
        if (json?.data?.accepted) {
          router.replace(next);
          return;
        }
        if (!cancelled) setStatus("needs");
      } catch {
        if (!cancelled) setStatus("needs");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [next, router]);

  useEffect(() => {
    if (status !== "unauthenticated") return;
    const dest = `/login?redirect=${encodeURIComponent(`/legal/accept?next=${encodeURIComponent(next)}`)}`;
    router.replace(dest);
  }, [status, next, router]);

  if (status !== "needs") {
    return <p className="text-sm text-muted-foreground">Checking your account…</p>;
  }

  return <LegalReconsentForm />;
}

export function LegalAcceptClient() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <LegalAcceptInner />
    </Suspense>
  );
}

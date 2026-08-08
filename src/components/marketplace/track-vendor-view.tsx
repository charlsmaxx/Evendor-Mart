"use client";

import { useEffect } from "react";

const DEDUPE_MS = 30 * 60 * 1000; // one count per vendor per browser tab session window
/** Guards React Strict Mode double-mount in the same tick. */
const inFlight = new Set<string>();

function storageKey(vendorId: string, source: string) {
  return `evendor:view:${source}:${vendorId}`;
}

/**
 * Fires a single marketplace VIEW for the vendor (profile or listing page).
 * Deduped in sessionStorage so refreshes don't inflate the counter.
 */
export function TrackVendorView({
  vendorId,
  listingId,
  source,
}: {
  vendorId: string;
  listingId?: string | null;
  source: "profile" | "listing";
}) {
  useEffect(() => {
    if (!vendorId || typeof window === "undefined") return;

    const key = storageKey(vendorId, source);
    if (inFlight.has(key)) return;

    try {
      const last = Number(sessionStorage.getItem(key) || "0");
      if (last && Date.now() - last < DEDUPE_MS) return;
      sessionStorage.setItem(key, String(Date.now()));
    } catch {
      /* private mode / blocked storage — still try once */
    }

    inFlight.add(key);
    const controller = new AbortController();
    void fetch("/api/analytics/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        vendorId,
        listingId: listingId ?? null,
        source,
      }),
      signal: controller.signal,
    })
      .catch(() => {
        /* best-effort; never block the page */
      })
      .finally(() => {
        inFlight.delete(key);
      });

    return () => controller.abort();
  }, [vendorId, listingId, source]);

  return null;
}

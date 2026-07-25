"use client";

import { useReportWebVitals } from "next/web-vitals";
import { usePathname } from "next/navigation";
import { useRef } from "react";

type WebVitalPayload = {
  name: string;
  value: number;
  id: string;
  rating?: string;
  path: string;
  navigationType?: string;
};

function shouldReport(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NEXT_PUBLIC_OBSERVABILITY_ENABLED === "true") return true;
  if (process.env.NEXT_PUBLIC_OBSERVABILITY_ENABLED === "false") return false;
  return process.env.NODE_ENV === "production";
}

function sampleRate(): number {
  const raw = process.env.NEXT_PUBLIC_OBSERVABILITY_SAMPLE_RATE;
  if (raw == null || raw === "") return 1;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(1, n);
}

function sendVital(payload: WebVitalPayload) {
  const body = JSON.stringify(payload);
  const url = "/api/observability/vitals";

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon(url, blob)) return;
  }

  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

/** Reports Core Web Vitals to `/api/observability/vitals` (sampled, production by default). */
export function WebVitalsReporter() {
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname ?? "/";

  useReportWebVitals((metric) => {
    if (!shouldReport()) return;
    if (Math.random() > sampleRate()) return;

    if (process.env.NODE_ENV === "development") {
      console.info(`[Evendor:web-vital] ${metric.name}=${Math.round(metric.value)} (${metric.rating})`);
    }

    sendVital({
      name: metric.name,
      value: metric.value,
      id: metric.id,
      rating: metric.rating,
      path: pathRef.current,
      navigationType: metric.navigationType,
    });
  });

  return null;
}

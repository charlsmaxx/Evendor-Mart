/** Shared observability thresholds and feature flags (safe on client + server). */

export const OBSERVABILITY = {
  /** Log API handlers slower than this (ms). */
  apiSlowMs: Number(process.env.API_LOG_SLOW_MS ?? 800) || 800,
  /** Prisma default when PRISMA_LOG_SLOW_MS is unset. */
  prismaSlowMsDev: 500,
  prismaSlowMsProd: 300,
} as const;

export function isObservabilityEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_OBSERVABILITY_ENABLED === "true") return true;
  if (process.env.NEXT_PUBLIC_OBSERVABILITY_ENABLED === "false") return false;
  return process.env.NODE_ENV === "production";
}

export function observabilitySampleRate(): number {
  const raw = process.env.NEXT_PUBLIC_OBSERVABILITY_SAMPLE_RATE;
  if (raw == null || raw === "") return 1;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(1, n);
}

export type StructuredLogPayload = Record<string, unknown>;

/** Single-line JSON logs for Vercel / log drains. */
export function logStructured(event: string, payload: StructuredLogPayload): void {
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...payload }));
}

export function logStructuredWarn(event: string, payload: StructuredLogPayload): void {
  console.warn(JSON.stringify({ ts: new Date().toISOString(), event, ...payload }));
}

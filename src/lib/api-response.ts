import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import type { PaginationMeta } from "@/lib/pagination";
import { HTTP_CACHE } from "@/lib/cache-policy";
import { OBSERVABILITY, logStructuredWarn } from "@/lib/observability";

type JsonOkOptions = {
  meta?: PaginationMeta;
  headers?: HeadersInit;
};

function isPaginationMeta(value: unknown): value is PaginationMeta {
  return (
    typeof value === "object" &&
    value !== null &&
    "page" in value &&
    "limit" in value &&
    "total" in value &&
    "hasMore" in value
  );
}

export function jsonOk<T>(data: T, status = 200, metaOrOptions?: PaginationMeta | JsonOkOptions) {
  const options: JsonOkOptions = isPaginationMeta(metaOrOptions)
    ? { meta: metaOrOptions }
    : (metaOrOptions ?? {});
  const body = options.meta
    ? { success: true, data, meta: options.meta }
    : { success: true, data };
  return NextResponse.json(body, { status, headers: options.headers });
}

/** Sensitive/user-specific responses — never cache at CDN or browser. */
export function jsonNoStore<T>(data: T, status = 200, meta?: PaginationMeta) {
  return jsonOk(data, status, { meta, headers: HTTP_CACHE.privateNoStore });
}

export function jsonPublic<T>(
  data: T,
  cache: keyof typeof HTTP_CACHE = "publicShort",
  status = 200,
  meta?: PaginationMeta
) {
  return jsonOk(data, status, { meta, headers: HTTP_CACHE[cache] });
}

export function jsonError(message: string, status = 400, code?: string) {
  return NextResponse.json({ success: false, error: { message, code } }, { status });
}

function isDatabaseError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return ["P1001", "P1002", "P1017", "P2024"].includes(error.code);
  }
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("can't reach database") ||
      msg.includes("connection pool") ||
      msg.includes("engine is not yet connected")
    );
  }
  return false;
}

/** Wrap route handlers so failures always return JSON (never an empty 500 body). */
export async function handleApiRoute(
  fn: () => Promise<NextResponse>,
  meta?: { route?: string }
): Promise<NextResponse> {
  const started = performance.now();
  try {
    const response = await fn();
    const elapsed = Math.round(performance.now() - started);
    response.headers.set("Server-Timing", `app;dur=${elapsed}`);
    if (elapsed >= OBSERVABILITY.apiSlowMs) {
      logStructuredWarn("api_slow", {
        route: meta?.route,
        ms: elapsed,
        status: response.status,
      });
    }
    return response;
  } catch (error) {
    const elapsed = Math.round(performance.now() - started);
    logStructuredWarn("api_error", {
      route: meta?.route,
      ms: elapsed,
      message: error instanceof Error ? error.message : "unknown",
    });
    console.error("[API error]", error);
    if (isDatabaseError(error)) {
      return jsonError(
        "Database is temporarily unavailable. Restore your Supabase project if paused, then retry.",
        503,
        "DB_UNAVAILABLE"
      );
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return jsonError(message, 500, "INTERNAL_ERROR");
  }
}

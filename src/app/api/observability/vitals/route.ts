import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonOk, jsonError } from "@/lib/api-response";
import { logStructured, logStructuredWarn } from "@/lib/observability";

const vitalsSchema = z.object({
  name: z.enum(["CLS", "FCP", "FID", "INP", "LCP", "TTFB"]),
  value: z.number().finite().nonnegative(),
  id: z.string().min(1).max(80),
  rating: z.enum(["good", "needs-improvement", "poor"]).optional(),
  path: z.string().min(1).max(300),
  navigationType: z.string().max(40).optional(),
});

const recentKeys = new Map<string, number>();
const DEDUPE_MS = 60_000;

function dedupeKey(ip: string, body: z.infer<typeof vitalsSchema>): string {
  return `${ip}:${body.path}:${body.name}:${body.id}`;
}

function isDuplicate(key: string): boolean {
  const now = Date.now();
  const last = recentKeys.get(key);
  if (last != null && now - last < DEDUPE_MS) return true;
  recentKeys.set(key, now);
  if (recentKeys.size > 500) {
    for (const [k, ts] of recentKeys) {
      if (now - ts > DEDUPE_MS) recentKeys.delete(k);
    }
  }
  return false;
}

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const parsed = vitalsSchema.safeParse(json);
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const key = dedupeKey(ip, parsed.data);
  if (isDuplicate(key)) {
    return jsonOk({ received: true, deduped: true });
  }

  const payload = {
    name: parsed.data.name,
    value: Math.round(parsed.data.value * 1000) / 1000,
    rating: parsed.data.rating,
    path: parsed.data.path,
    navigationType: parsed.data.navigationType,
  };

  if (parsed.data.rating === "poor" || parsed.data.name === "LCP" || parsed.data.name === "INP") {
    logStructuredWarn("web_vital", payload);
  } else {
    logStructured("web_vital", payload);
  }

  return jsonOk({ received: true });
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiRoute } from "@/lib/api-response";
import { apiLimiter, checkRateLimit } from "@/lib/rate-limit";
import { recordVendorView } from "@/core/analytics-engine/views";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  vendorId: z.string().uuid(),
  listingId: z.string().uuid().optional().nullable(),
  source: z.enum(["profile", "listing"]),
});

export async function POST(req: NextRequest) {
  return handleApiRoute(async () => {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const rate = await checkRateLimit(apiLimiter, `analytics-view:${ip}`);
    if (!rate.success) return jsonError("Too many requests", 429);

    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return jsonError("Invalid view payload", 400);

    // Optional auth — logged-in vendors viewing themselves are skipped.
    const user = await requireAuth();

    const result = await recordVendorView({
      vendorId: parsed.data.vendorId,
      listingId: parsed.data.listingId,
      source: parsed.data.source,
      viewerUserId: user?.id ?? null,
    });

    return jsonOk(result);
  }, { route: "POST /api/analytics/view" });
}

import { NextRequest } from "next/server";
import { searchListings } from "@/lib/listings";
import { jsonPublic } from "@/lib/api-response";
import { searchLimiter, checkRateLimit } from "@/lib/rate-limit";
import { protectRequest } from "@/lib/arcjet";

export async function GET(req: NextRequest) {
  const protection = await protectRequest(req);
  if (!protection.allowed) {
    return Response.json({ success: false, error: { message: "Forbidden" } }, { status: 403 });
  }

  const ip = req.headers.get("x-forwarded-for") ?? "anon";
  const rate = await checkRateLimit(searchLimiter, ip);
  if (!rate.success) {
    return Response.json({ success: false, error: { message: "Rate limit exceeded" } }, { status: 429 });
  }

  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const result = await searchListings(params);
  return jsonPublic(result);
}

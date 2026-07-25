import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { isSlugAvailable } from "@/lib/vendor-onboarding/persist";

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const slug = req.nextUrl.searchParams.get("slug") ?? "";
  if (!slug.trim()) return jsonError("slug required", 400);

  try {
    const result = await isSlugAvailable(slug, user.id);
    return jsonOk(result);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Could not check slug", 500);
  }
}

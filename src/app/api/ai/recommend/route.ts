import { NextRequest } from "next/server";
import { recommendVendors } from "@/lib/ai/contracts";
import { jsonError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  if (process.env.ENABLE_AI !== "true") {
    return jsonError("AI recommendations not enabled in Core phase", 501, "AI_NOT_ENABLED");
  }

  const city = req.nextUrl.searchParams.get("city") ?? undefined;
  const category = req.nextUrl.searchParams.get("category") ?? undefined;
  const budgetMax = req.nextUrl.searchParams.get("budgetMax");
  const results = await recommendVendors({
    city,
    categorySlug: category,
    budgetMax: budgetMax ? Number(budgetMax) : undefined,
  });

  return Response.json({ success: true, data: results });
}

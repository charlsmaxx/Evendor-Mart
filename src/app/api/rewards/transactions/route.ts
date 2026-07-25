import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiRoute } from "@/lib/api-response";
import { getWalletTransactions } from "@/lib/rewards";

export async function GET(req: NextRequest) {
  return handleApiRoute(async () => {
    const user = await requireAuth();
    if (!user) return jsonError("Unauthorized", 401);

    const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;
    const limit = Number(req.nextUrl.searchParams.get("limit") ?? 20);

    const data = await getWalletTransactions(user.id, { cursor, limit });
    return jsonOk(data);
  });
}

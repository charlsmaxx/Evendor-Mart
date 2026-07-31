import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiRoute } from "@/lib/api-response";
import { getWalletSummary } from "@/lib/rewards";

export async function GET() {
  return handleApiRoute(async () => {
    const user = await requireAuth();
    if (!user) return jsonError("Unauthorized", 401);

    try {
      const summary = await getWalletSummary(user.id);
      return jsonOk(summary);
    } catch (error) {
      console.error("[rewards/wallet] getWalletSummary failed:", error);
      return jsonOk({
        availableBalance: 0,
        pendingBalance: 0,
        totalEarned: 0,
        totalRedeemed: 0,
        transactions: [],
        error:
          "Rewards wallet is temporarily unavailable. If you recently completed a booking, try again shortly.",
      });
    }
  }, { route: "GET /api/rewards/wallet" });
}

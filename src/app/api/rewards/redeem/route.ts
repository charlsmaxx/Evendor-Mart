import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { getWalletSummary } from "@/lib/rewards";
import { calcCashback, redeemableAmount } from "@/lib/rewards-utils";

/**
 * Preview what applying rewards to a booking of `amount` would do.
 *
 * Read-only on purpose. Rewards are spent by the booking transaction itself
 * (`POST /api/bookings` with `applyRewards`), which recomputes the figure from the wallet
 * — this endpoint only prices the checkout screen and is never trusted for the charge.
 */
export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const raw = Number(new URL(req.url).searchParams.get("amount") ?? 0);
  const amount = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;

  const wallet = await getWalletSummary(user.id);
  const redeemable = redeemableAmount(wallet.availableBalance, amount);

  return jsonOk({
    bookingAmount: amount,
    cashbackToEarn: calcCashback(amount),
    availableBalance: wallet.availableBalance,
    redeemable,
    balanceAfterRedeem: wallet.availableBalance - redeemable,
    finalAmountIfRedeemed: amount - redeemable,
  });
}

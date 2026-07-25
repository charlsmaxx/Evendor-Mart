import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { redeemReward, getWalletSummary } from "@/lib/rewards";
import { calcCashback, maxRedeemable } from "@/lib/rewards-utils";
import { z } from "zod";

const schema = z.object({
  bookingId: z.string().uuid(),
  bookingAmount: z.number().positive(),
  redeemAmount: z.number().min(0),
});

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const { bookingId, bookingAmount, redeemAmount } = parsed.data;

  const result = await redeemReward(user.id, bookingId, bookingAmount, redeemAmount);
  return jsonOk(result);
}

/** Preview endpoint — returns what would happen without committing */
export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const amount = Number(new URL(req.url).searchParams.get("amount") ?? 0);
  const wallet = await getWalletSummary(user.id);
  const cashback = calcCashback(amount);
  const maxRedeem = maxRedeemable(amount);
  const redeemable = Math.min(wallet.availableBalance, maxRedeem);

  return jsonOk({
    bookingAmount: amount,
    cashbackToEarn: cashback,
    availableBalance: wallet.availableBalance,
    redeemable,
    finalAmountIfRedeemed: amount - redeemable,
  });
}

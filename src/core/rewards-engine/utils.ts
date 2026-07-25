/** Pure math helpers for the Evendor Rewards system — safe to use in client components */
import { PLATFORM_COMMISSION_PERCENT } from "@/core/shared/config";

export const CASHBACK_RATE = 0.02;       // 2 %

/**
 * Share of the customer's *wallet* spent on any one booking. A ₦1,200 balance puts ₦240
 * toward a booking and keeps ₦960, so the wallet drains across many bookings instead of
 * emptying into the first one.
 */
export const WALLET_REDEEM_RATIO = 0.20;

export function calcCashback(bookingAmount: number): number {
  return Math.floor(bookingAmount * CASHBACK_RATE);
}

/**
 * How much of a wallet a single booking may consume.
 *
 * The discount is funded entirely out of Evendor's commission — the vendor is still paid
 * their full share of the booking total — so it is also capped at that commission. Without
 * that ceiling a large wallet on a small booking would pay out more than the booking earns.
 */
export function redeemableAmount(walletBalance: number, bookingAmount: number): number {
  if (walletBalance <= 0 || bookingAmount <= 0) return 0;
  const fromWallet = Math.floor(walletBalance * WALLET_REDEEM_RATIO);
  const commissionCap = Math.floor(bookingAmount * (PLATFORM_COMMISSION_PERCENT / 100));
  return Math.max(0, Math.min(fromWallet, commissionCap));
}

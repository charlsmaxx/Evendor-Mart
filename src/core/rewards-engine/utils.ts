/** Pure math helpers for the Evendor Rewards system — safe to use in client components */
export const CASHBACK_RATE = 0.02;       // 2 %
export const MAX_REDEEM_RATIO = 0.20;    // max 20 % of any booking

export function calcCashback(bookingAmount: number): number {
  return Math.floor(bookingAmount * CASHBACK_RATE);
}

export function maxRedeemable(bookingAmount: number): number {
  return Math.floor(bookingAmount * MAX_REDEEM_RATIO);
}

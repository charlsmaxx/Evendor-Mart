/** Platform-wide business constants — single source of truth. */

export const VENDOR_PAYOUT_PERCENT = Number(process.env.VENDOR_PAYOUT_PERCENT ?? 85);
export const BOOKING_DEPOSIT_PERCENT = Number(process.env.BOOKING_DEPOSIT_PERCENT ?? 30);
export const REWARDS_EARN_PERCENT = Number(process.env.REWARDS_EARN_PERCENT ?? 2);
export const REWARDS_MAX_REDEEM_PERCENT = Number(process.env.REWARDS_MAX_REDEEM_PERCENT ?? 20);
export const AUTO_RELEASE_HOURS = 48;

export function vendorShareAmount(grossAmount: number): number {
  return Math.round(grossAmount * (VENDOR_PAYOUT_PERCENT / 100));
}

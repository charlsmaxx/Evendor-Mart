/** Platform-wide business constants — single source of truth. */

/**
 * Evendor's cut of every booking total, taken at escrow release. Deliberately a plain
 * constant rather than an env var: it is read on both the server and in client bundles
 * (to price a checkout), and a value that differs between the two would quote customers
 * a discount the server refuses to honour.
 */
export const PLATFORM_COMMISSION_PERCENT = 7;

/** Whatever Evendor does not keep. Derived so the two can never drift apart. */
export const VENDOR_PAYOUT_PERCENT = 100 - PLATFORM_COMMISSION_PERCENT;

/**
 * Marketplace bookings are charged in full at booking time. Escrow must hold the whole
 * amount, because the vendor is credited a share of the booking total on release —
 * collecting only part of it would let vendors withdraw money Evendor never received.
 */
export const BOOKING_CHARGE_PERCENT = 100;
export const REWARDS_EARN_PERCENT = 2;
export const AUTO_RELEASE_HOURS = 48;

/** Withdrawal bounds in naira. The ceiling caps blast radius if a balance is ever miscomputed. */
export const MIN_WITHDRAWAL_AMOUNT = Number(process.env.MIN_WITHDRAWAL_AMOUNT ?? 1000);
export const MAX_WITHDRAWAL_AMOUNT = Number(process.env.MAX_WITHDRAWAL_AMOUNT ?? 5_000_000);

export function vendorShareAmount(grossAmount: number): number {
  return Math.round(grossAmount * (VENDOR_PAYOUT_PERCENT / 100));
}

/** What Evendor earns on a booking — the ceiling on any discount funded out of it. */
export function platformCommissionAmount(grossAmount: number): number {
  return grossAmount - vendorShareAmount(grossAmount);
}

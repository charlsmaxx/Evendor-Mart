/**
 * Sanity-check the reward redemption rule against the cases that decide real money.
 * Run: npx tsx scripts/check-rewards-math.ts
 */
import { redeemableAmount, WALLET_REDEEM_RATIO } from "../src/core/rewards-engine/utils";
import {
  PLATFORM_COMMISSION_PERCENT,
  VENDOR_PAYOUT_PERCENT,
  vendorShareAmount,
  platformCommissionAmount,
} from "../src/core/shared/config";

const cases: Array<{ name: string; wallet: number; booking: number; expect: number }> = [
  { name: "the stated example", wallet: 1_200, booking: 100_000, expect: 240 },
  { name: "empty wallet", wallet: 0, booking: 100_000, expect: 0 },
  { name: "commission ceiling binds on a small booking", wallet: 1_200, booking: 1_000, expect: 70 },
  { name: "huge wallet cannot exceed commission", wallet: 1_000_000, booking: 50_000, expect: 3_500 },
  { name: "wallet smaller than one naira of ratio", wallet: 4, booking: 100_000, expect: 0 },
];

let failures = 0;

console.log(
  `commission ${PLATFORM_COMMISSION_PERCENT}% · vendor ${VENDOR_PAYOUT_PERCENT}% · ` +
    `wallet ratio ${WALLET_REDEEM_RATIO * 100}%\n`
);

for (const c of cases) {
  const actual = redeemableAmount(c.wallet, c.booking);
  const pass = actual === c.expect;
  if (!pass) failures++;
  console.log(
    `${pass ? "PASS" : "FAIL"}  ${c.name}\n` +
      `      wallet ₦${c.wallet.toLocaleString()} · booking ₦${c.booking.toLocaleString()}` +
      ` → redeem ₦${actual.toLocaleString()} (expected ₦${c.expect.toLocaleString()})` +
      `, wallet keeps ₦${(c.wallet - actual).toLocaleString()}`
  );
}

console.log("\nEvendor never pays out more than it earns:");
for (const booking of [1_000, 50_000, 100_000, 2_500_000]) {
  const commission = platformCommissionAmount(booking);
  const worstRedeem = redeemableAmount(Number.MAX_SAFE_INTEGER, booking);
  const collected = booking - worstRedeem;
  const margin = collected - vendorShareAmount(booking);
  const ok = margin >= 0;
  if (!ok) failures++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ₦${booking.toLocaleString()} booking · commission ` +
      `₦${commission.toLocaleString()} · max discount ₦${worstRedeem.toLocaleString()} ` +
      `· margin left ₦${margin.toLocaleString()}`
  );
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll checks passed.");

# ADR-007: Rewards Engine

**Status:** Accepted  
**Date:** 2026-06-28

## Decision

Customer cashback wallet: `src/core/rewards-engine/`

- 2% earn on completed bookings (via escrow release)
- Max 20% redeem at checkout
- 12-month expiry + cron maintenance
- Admin adjust via `adjustUserReward()` + audit

Pure math in `utils.ts` (client-safe re-export).

## Events

- `RewardGranted` after earn → notification handler
- Admin adjust uses direct notification until `RewardAdjusted` event added

## Separation

Rewards wallet is **customer** balance. Vendor payouts are **wallet-engine** — never mixed.

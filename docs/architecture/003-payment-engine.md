# ADR-003: Payment Engine

**Status:** Accepted  
**Date:** 2026-06-28

## Decision

- **Paystack client:** `src/core/payment-engine/`
- **Escrow lifecycle:** `src/core/escrow-engine/` (separate bounded context, coordinates with payment records)
- **Vendor wallet:** `src/core/wallet-engine/`
- **Customer rewards:** `src/core/rewards-engine/`
- **Shared constants:** `src/core/shared/config.ts` (`PLATFORM_COMMISSION_PERCENT`, `VENDOR_PAYOUT_PERCENT`, `BOOKING_CHARGE_PERCENT`)

## Why

Money paths must not diverge. P0 (live Paystack) extends these engines; it does not add parallel payout logic.

## Future

Additional providers plug into `payment-engine` adapters; escrow rules unchanged.

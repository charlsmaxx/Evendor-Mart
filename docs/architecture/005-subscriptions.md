# ADR-005: Subscription Engine (Planned)

**Status:** Proposed  
**Date:** 2026-06-28

## Decision (target)

Centralize tier checks in `src/core/subscription-engine/`:

- Free / Premium / Business / Enterprise
- Feature flags derived from tier
- Paystack subscription webhook handling

## Current state

Stub only. Logic lives in `src/app/api/subscriptions/route.ts`.

## Migration

Move checkout + tier resolution to subscription engine during P0 (Paystack business account).

# ADR-006: Escrow Engine

**Status:** Accepted  
**Date:** 2026-06-28

## Decision

Escrow rules live only in `src/core/escrow-engine/service.ts`:

1. Customer pays → HELD
2. Complete / auto-release (48h) → RELEASED + payout record
3. Dispute → DISPUTED, admin resolve

## Integrations

- Calls `earnReward()` on release (rewards-engine)
- Emits `EscrowReleased`, `DisputeOpened`, `DisputeResolved`, `BookingCompleted`
- Uses `writeAuditLog()` for all audit entries

## Why

Trust and money movement are one bounded context. Vendor "mark completed" must eventually call this engine (P0).

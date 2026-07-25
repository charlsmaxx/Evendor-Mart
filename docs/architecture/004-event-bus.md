# ADR-004: Domain Event Bus

**Status:** Accepted  
**Date:** 2026-06-28

## Decision

- **Emit:** `emitDomainEvent()` from `src/core/events/bus.ts`
- **Subscribe:** `src/core/events/register-handlers.ts`
- **Side effects** (in-app notify, future email/SMS) only in handlers

Engines emit facts (`BookingCreated`, `EscrowReleased`). They do not call `notifyUser()` directly (except legacy migration window).

## Why

Decouples booking/escrow from notifications, analytics, CRM. Enables future async workers without rewriting business rules.

## Events (current)

| Event | Emitter | Handler |
|-------|---------|---------|
| BookingCreated | bookings API | Vendor notification |
| BookingConfirmed | confirm flow | Vendor notification |
| EscrowReleased | escrow-engine | Customer + vendor |
| DisputeOpened | escrow-engine | Vendor |
| RewardGranted | rewards-engine | Customer |
| VerificationStatusChanged | admin verification | Vendor |

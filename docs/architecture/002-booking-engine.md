# ADR-002: Single Booking Engine

**Status:** Accepted  
**Date:** 2026-06-28

## Decision

All booking creation flows use `src/core/booking-engine/service.ts`:

- `reserveSlot()` — atomic anti-double-booking
- `confirmBooking()` — RESERVED → CONFIRMED
- `checkAvailability()` / `expireStaleReservations()`

Sources (marketplace, manual, admin, API, mobile) differ only in **who calls** the engine, not in logic.

## Why

Race conditions and slot conflicts must have one implementation. Serializable transactions + row locks live in one place.

## Events

- `BookingCreated` — after successful reserve
- `BookingConfirmed` — after payment confirm

Notifications subscribe via event bus, not inline in routes.

# Evendor Core Architecture

> **Status:** Foundation refactor complete (2026-06-28). All existing `@/lib/*` imports continue to work.

Evendor is organized as **reusable business engines** under `src/core/`. Dashboards, API routes, and UI consume these engines — they do not duplicate business logic.

## Principles

1. **Single source of truth** — one engine per capability (booking, escrow, rewards, etc.)
2. **Backward compatible** — `@/lib/booking-engine` re-exports `@/core/booking-engine`
3. **Event-driven side effects** — notifications flow through domain events, not scattered `notifyUser()` calls in engines
4. **Centralized audit** — `writeAuditLog()` in `@/core/audit-engine`
5. **Shared config** — payout %, deposit %, auto-release hours in `@/core/shared/config`

## Engine map

| Engine | Path | Responsibility |
|--------|------|----------------|
| Booking | `core/booking-engine/` | Reservations, conflicts, confirm, expire |
| Calendar | `core/calendar-engine/` | Month views, blocked dates + bookings |
| Availability | `core/availability-engine/` | Working hours, vacations, slot checks |
| Payment | `core/payment-engine/` | Paystack client |
| Escrow | `core/escrow-engine/` | Hold, release, dispute, auto-release |
| Rewards | `core/rewards-engine/` | Customer cashback wallet |
| Wallet | `core/wallet-engine/` | Vendor payout stats + overview aggregates |
| Messaging | `core/messaging-engine/` | Conversations, unread counts |
| Notification | `core/notification-engine/` | In-app notifications (email/SMS via events later) |
| Identity | `core/identity-engine/` | Auth, session user, vendor lookup |
| Authorization | `core/authorization-engine/` | RBAC, admin section permissions |
| Media | `core/media-engine/` | Cloudinary uploads, images, crop |
| Search | `core/search-engine/` | Marketplace listing search |
| Trust | `core/trust-engine/` | Fraud detection |
| Analytics | `core/analytics-engine/` | Admin health score, labels |
| Audit | `core/audit-engine/` | Audit log writes |
| Events | `core/events/` | Domain event bus + handlers |

Stub engines (extend in P6/P0): `verification-engine`, `subscription-engine`, `crm-engine`, `reporting-engine`.

## Domain events

Business actions emit events via `emitDomainEvent()`:

- `EscrowReleased`, `DisputeOpened`, `DisputeResolved`
- `BookingCompleted`, `BookingConfirmed`
- `RewardGranted`, `VerificationApproved`

Handlers in `core/events/register-handlers.ts` subscribe and trigger notifications. **Do not call `notifyUser()` directly from escrow/booking engines** — emit an event instead.

## Import guide

```typescript
// Preferred for new code
import { reserveSlot } from "@/core/booking-engine";
import { releaseEscrow } from "@/core/escrow-engine";
import { requireVendor } from "@/core/identity-engine";
import { writeAuditLog } from "@/core/audit-engine";
import { emitDomainEvent } from "@/core/events";

// Still valid (backward compatible)
import { reserveSlot } from "@/lib/booking-engine";
```

## Infrastructure (stays in `src/lib/`)

Not moved to engines (cross-cutting, not business logic):

- `prisma.ts`, `api-response.ts`, `redis.ts`, `rate-limit.ts`
- `supabase/*`, `validations/*`, `utils.ts`

Core engines import DB via `@/core/infrastructure/prisma` (aliases `@/lib/prisma`).

## Adding a feature (P6+)

1. Extend the relevant **engine** service
2. Emit a **domain event** if notifications or other modules should react
3. Add **audit** via `writeAuditLog()` for admin actions
4. Wire API route as thin HTTP layer (auth → engine → `jsonOk`)
5. **Never** duplicate logic in dashboard components

## Remaining consolidation (future)

- Calendar block/bulk/vacation routes → `calendar-engine` methods
- Subscription checkout → `subscription-engine`
- Quote/leads pipeline → `crm-engine`

## Migration status (2026-06-28)

- **Audit:** All API routes use `writeAuditLog()` (no inline `prisma.auditLog.create`)
- **Events:** Notifications flow through domain event handlers (`register-handlers.ts`)
- **Admin RBAC:** Section-scoped `requireAdminSection()` on APIs + layout guard
- **Analytics:** Admin dashboard/trust/analytics → `analytics-engine/platform-stats.ts`
- **Docs:** ADRs in `docs/architecture/` (constitution + decisions 000–007)

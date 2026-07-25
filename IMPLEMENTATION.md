# Evendor Implementation Tracker

> **Order:** P1 → P2 → … → P9 → P0 last (after Paystack business account is fully set up)
>
> Status: `[ ]` Not started · `[~]` Partial · `[x]` Done · `[—]` Blocked / deferred

---

## Blocked — Paystack business account (do before P0)

- [ ] Complete Paystack business verification (CAC, bank, directors)
- [ ] Enable Transfers / Subaccounts in Paystack dashboard
- [ ] Add live/test keys to production env
- [ ] Configure webhook URL → `/api/webhooks/paystack`
- [ ] Connect vendor `paystackSubaccount` onboarding flow

---

## P0 — Money, trust & automation (after Paystack setup)

- [ ] Wire vendor "Mark Completed" to escrow rules
- [ ] Real Paystack payouts + subaccount transfers
- [ ] Withdrawal processing (not audit-log only)
- [~] Cron: expire stale reservations — logic + `/api/cron/escrow` (needs `CRON_SECRET` + Vercel deploy)
- [~] Cron: auto-release escrow (48h) — logic + `/api/cron/escrow`
- [x] Cron: expire rewards (12 months) — `/api/cron/rewards`
- [~] `vercel.json` cron schedules — rewards + escrow registered
- [ ] Failed withdrawal tracking (admin)

---

## P1 — Vendor dashboard

**Status: Done** — see session log.

---

## P2 — Customer experience

**Status: Done** — see session log.

---

## P3 — Messaging

**Status: Done** — see session log.

---

## P4 — Admin

**Status: Done** — see session log.

---

## P5 — Rewards system

**Status: Done** — see session log.

---

## P6 — Trust & escrow

- [x] Paystack webhook → payment/escrow sync (`charge.success`, `charge.failed`, `refund.processed`)
- [x] Partial refunds — Paystack `createRefund` + admin partial % modal
- [x] Admin dispute evidence gallery on Trust page
- [x] Booking snapshot card (vendor, customer, admin bookings)
- [x] Completion reminder in-app notifications + optional email
- [x] Escrow cron `/api/cron/escrow` (expire reservations, reminders, auto-release)

**Migration:** run `prisma/add-p6-escrow-refunded.sql` in Supabase (adds `REFUNDED` to `EscrowStatus`).

---

## P7 — Infrastructure & config

- [~] SQL migrations — run pending files in Supabase as needed (`add-p6-escrow-refunded.sql`, `add-p9-terms.sql`, etc.)
- [x] Upstash Redis — wired (`redis.ts`, cache, rate limits)
- [x] Arcjet — live when `ARCJET_KEY` set (`src/lib/arcjet.ts`)
- [—] Paystack live keys + webhook — blocked on business verification
- [x] Cloudinary — configured via env
- [x] Email provider — Resend REST wrapper (`src/lib/email.ts`); set `RESEND_API_KEY`
- [~] Error monitoring — Web Vitals + structured logs (no Sentry yet)

---

## P8 — UI / polish

- [ ] Dark/light mode everywhere
- [~] Skeleton loaders — widely used
- [x] Shared `EmptyState` component (`src/components/ui/empty-state.tsx`)
- [x] Mobile vendor "More" menu (`VendorMobileNav`)
- [x] Subscription tier display — already on `/vendor/subscription`
- [x] Vendor analytics page — already on `/vendor/analytics`

---

## P9 — Security & compliance

- [~] Audit logging — engines + selective routes; expand over time
- [x] Vendor ownership validation — `vendor-api-auth.ts`
- [~] Rate limiting — search, messages, listings POST, payments initialize
- [x] GDPR data export — `GET /api/me/export`
- [x] Terms acceptance — register checkbox + `POST /api/auth/accept-terms`

**Migration:** run `prisma/add-p9-terms.sql` in Supabase (adds `termsAcceptedAt` on `User`).

---

## Session log

| Date | Work |
|------|------|
| 2026-06-10 | Created tracker. P0 deferred until Paystack business setup. Starting P1. |
| 2026-06-15 | P1: Booking detail page, booking GET API, chat deep link, leads accept/decline/respond. |
| 2026-06-15 | P1: Listing edit/delete/archive API + UI, draft → publish workflow. |
| 2026-06-15 | P1: Profile/cover device upload, package editor, auto-notifications on key events. |
| 2026-06-16 | P1: Booking evidence upload, dispute file upload, marketplace packages display. |
| 2026-06-16 | P1: Calendar hours/vacation/listing filter, portfolio video/reorder/cover, revenue daily chart + CSV. |
| 2026-06-16 | P1 complete: Image crop & preview on profile, cover, and listing uploads. |
| 2026-06-16 | P2: Rewards wallet page, dashboard history, nav balance, customer dispute evidence, My business → /vendor. |
| 2026-06-28 | P3: Typing indicators, read receipts, pinned chats, search, documents, message pagination. Build fixes (listings type, revenue CSV, booking evidence JSON). |
| 2026-06-28 | P4: Admin roles (Super/Finance/Support/Moderator), live audit feed, fraud flags, Paystack reconciliation. |
| 2026-06-28 | P5: Expiry notifications, cron maintenance, admin adjust, redemption/breakage rates, paginated history. |
| 2026-06-28 | Core architecture refactor: `src/core/*` engines, domain events, audit engine, lib re-exports. See CORE-ARCHITECTURE.md. |
| 2026-06-28 | Architecture constitution path: ADRs (000–007), admin section RBAC, full audit migration, event bus for all notifications, admin analytics engine, Paystack webhook → events. |
| 2026-07-03 | P6–P9: Webhook sync, partial refunds, evidence gallery, snapshot UX, escrow cron, Resend email, Arcjet, GDPR export, terms acceptance, mobile More menu. |

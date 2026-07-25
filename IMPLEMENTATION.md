# Evendor Implementation Tracker

> **Order:** P1 → P2 → … → P9 → P0 last (after Paystack business account is fully set up)
>
> Status: `[ ]` Not started · `[~]` Partial · `[x]` Done · `[—]` Blocked / deferred

---

## Paystack account checklist (dashboard work, not code)

- [x] Test keys in `.env.local`
- [ ] Complete Paystack business verification (CAC, bank, directors) — required before *live* transfers
- [ ] Turn **Transfers OTP off** (Settings → Preferences) — otherwise payouts stall at `otp`
- [ ] Configure webhook URL → `/api/webhooks/paystack`, subscribed to `charge.success`,
      `charge.failed`, `refund.processed`, `transfer.success`, `transfer.failed`, `transfer.reversed`
- [ ] Swap `sk_test_…` → `sk_live_…` in production env
- [ ] Set a real `CRON_SECRET` (16+ chars) — `/api/cron/*` returns 503 while it is a placeholder

---

## P0 — Money, trust & automation

**Status: code complete on test keys.** Only the dashboard checklist above blocks live money.

- [x] Wire vendor "Mark Completed" to escrow rules — vendor marking a booking delivered now
      sets `IN_PROGRESS` + `vendorCompletedAt` and opens the customer confirmation window
      instead of silently stranding escrow in `HELD`. Escrow releases on customer confirm,
      admin action, or 48h auto-release. Manual bookings (no escrow) still complete directly.
- [x] Real Paystack transfers — `createTransferRecipient`, `initiateTransfer`,
      `fetchTransferByReference` in `src/core/payment-engine/paystack.ts`
- [x] Withdrawal processing — `Withdrawal` model + `src/core/payment-engine/payout-service.ts`.
      Balance recomputed inside a Serializable transaction, one in-flight withdrawal per vendor,
      caller-generated unique reference so retries cannot double-pay.
- [x] Vendor payout ledger — `src/core/wallet-engine/ledger.ts` is the single definition of
      `available = released − withdrawn − in-flight`
- [x] Payout bank account management — `GET/PUT /api/vendor/bank-account` (Paystack name
      resolution, locked while a withdrawal is in flight)
- [x] Cron: expire stale reservations + auto-release escrow (48h) — `/api/cron/escrow`
- [x] Cron: expire rewards (12 months) — `/api/cron/rewards`
- [x] Cron: withdrawal reconciliation — `/api/cron/payouts` every 15 min (safety net for
      transfer webhooks that never arrive)
- [x] `vercel.json` cron schedules — rewards, escrow, payouts
- [x] Failed withdrawal tracking (admin) — `GET /api/admin/withdrawals`,
      `POST /api/admin/withdrawals/[id]/retry`, surfaced on `/admin/escrow`

**Migration:** run `prisma/add-p0-withdrawals.sql` (adds `Withdrawal`, `Booking.vendorCompletedAt`).

**Deliberately not done — subaccount split payments.** Escrow requires Evendor to hold funds
until the event settles. Paystack subaccounts settle straight to the vendor at charge time,
which would bypass escrow entirely. Payouts therefore use Transfers, and
`VendorProfile.paystackSubaccount` stays unused.

### Escrow decision flow (customer holds the release key)

1. Customer pays → funds held in escrow, vendor's available balance unaffected.
2. Vendor presses **Mark Completed** → booking goes to `IN_PROGRESS` with `vendorCompletedAt`
   set, and the customer gets an actionable notification. No money moves.
3. Customer sees two choices on `/bookings/[id]`:
   - **Approve — the job is done** → `POST /api/bookings/[id]/confirm` releases escrow,
     credits the vendor's balance, and the vendor can withdraw instantly.
   - **Report a problem** → `POST /api/bookings/[id]/dispute` locks the funds. No release
     path can fire until an admin resolves it.
4. If the customer does neither, the escrow cron auto-releases after `AUTO_RELEASE_HOURS`
   (48h) — but only when no dispute is open.

Withdrawals are intentionally **not** admin-gated: the trust gate is escrow release, so by
the time a balance is withdrawable the money is unambiguously the vendor's. To switch to
approval-gated payouts, stop `createAndProcessWithdrawal` from auto-calling
`processWithdrawal` and expose the latter behind an admin endpoint.

**Dispute lock is enforced in four places** so no caller can bypass it:
`releaseEscrow` (throws `EscrowRuleError`), the booking `PATCH` route, the customer
`confirm` route, and `autoReleaseExpiredEscrows` (filters `dispute: null`).
`openDispute` also refuses once a `Payout` exists, since a dispute cannot lock money
that has already been released.

### ✅ Resolved — full payment upfront

Marketplace bookings are now charged **100% upfront**. `releaseEscrow` credits the vendor
85% of the booking total, so escrow must hold the whole total or vendors could withdraw
money Evendor never collected. Previously only a 30% deposit was charged, which meant a
₦100,000 booking took in ₦30,000 and credited out ₦85,000.

- `BOOKING_DEPOSIT_PERCENT` is gone; `BOOKING_CHARGE_PERCENT = 100` is a fixed constant in
  `src/core/shared/config.ts`, deliberately not env-tunable.
- `POST /api/bookings` sets `depositAmount = totalAmount`.
- `Booking.depositPercent` now defaults to `100` — run `prisma/add-p0-full-payment.sql`,
  which also repoints unpaid marketplace reservations at the full amount.
- The `depositAmount` / `depositPercent` columns stay for manual/offline bookings, where a
  vendor records a partial amount they collected themselves. Nothing in the marketplace
  flow reads them.
- Deposit wording is gone from the UI: booking form, listing price card, booking detail
  pages, vendor and admin booking lists, dashboard, invoice, marketing copy, and terms.
  Vendor onboarding no longer asks for a "Deposit %".

### Commission and rewards

Evendor's cut is **7%** of the booking total (`PLATFORM_COMMISSION_PERCENT`), taken at
escrow release. `VENDOR_PAYOUT_PERCENT` is derived as `100 - commission` so the two cannot
drift. Both are plain constants rather than env vars: they are read in client bundles to
price a checkout, and an env value the browser cannot see would quote customers a discount
the server then refuses.

> Changed from 15%. The code had shipped `VENDOR_PAYOUT_PERCENT = 85` while the business
> rule was 7%, so vendors were being underpaid by 8 points of every booking.

Rewards redemption works on the **wallet**, not the booking:

- A booking spends 20% of the customer's balance (`WALLET_REDEEM_RATIO`). ₦1,200 in the
  wallet puts ₦240 toward a booking and leaves ₦960, so a balance is drawn down over many
  bookings instead of emptying into the first one.
- Hard ceiling of the platform commission on that booking. The discount is funded out of
  Evendor's 7% — the vendor is still paid 93% of the full `totalAmount` — so redeeming more
  than the commission would pay out more than the booking earns.
- The discount is real: `reserveSlot` reduces `Payment.amount`, which is what Paystack
  charges and what the webhook validates against. Previously the wallet was debited and the
  customer was charged full price anyway.
- The amount is computed inside the booking transaction from the wallet row, never from the
  client. `POST /api/bookings` takes only an `applyRewards` boolean;
  `GET /api/rewards/redeem` is a read-only price preview.
- Rewards spent on a booking that is never paid for come back. `refundRedeemedRewards` runs
  on cancel/decline, and `reconcileAbandonedRedemptions` (daily rewards cron) sweeps up
  bookings that died down other paths, including the raw-SQL expiry inside the conflict
  check. Both are idempotent.

At maximum redemption the commission is fully consumed, so that booking earns Evendor
nothing and loses the Paystack fee. Lower `WALLET_REDEEM_RATIO` or cap below the commission
if that matters at volume.

### Money-path security

- Webhook signature verified with a timing-safe compare; Node runtime pinned; 64 KB body cap
- `charge.success` rejects underpayments and non-NGN currency instead of trusting the payload
- `charge.failed` cannot downgrade an already-successful payment
- Every handler is idempotent and keyed on our own reference
- Cron auth: timing-safe secret compare, placeholder secrets refused
- Withdrawals rate-limited to 5/hour per user; clients never supply a balance
- Full account numbers never leave the server — only last 4 digits

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

- [~] SQL migrations — run pending files in Supabase as needed (`add-p6-escrow-refunded.sql`, `add-p9-terms.sql`, `add-p0-withdrawals.sql`)
- [x] Upstash Redis — wired (`redis.ts`, cache, rate limits)
- [x] Arcjet — live when `ARCJET_KEY` set (`src/lib/arcjet.ts`)
- [~] Paystack — charges, refunds, transfers and webhooks all wired against test keys;
      live keys blocked on business verification
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
- [~] Rate limiting — search, messages, listings POST, payments initialize, withdrawals (5/h), bank account updates
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
| 2026-07-25 | P0: Real Paystack transfers, `Withdrawal` ledger + payout service, payout bank account API, escrow-aware "Mark Completed", transfer webhooks, hardened webhook + cron auth, admin failed-withdrawal retry, payouts reconciliation cron. |
| 2026-07-25 | Escrow decision flow: customer approve/dispute buttons trigger on vendor completion, dispute lock enforced in `releaseEscrow`, `openDispute` blocked after payout. Dev DB moved to transaction pooler (6543) — session pooler and direct host are unreachable on this project. |
| 2026-07-25 | 100% upfront charge replaces the 30% deposit, closing the escrow shortfall. `BOOKING_CHARGE_PERCENT` constant, `add-p0-full-payment.sql` applied, deposit wording removed across the UI, invoice now shows amount paid / balance due (and escapes HTML). |
| 2026-07-25 | Commission corrected to 7% (vendor payout 93%, derived). Rewards now discount the actual charge: 20% of wallet balance per booking, capped at commission, computed server-side inside the booking transaction, refunded when a booking goes unpaid. `add-rewards-discount.sql` applied. |
| 2026-07-26 | Booking-engine hardening: server price bounds, reject past event dates, webhook/verify refuse expired or conflicted slots (auto-refund), reuse Paystack refs, return-URL verify, expire cleans payments+rewards, enforce BlockedDate/vacation/closed days on marketplace, Serializable retry, auto-release keys off vendorCompletedAt. |

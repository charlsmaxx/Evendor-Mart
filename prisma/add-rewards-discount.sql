-- Rewards are now a real discount on the Paystack charge rather than a wallet debit with
-- no effect on what the customer pays. Records how much came off each booking so the
-- booking page and invoice can show it. Run in Supabase SQL editor. Safe to re-run.

ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "rewardsRedeemed" INTEGER NOT NULL DEFAULT 0;

-- Backfill from the reward ledger so historical bookings report what was actually taken.
UPDATE "Booking" b
SET "rewardsRedeemed" = r.total
FROM (
  SELECT "bookingId", SUM(amount)::int AS total
  FROM "RewardTransaction"
  WHERE type = 'REDEEMED' AND status = 'CONFIRMED' AND "bookingId" IS NOT NULL
  GROUP BY "bookingId"
) r
WHERE b.id = r."bookingId"
  AND b."rewardsRedeemed" <> r.total;

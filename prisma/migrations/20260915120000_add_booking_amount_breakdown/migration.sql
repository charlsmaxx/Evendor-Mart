-- Add booking amount breakdown fields (base, caution fee, agreed additional charge)
-- Phase 1: Three-way amount separation for commission/rewards calculations

-- Add new columns with defaults (non-destructive, no data loss)
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "baseBookingAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "cautionFeeAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "agreedAdditionalChargeAmount" INTEGER NOT NULL DEFAULT 0;

-- Backfill historical bookings:
-- For all existing bookings, the entire totalAmount was the base booking amount.
-- Caution fee and agreed additional charges did not exist historically.
UPDATE "Booking"
SET
  "baseBookingAmount" = "totalAmount",
  "cautionFeeAmount" = 0,
  "agreedAdditionalChargeAmount" = 0
WHERE "baseBookingAmount" = 0;

-- Note: Manual bookings (source = 'MANUAL') also follow this pattern.
-- Manual bookings historically used totalAmount as the full agreed amount.
-- No caution fee or additional charges applied to manual bookings.
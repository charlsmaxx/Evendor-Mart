-- Add RESERVED and EXPIRED to BookingStatus enum
DO $$ BEGIN
  ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'RESERVED';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add new columns to Booking
ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "startTime"            TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "endTime"              TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "eventType"            TEXT,
  ADD COLUMN IF NOT EXISTS "guestCount"           INTEGER,
  ADD COLUMN IF NOT EXISTS "reservationExpiresAt" TIMESTAMP(3);

-- BlockedDate table
CREATE TABLE IF NOT EXISTS "BlockedDate" (
  "id"        TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "vendorId"  TEXT         NOT NULL,
  "date"      TIMESTAMP(3) NOT NULL,
  "reason"    TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "BlockedDate_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "BlockedDate"
  DROP CONSTRAINT IF EXISTS "BlockedDate_vendorId_fkey";
ALTER TABLE "BlockedDate"
  ADD CONSTRAINT "BlockedDate_vendorId_fkey"
  FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "BlockedDate_vendorId_date_idx"
  ON "BlockedDate"("vendorId","date");

-- Index on bookings for fast conflict queries
CREATE INDEX IF NOT EXISTS "Booking_listingId_eventDate_status_idx"
  ON "Booking"("listingId","eventDate","status");

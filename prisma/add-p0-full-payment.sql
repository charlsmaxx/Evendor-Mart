-- P0: marketplace bookings are charged in full, not on a 30% deposit.
-- Escrow must hold the whole booking amount, because escrow release credits the vendor
-- a share of the booking total. Run in Supabase SQL editor. Safe to re-run.

ALTER TABLE "Booking"
  ALTER COLUMN "depositPercent" SET DEFAULT 100;

-- Bring unpaid marketplace reservations onto the full-payment model. Rows that already
-- have a successful charge are left alone so history stays truthful.
UPDATE "Booking" b
SET "depositAmount" = b."totalAmount",
    "depositPercent" = 100
WHERE b."source" = 'MARKETPLACE'
  AND b."status" IN ('RESERVED', 'PENDING_PAYMENT')
  AND b."depositAmount" <> b."totalAmount"
  AND NOT EXISTS (
    SELECT 1 FROM "Payment" p
    WHERE p."bookingId" = b.id AND p."status" = 'SUCCESS'
  );

UPDATE "Payment" p
SET "amount" = b."totalAmount",
    "heldAmount" = b."totalAmount"
FROM "Booking" b
WHERE p."bookingId" = b.id
  AND p."status" = 'PENDING'
  AND b."source" = 'MARKETPLACE'
  AND b."status" IN ('RESERVED', 'PENDING_PAYMENT')
  AND p."amount" <> b."totalAmount";

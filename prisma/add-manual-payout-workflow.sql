-- Additive payout-request / admin-review / manual-payment fields.
-- Run in the Supabase SQL editor (or via prisma migrate) before deploying the app that uses these columns.
-- Does not drop columns or rewrite historical Payment rows.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'PayoutStatus' AND e.enumlabel = 'REQUESTED'
  ) THEN
    ALTER TYPE "PayoutStatus" ADD VALUE 'REQUESTED';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'PayoutStatus' AND e.enumlabel = 'UNDER_REVIEW'
  ) THEN
    ALTER TYPE "PayoutStatus" ADD VALUE 'UNDER_REVIEW';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'PayoutStatus' AND e.enumlabel = 'APPROVED'
  ) THEN
    ALTER TYPE "PayoutStatus" ADD VALUE 'APPROVED';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'PayoutStatus' AND e.enumlabel = 'REJECTED'
  ) THEN
    ALTER TYPE "PayoutStatus" ADD VALUE 'REJECTED';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'PayoutStatus' AND e.enumlabel = 'ON_HOLD'
  ) THEN
    ALTER TYPE "PayoutStatus" ADD VALUE 'ON_HOLD';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'PayoutStatus' AND e.enumlabel = 'PAYMENT_FAILED'
  ) THEN
    ALTER TYPE "PayoutStatus" ADD VALUE 'PAYMENT_FAILED';
  END IF;
END $$;

ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "requestedAt" TIMESTAMP(3);
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "requestedById" TEXT;
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "reviewedById" TEXT;
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "approvedById" TEXT;
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "paidById" TEXT;
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3);
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "rejectedById" TEXT;
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "holdReason" TEXT;
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "destinationBank" TEXT;
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "destinationAccountName" TEXT;
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "destinationAccountLast4" TEXT;
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "transferReference" TEXT;
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "paidAmount" INTEGER;
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "adjustmentAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "adjustmentReason" TEXT;

CREATE INDEX IF NOT EXISTS "Payout_status_requestedAt_idx" ON "Payout"("status", "requestedAt");

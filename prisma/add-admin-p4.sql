-- P4 Admin: granular roles + payout reconciliation
-- Run in Supabase SQL editor if prisma db push is unavailable.

CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'FINANCE', 'SUPPORT', 'MODERATOR');

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "adminRole" "AdminRole";

CREATE TYPE "ReconciliationStatus" AS ENUM ('PENDING', 'MATCHED', 'MISMATCH', 'UNVERIFIABLE');

ALTER TABLE "Payout"
  ADD COLUMN IF NOT EXISTS "paystackTransferCode" TEXT,
  ADD COLUMN IF NOT EXISTS "reconciliationStatus" "ReconciliationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "reconciledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reconciliationNote" TEXT;

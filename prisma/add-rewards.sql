-- Rewards enums
DO $$ BEGIN
  CREATE TYPE "RewardTransactionType" AS ENUM ('EARNED','REDEEMED','EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "RewardTransactionStatus" AS ENUM ('PENDING','CONFIRMED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- RewardsWallet
CREATE TABLE IF NOT EXISTS "RewardsWallet" (
  "id"               TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"           TEXT         NOT NULL,
  "availableBalance" INTEGER      NOT NULL DEFAULT 0,
  "totalEarned"      INTEGER      NOT NULL DEFAULT 0,
  "totalRedeemed"    INTEGER      NOT NULL DEFAULT 0,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "RewardsWallet_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RewardsWallet"
  DROP CONSTRAINT IF EXISTS "RewardsWallet_userId_key";
ALTER TABLE "RewardsWallet"
  ADD CONSTRAINT "RewardsWallet_userId_key" UNIQUE ("userId");

ALTER TABLE "RewardsWallet"
  DROP CONSTRAINT IF EXISTS "RewardsWallet_userId_fkey";
ALTER TABLE "RewardsWallet"
  ADD CONSTRAINT "RewardsWallet_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

-- RewardTransaction
CREATE TABLE IF NOT EXISTS "RewardTransaction" (
  "id"          TEXT                        NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"      TEXT                        NOT NULL,
  "walletId"    TEXT                        NOT NULL,
  "bookingId"   TEXT,
  "amount"      INTEGER                     NOT NULL,
  "type"        "RewardTransactionType"     NOT NULL,
  "status"      "RewardTransactionStatus"   NOT NULL DEFAULT 'CONFIRMED',
  "expiresAt"   TIMESTAMP(3),
  "description" TEXT,
  "createdAt"   TIMESTAMP(3)                NOT NULL DEFAULT NOW(),
  CONSTRAINT "RewardTransaction_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RewardTransaction"
  DROP CONSTRAINT IF EXISTS "RewardTransaction_walletId_fkey";
ALTER TABLE "RewardTransaction"
  ADD CONSTRAINT "RewardTransaction_walletId_fkey"
  FOREIGN KEY ("walletId") REFERENCES "RewardsWallet"("id") ON DELETE CASCADE;

ALTER TABLE "RewardTransaction"
  DROP CONSTRAINT IF EXISTS "RewardTransaction_bookingId_fkey";
ALTER TABLE "RewardTransaction"
  ADD CONSTRAINT "RewardTransaction_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "RewardTransaction_userId_type_status_idx"
  ON "RewardTransaction"("userId","type","status");
CREATE INDEX IF NOT EXISTS "RewardTransaction_expiresAt_idx"
  ON "RewardTransaction"("expiresAt");

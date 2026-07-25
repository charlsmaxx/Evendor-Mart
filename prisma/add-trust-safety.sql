-- ── Enums ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "DisputeStatus" AS ENUM ('OPEN','UNDER_REVIEW','RESOLVED_REFUND','RESOLVED_PAYOUT','RESOLVED_PARTIAL','CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PayoutStatus" AS ENUM ('PENDING','PROCESSING','PAID','FAILED','REVERSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED','PENDING','VERIFIED','REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── VendorProfile new columns ──────────────────────────────────────────
ALTER TABLE "VendorProfile"
  ADD COLUMN IF NOT EXISTS "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN IF NOT EXISTS "responseRate"        DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "cancellationRate"    DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "completionRate"      DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "disputeRate"         DOUBLE PRECISION;

-- ── Booking new columns ────────────────────────────────────────────────
ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "bookingSnapshot"       JSONB,
  ADD COLUMN IF NOT EXISTS "completionConfirmedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "completionConfirmedBy" TEXT;

-- ── Review: add bookingId ──────────────────────────────────────────────
ALTER TABLE "Review"
  ADD COLUMN IF NOT EXISTS "bookingId" TEXT;

ALTER TABLE "Review"
  DROP CONSTRAINT IF EXISTS "Review_bookingId_fkey";
ALTER TABLE "Review"
  ADD CONSTRAINT "Review_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Review_bookingId_key"
  ON "Review"("bookingId") WHERE "bookingId" IS NOT NULL;

-- ── Dispute ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Dispute" (
  "id"           TEXT             NOT NULL DEFAULT gen_random_uuid()::text,
  "bookingId"    TEXT             NOT NULL,
  "raisedById"   TEXT             NOT NULL,
  "reason"       TEXT             NOT NULL,
  "status"       "DisputeStatus"  NOT NULL DEFAULT 'OPEN',
  "adminNotes"   TEXT,
  "resolution"   TEXT,
  "resolvedAt"   TIMESTAMP(3),
  "resolvedById" TEXT,
  "createdAt"    TIMESTAMP(3)     NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMP(3)     NOT NULL DEFAULT NOW(),
  CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Dispute_bookingId_key" ON "Dispute"("bookingId");
CREATE INDEX IF NOT EXISTS "Dispute_status_createdAt_idx" ON "Dispute"("status","createdAt");

ALTER TABLE "Dispute" DROP CONSTRAINT IF EXISTS "Dispute_bookingId_fkey";
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE;
ALTER TABLE "Dispute" DROP CONSTRAINT IF EXISTS "Dispute_raisedById_fkey";
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_raisedById_fkey"
  FOREIGN KEY ("raisedById") REFERENCES "User"("id") ON DELETE CASCADE;

-- ── DisputeEvidence ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "DisputeEvidence" (
  "id"           TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "disputeId"    TEXT         NOT NULL,
  "uploadedById" TEXT         NOT NULL,
  "url"          TEXT         NOT NULL,
  "publicId"     TEXT,
  "caption"      TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "DisputeEvidence_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "DisputeEvidence" DROP CONSTRAINT IF EXISTS "DisputeEvidence_disputeId_fkey";
ALTER TABLE "DisputeEvidence" ADD CONSTRAINT "DisputeEvidence_disputeId_fkey"
  FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE CASCADE;

-- ── Payout ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Payout" (
  "id"          TEXT            NOT NULL DEFAULT gen_random_uuid()::text,
  "vendorId"    TEXT            NOT NULL,
  "bookingId"   TEXT            NOT NULL,
  "amount"      INTEGER         NOT NULL,
  "status"      "PayoutStatus"  NOT NULL DEFAULT 'PENDING',
  "reference"   TEXT            NOT NULL,
  "processedAt" TIMESTAMP(3),
  "notes"       TEXT,
  "createdAt"   TIMESTAMP(3)    NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMP(3)    NOT NULL DEFAULT NOW(),
  CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Payout_bookingId_key" ON "Payout"("bookingId");
CREATE UNIQUE INDEX IF NOT EXISTS "Payout_reference_key" ON "Payout"("reference");
CREATE INDEX IF NOT EXISTS "Payout_vendorId_status_idx" ON "Payout"("vendorId","status");

ALTER TABLE "Payout" DROP CONSTRAINT IF EXISTS "Payout_vendorId_fkey";
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_vendorId_fkey"
  FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE;
ALTER TABLE "Payout" DROP CONSTRAINT IF EXISTS "Payout_bookingId_fkey";
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE;

-- ── VerificationRequest ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "VerificationRequest" (
  "id"           TEXT                 NOT NULL DEFAULT gen_random_uuid()::text,
  "vendorId"     TEXT                 NOT NULL,
  "documents"    TEXT[]               NOT NULL DEFAULT '{}',
  "notes"        TEXT,
  "adminNotes"   TEXT,
  "status"       "VerificationStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedById" TEXT,
  "reviewedAt"   TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3)         NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMP(3)         NOT NULL DEFAULT NOW(),
  CONSTRAINT "VerificationRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "VerificationRequest_vendorId_key" ON "VerificationRequest"("vendorId");
CREATE INDEX IF NOT EXISTS "VerificationRequest_status_createdAt_idx" ON "VerificationRequest"("status","createdAt");

ALTER TABLE "VerificationRequest" DROP CONSTRAINT IF EXISTS "VerificationRequest_vendorId_fkey";
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_vendorId_fkey"
  FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE;

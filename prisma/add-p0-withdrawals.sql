-- P0: vendor cash-out ledger. Run in Supabase SQL editor.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS "Withdrawal" (
  "id"                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "vendorId"             TEXT NOT NULL,
  "amount"               INTEGER NOT NULL,
  "status"               "PayoutStatus" NOT NULL DEFAULT 'PENDING',
  "reference"            TEXT NOT NULL,
  "paystackTransferCode" TEXT,
  "recipientCode"        TEXT,
  "bankName"             TEXT,
  "accountNumberLast4"   TEXT,
  "failureReason"        TEXT,
  "attempts"             INTEGER NOT NULL DEFAULT 0,
  "requestedById"        TEXT,
  "processedAt"          TIMESTAMPTZ,
  "createdAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Withdrawal_vendorId_fkey"
    FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Withdrawal_reference_key"
  ON "Withdrawal" ("reference");

CREATE INDEX IF NOT EXISTS "Withdrawal_vendorId_status_idx"
  ON "Withdrawal" ("vendorId", "status");

CREATE INDEX IF NOT EXISTS "Withdrawal_status_createdAt_idx"
  ON "Withdrawal" ("status", "createdAt");

-- P0: vendor "Mark Completed" starts the customer confirmation window.
ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "vendorCompletedAt" TIMESTAMPTZ;

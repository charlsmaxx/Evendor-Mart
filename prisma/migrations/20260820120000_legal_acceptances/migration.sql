-- Versioned Terms of Service / Privacy Policy acceptance history
CREATE TABLE IF NOT EXISTS "LegalAcceptance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "termsVersion" TEXT NOT NULL,
    "privacyVersion" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "acceptanceMethod" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalAcceptance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LegalAcceptance_userId_termsVersion_privacyVersion_key"
  ON "LegalAcceptance"("userId", "termsVersion", "privacyVersion");

CREATE INDEX IF NOT EXISTS "LegalAcceptance_userId_acceptedAt_idx"
  ON "LegalAcceptance"("userId", "acceptedAt");

ALTER TABLE "LegalAcceptance"
  DROP CONSTRAINT IF EXISTS "LegalAcceptance_userId_fkey";

ALTER TABLE "LegalAcceptance"
  ADD CONSTRAINT "LegalAcceptance_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Legal acceptance history (run in Supabase SQL editor if not applying Prisma migrations)
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LegalAcceptance_userId_fkey'
  ) THEN
    ALTER TABLE "LegalAcceptance"
      ADD CONSTRAINT "LegalAcceptance_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE IF EXISTS public."LegalAcceptance" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "legal_acceptances_select_own" ON public."LegalAcceptance";
CREATE POLICY "legal_acceptances_select_own" ON public."LegalAcceptance"
  FOR SELECT USING (auth.uid()::text = "userId");

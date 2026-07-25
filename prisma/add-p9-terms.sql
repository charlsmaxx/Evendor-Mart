-- P9: platform terms acceptance timestamp on User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMPTZ;

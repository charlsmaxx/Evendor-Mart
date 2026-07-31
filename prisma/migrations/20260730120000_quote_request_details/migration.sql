-- AlterTable
ALTER TABLE "QuoteRequest" ADD COLUMN IF NOT EXISTS "details" JSONB;

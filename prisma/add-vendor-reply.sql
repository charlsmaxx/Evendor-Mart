-- Run in Supabase SQL Editor after init.sql (adds vendor reply fields to Review)
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "vendorReply" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "repliedAt" TIMESTAMP(3);

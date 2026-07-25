-- P3 messaging: pinned conversations, document type, admin read tracking
-- Run in Supabase SQL editor if prisma db execute is unavailable.

ALTER TYPE "MessageType" ADD VALUE IF NOT EXISTS 'DOCUMENT';

ALTER TABLE "Conversation"
  ADD COLUMN IF NOT EXISTS "adminLastReadAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "customerPinnedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "vendorPinnedAt" TIMESTAMP(3);

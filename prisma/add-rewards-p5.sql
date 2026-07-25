-- P5 rewards: admin adjustments
-- Run in Supabase SQL editor if prisma db execute is unavailable.

ALTER TYPE "RewardTransactionType" ADD VALUE IF NOT EXISTS 'ADJUSTMENT';

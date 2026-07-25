-- P6: add REFUNDED to EscrowStatus for Paystack refund sync
ALTER TYPE "EscrowStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';

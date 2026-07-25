-- Evendor Premium BOS — run in Supabase SQL Editor after backup
-- Adds booking source, manual booking fields, CRM, and staff accounts

DO $$ BEGIN
  CREATE TYPE "BookingSource" AS ENUM ('MARKETPLACE', 'MANUAL', 'ADMIN', 'API');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "VendorStaffRole" AS ENUM ('MANAGER', 'RECEPTIONIST', 'ASSISTANT', 'OPERATIONS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Booking" ALTER COLUMN "customerId" DROP NOT NULL;

ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "source" "BookingSource" NOT NULL DEFAULT 'MARKETPLACE';
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "businessCustomerId" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "depositReceived" INTEGER;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "outstandingBalance" INTEGER;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "attachments" JSONB;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "createdById" TEXT;

CREATE INDEX IF NOT EXISTS "Booking_vendorId_source_idx" ON "Booking"("vendorId", "source");
CREATE INDEX IF NOT EXISTS "Booking_businessCustomerId_idx" ON "Booking"("businessCustomerId");

CREATE TABLE IF NOT EXISTS "BusinessCustomer" (
  "id" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "totalSpend" INTEGER NOT NULL DEFAULT 0,
  "internalNotes" TEXT,
  "favoriteListingId" TEXT,
  "lastBookingAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BusinessCustomer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BusinessCustomer_vendorId_phone_key" ON "BusinessCustomer"("vendorId", "phone");
CREATE INDEX IF NOT EXISTS "BusinessCustomer_vendorId_fullName_idx" ON "BusinessCustomer"("vendorId", "fullName");

CREATE TABLE IF NOT EXISTS "VendorStaff" (
  "id" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "userId" TEXT,
  "email" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "role" "VendorStaffRole" NOT NULL DEFAULT 'ASSISTANT',
  "permissions" JSONB NOT NULL DEFAULT '{}',
  "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VendorStaff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VendorStaff_vendorId_email_key" ON "VendorStaff"("vendorId", "email");
CREATE INDEX IF NOT EXISTS "VendorStaff_userId_idx" ON "VendorStaff"("userId");

ALTER TABLE "BusinessCustomer"
  ADD CONSTRAINT "BusinessCustomer_vendorId_fkey"
  FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VendorStaff"
  ADD CONSTRAINT "VendorStaff_vendorId_fkey"
  FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VendorStaff"
  ADD CONSTRAINT "VendorStaff_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_businessCustomerId_fkey"
  FOREIGN KEY ("businessCustomerId") REFERENCES "BusinessCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

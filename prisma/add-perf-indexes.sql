-- Performance indexes for hot query paths (bookings, messages, notifications)
-- Run in Supabase SQL editor.

CREATE INDEX IF NOT EXISTS "Booking_vendorId_status_idx" ON "Booking"("vendorId", "status");
CREATE INDEX IF NOT EXISTS "Booking_vendorId_eventDate_idx" ON "Booking"("vendorId", "eventDate");
CREATE INDEX IF NOT EXISTS "Booking_customerId_status_idx" ON "Booking"("customerId", "status");
CREATE INDEX IF NOT EXISTS "Booking_customerId_createdAt_idx" ON "Booking"("customerId", "createdAt");

CREATE INDEX IF NOT EXISTS "Conversation_vendorId_updatedAt_idx" ON "Conversation"("vendorId", "updatedAt");
CREATE INDEX IF NOT EXISTS "Conversation_customerId_updatedAt_idx" ON "Conversation"("customerId", "updatedAt");

CREATE INDEX IF NOT EXISTS "Message_conversationId_readAt_idx" ON "Message"("conversationId", "readAt");
CREATE INDEX IF NOT EXISTS "Message_senderId_readAt_idx" ON "Message"("senderId", "readAt");

CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx" ON "Notification"("userId", "read");
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "Listing_vendorId_idx" ON "Listing"("vendorId");
CREATE INDEX IF NOT EXISTS "QuoteRequest_vendorId_status_idx" ON "QuoteRequest"("vendorId", "status");
CREATE INDEX IF NOT EXISTS "Review_listingId_createdAt_idx" ON "Review"("listingId", "createdAt");
CREATE INDEX IF NOT EXISTS "Payment_escrowStatus_idx" ON "Payment"("escrowStatus");

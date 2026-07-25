-- Verify performance indexes from add-perf-indexes.sql exist on the connected database.
-- Run in Supabase SQL editor or: npx prisma db execute --file prisma/verify-perf-indexes.sql

SELECT
  expected.indexname,
  CASE WHEN idx.indexname IS NOT NULL THEN 'OK' ELSE 'MISSING' END AS status
FROM (
  VALUES
    ('Booking_vendorId_status_idx'),
    ('Booking_vendorId_eventDate_idx'),
    ('Booking_customerId_status_idx'),
    ('Booking_customerId_createdAt_idx'),
    ('Conversation_vendorId_updatedAt_idx'),
    ('Conversation_customerId_updatedAt_idx'),
    ('Message_conversationId_readAt_idx'),
    ('Message_senderId_readAt_idx'),
    ('Notification_userId_read_idx'),
    ('Notification_userId_createdAt_idx'),
    ('Listing_vendorId_idx'),
    ('QuoteRequest_vendorId_status_idx'),
    ('Review_listingId_createdAt_idx'),
    ('Payment_escrowStatus_idx')
) AS expected(indexname)
LEFT JOIN pg_indexes idx
  ON idx.schemaname = 'public'
 AND idx.indexname = expected.indexname
ORDER BY expected.indexname;

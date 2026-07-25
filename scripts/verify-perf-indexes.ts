/**
 * Verify performance indexes from prisma/add-perf-indexes.sql exist.
 * Usage: npm run db:verify-indexes
 */
import { PrismaClient } from "@prisma/client";

const EXPECTED_INDEXES = [
  "Booking_vendorId_status_idx",
  "Booking_vendorId_eventDate_idx",
  "Booking_customerId_status_idx",
  "Booking_customerId_createdAt_idx",
  "Conversation_vendorId_updatedAt_idx",
  "Conversation_customerId_updatedAt_idx",
  "Message_conversationId_readAt_idx",
  "Message_senderId_readAt_idx",
  "Notification_userId_read_idx",
  "Notification_userId_createdAt_idx",
  "Listing_vendorId_idx",
  "QuoteRequest_vendorId_status_idx",
  "Review_listingId_createdAt_idx",
  "Payment_escrowStatus_idx",
];

async function main() {
  const prisma = new PrismaClient();

  try {
    const rows = await prisma.$queryRaw<{ indexname: string }[]>`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
    `;

    const found = new Set(rows.map((r) => r.indexname));
    let missing = 0;

    console.log("\nPerformance index verification\n");
    for (const name of EXPECTED_INDEXES) {
      const status = found.has(name) ? "OK" : "MISSING";
      if (status === "MISSING") missing++;
      console.log(`  ${status.padEnd(7)} ${name}`);
    }

    console.log(
      missing === 0
        ? `\nAll ${EXPECTED_INDEXES.length} indexes are present.\n`
        : `\n${missing} index(es) missing. Run prisma/add-perf-indexes.sql in Supabase SQL editor.\n`
    );

    process.exit(missing === 0 ? 0 : 1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

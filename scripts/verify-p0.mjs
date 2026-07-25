import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const withdrawals = await prisma.withdrawal.count();
  const booking = await prisma.booking.findFirst({
    select: { id: true, vendorCompletedAt: true },
  });
  const payoutsByStatus = await prisma.payout.groupBy({
    by: ["status"],
    _count: { _all: true },
    _sum: { amount: true },
  });

  console.log("Withdrawal table reachable. rows =", withdrawals);
  console.log(
    "Booking.vendorCompletedAt reachable:",
    booking ? JSON.stringify(booking) : "(no bookings yet)"
  );
  console.log("Payout rows by status:", JSON.stringify(payoutsByStatus));
} finally {
  await prisma.$disconnect();
}

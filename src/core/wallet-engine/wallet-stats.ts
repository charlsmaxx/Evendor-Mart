import { prisma } from "@/core/infrastructure/prisma";
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";

import { vendorShareAmount } from "@/core/shared/config";

const PAYOUT_HISTORY_LIMIT = 50;

export async function getVendorWalletStats(vendorId: string) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const [heldPayments, paidAgg, pendingAgg, recentPayouts, monthBookings, yearBookings, withdrawnAgg] =
    await Promise.all([
      prisma.payment.findMany({
        where: {
          escrowStatus: "HELD",
          booking: { vendorId, status: { in: ["CONFIRMED", "IN_PROGRESS"] } },
        },
        select: { heldAmount: true, amount: true },
      }),
      prisma.payout.aggregate({
        where: { vendorId, status: "PAID" },
        _sum: { amount: true },
      }),
      prisma.payout.aggregate({
        where: { vendorId, status: { in: ["PROCESSING", "PENDING"] } },
        _sum: { amount: true },
      }),
      prisma.payout.findMany({
        where: { vendorId },
        orderBy: { createdAt: "desc" },
        take: PAYOUT_HISTORY_LIMIT,
        select: {
          id: true,
          reference: true,
          amount: true,
          status: true,
          processedAt: true,
          createdAt: true,
          booking: {
            select: {
              eventDate: true,
              listing: { select: { title: true } },
            },
          },
        },
      }),
      prisma.booking.aggregate({
        where: {
          vendorId,
          status: { in: ["CONFIRMED", "COMPLETED"] },
          createdAt: { gte: monthStart, lte: monthEnd },
        },
        _sum: { totalAmount: true },
      }),
      prisma.booking.aggregate({
        where: {
          vendorId,
          status: { in: ["CONFIRMED", "COMPLETED"] },
          createdAt: { gte: new Date(now.getFullYear(), 0, 1), lte: monthEnd },
        },
        _sum: { totalAmount: true },
      }),
      prisma.payout.aggregate({
        where: { vendorId, status: "PAID" },
        _sum: { amount: true },
      }),
    ]);

  const pendingEarnings = heldPayments.reduce(
    (sum, p) => sum + (p.heldAmount ?? p.amount),
    0
  );

  const availableBalance = paidAgg._sum.amount ?? 0;
  const pendingRelease = pendingAgg._sum.amount ?? 0;

  const vendorShare = vendorShareAmount;

  return {
    availableBalance,
    pendingEarnings,
    escrowBalance: pendingEarnings,
    pendingRelease,
    monthEarnings: vendorShare(monthBookings._sum.totalAmount ?? 0),
    yearEarnings: vendorShare(yearBookings._sum.totalAmount ?? 0),
    withdrawnAmount: withdrawnAgg._sum.amount ?? 0,
    payouts: recentPayouts.map((p) => ({
      id: p.id,
      reference: p.reference,
      amount: p.amount,
      status: p.status,
      processedAt: p.processedAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      bookingTitle: p.booking.listing.title,
      eventDate: p.booking.eventDate.toISOString(),
    })),
    payoutHistoryLimit: PAYOUT_HISTORY_LIMIT,
    todayStart: todayStart.toISOString(),
    todayEnd: todayEnd.toISOString(),
  };
}

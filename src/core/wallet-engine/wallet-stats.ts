import { prisma } from "@/core/infrastructure/prisma";
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";

import { MIN_WITHDRAWAL_AMOUNT, vendorShareAmount } from "@/core/shared/config";
import { computeVendorBalance } from "./ledger";

const PAYOUT_HISTORY_LIMIT = 50;
const WITHDRAWAL_HISTORY_LIMIT = 50;

export async function getVendorWalletStats(vendorId: string) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const [balance, pendingAgg, requestedAgg, approvedAgg, paidAgg, onHoldAgg, recentPayouts, recentWithdrawals, monthBookings, yearBookings] =
    await Promise.all([
      computeVendorBalance(vendorId),
      prisma.payout.aggregate({
        where: { vendorId, status: "PENDING" },
        _sum: { amount: true },
      }),
      prisma.payout.aggregate({
        where: { vendorId, status: { in: ["REQUESTED", "UNDER_REVIEW"] } },
        _sum: { amount: true },
      }),
      prisma.payout.aggregate({
        where: { vendorId, status: "APPROVED" },
        _sum: { amount: true },
      }),
      prisma.payout.aggregate({
        where: { vendorId, status: "PAID", paidById: { not: null } },
        _sum: { amount: true },
      }),
      prisma.payout.aggregate({
        where: { vendorId, status: "ON_HOLD" },
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
          requestedAt: true,
          paidById: true,
          createdAt: true,
          booking: {
            select: {
              id: true,
              eventDate: true,
              listing: { select: { title: true } },
            },
          },
        },
      }),
      prisma.withdrawal.findMany({
        where: { vendorId },
        orderBy: { createdAt: "desc" },
        take: WITHDRAWAL_HISTORY_LIMIT,
        select: {
          id: true,
          reference: true,
          amount: true,
          status: true,
          bankName: true,
          accountNumberLast4: true,
          failureReason: true,
          processedAt: true,
          createdAt: true,
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
    ]);

  const vendorShare = vendorShareAmount;

  return {
    availableBalance: pendingAgg._sum.amount ?? 0,
    pendingEarnings: balance.escrowHeld,
    escrowBalance: balance.escrowHeld,
    pendingRelease: pendingAgg._sum.amount ?? 0,
    payoutRequested: requestedAgg._sum.amount ?? 0,
    payoutApproved: approvedAgg._sum.amount ?? 0,
    payoutPaid: paidAgg._sum.amount ?? 0,
    payoutOnHold: onHoldAgg._sum.amount ?? 0,
    releasedTotal: balance.releasedTotal,
    withdrawnAmount: balance.withdrawnTotal,
    withdrawalsInFlight: balance.inFlightTotal,
    legacyLedgerBalance: balance.availableBalance,
    minWithdrawal: MIN_WITHDRAWAL_AMOUNT,
    monthEarnings: vendorShare(monthBookings._sum.totalAmount ?? 0),
    yearEarnings: vendorShare(yearBookings._sum.totalAmount ?? 0),
    payouts: recentPayouts.map((p) => ({
      id: p.id,
      bookingId: p.booking.id,
      reference: p.reference,
      amount: p.amount,
      status: p.status,
      canRequest: p.status === "PENDING",
      processedAt: p.processedAt?.toISOString() ?? null,
      requestedAt: p.requestedAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      bookingTitle: p.booking.listing.title,
      eventDate: p.booking.eventDate.toISOString(),
    })),
    withdrawals: recentWithdrawals.map((w) => ({
      id: w.id,
      reference: w.reference,
      amount: w.amount,
      status: w.status,
      bankName: w.bankName,
      accountNumberLast4: w.accountNumberLast4,
      failureReason: w.failureReason,
      processedAt: w.processedAt?.toISOString() ?? null,
      createdAt: w.createdAt.toISOString(),
    })),
    payoutHistoryLimit: PAYOUT_HISTORY_LIMIT,
    todayStart: todayStart.toISOString(),
    todayEnd: todayEnd.toISOString(),
  };
}

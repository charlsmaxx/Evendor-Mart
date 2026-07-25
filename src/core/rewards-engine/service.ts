import { prisma } from "@/core/infrastructure/prisma";
import { getRepeatCustomerStats } from "@/core/analytics-engine/repeat-customers";
import { calcCashback, maxRedeemable } from "./utils";
import { writeAuditLog } from "@/core/audit-engine";
import { emitDomainEvent } from "@/core/events";
export { CASHBACK_RATE, MAX_REDEEM_RATIO, calcCashback, maxRedeemable } from "./utils";

export const REWARD_EXPIRY_MONTHS = 12;
export const REWARD_EXPIRY_WARNING_DAYS = 30;

export type RewardTransactionRow = {
  id: string;
  amount: number;
  type: string;
  status: string;
  description: string | null;
  expiresAt: string | null;
  createdAt: string;
  bookingId: string | null;
  bookingTitle: string | null;
};

function mapTransaction(tx: {
  id: string;
  amount: number;
  type: string;
  status: string;
  description: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  bookingId: string | null;
  booking?: { id: string; listing: { title: string } | null } | null;
}): RewardTransactionRow {
  return {
    id: tx.id,
    amount: tx.amount,
    type: tx.type,
    status: tx.status,
    description: tx.description,
    expiresAt: tx.expiresAt?.toISOString() ?? null,
    createdAt: tx.createdAt.toISOString(),
    bookingId: tx.bookingId,
    bookingTitle: tx.booking?.listing?.title ?? null,
  };
}

/** Upsert wallet (creates if missing). Returns wallet. */
export async function getOrCreateWallet(userId: string) {
  const existing = await prisma.rewardsWallet.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.rewardsWallet.create({ data: { userId } });
}

/** Call this when a booking is CONFIRMED/COMPLETED to credit cashback. */
export async function earnReward(userId: string, bookingId: string, bookingAmount: number) {
  const amount = calcCashback(bookingAmount);
  if (amount <= 0) return null;

  const wallet = await getOrCreateWallet(userId);
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + REWARD_EXPIRY_MONTHS);

  const [tx] = await prisma.$transaction([
    prisma.rewardTransaction.create({
      data: {
        userId,
        walletId: wallet.id,
        bookingId,
        amount,
        type: "EARNED",
        status: "CONFIRMED",
        expiresAt,
        description: "2% booking reward",
      },
    }),
    prisma.rewardsWallet.update({
      where: { id: wallet.id },
      data: {
        availableBalance: { increment: amount },
        totalEarned: { increment: amount },
        updatedAt: new Date(),
      },
    }),
  ]);

  await emitDomainEvent({
    type: "RewardGranted",
    payload: { userId, bookingId, points: amount },
  });

  return tx;
}

/**
 * Redeem rewards against a new booking.
 * Returns { redeemed, finalAmount } where finalAmount = bookingAmount - redeemed.
 */
export async function redeemReward(
  userId: string,
  bookingId: string,
  bookingAmount: number,
  requestedRedeem: number
): Promise<{ redeemed: number; finalAmount: number }> {
  const wallet = await getOrCreateWallet(userId);
  const cap = maxRedeemable(bookingAmount);
  const redeemed = Math.min(requestedRedeem, wallet.availableBalance, cap);

  if (redeemed <= 0) return { redeemed: 0, finalAmount: bookingAmount };

  await prisma.$transaction([
    prisma.rewardTransaction.create({
      data: {
        userId,
        walletId: wallet.id,
        bookingId,
        amount: redeemed,
        type: "REDEEMED",
        status: "CONFIRMED",
        description: "Rewards applied to booking",
      },
    }),
    prisma.rewardsWallet.update({
      where: { id: wallet.id },
      data: {
        availableBalance: { decrement: redeemed },
        totalRedeemed: { increment: redeemed },
        updatedAt: new Date(),
      },
    }),
  ]);

  return { redeemed, finalAmount: bookingAmount - redeemed };
}

/** Admin credit or debit. Amount in kobo; positive = credit, negative = debit. */
export async function adjustUserReward(
  userId: string,
  amount: number,
  reason: string,
  adminId: string
) {
  if (!Number.isInteger(amount) || amount === 0) {
    throw new Error("Amount must be a non-zero integer (kobo)");
  }
  if (reason.trim().length < 3) {
    throw new Error("Reason must be at least 3 characters");
  }

  const wallet = await getOrCreateWallet(userId);
  const absAmount = Math.abs(amount);

  if (amount < 0 && wallet.availableBalance < absAmount) {
    throw new Error("Insufficient wallet balance for debit");
  }

  const description =
    amount > 0 ? `Admin credit: ${reason.trim()}` : `Admin debit: ${reason.trim()}`;

  const tx = await prisma.$transaction(async (txClient) => {
    const created = await txClient.rewardTransaction.create({
      data: {
        userId,
        walletId: wallet.id,
        amount: absAmount,
        type: "ADJUSTMENT",
        status: "CONFIRMED",
        description,
      },
    });
    await txClient.rewardsWallet.update({
      where: { id: wallet.id },
      data: {
        availableBalance: { increment: amount },
        ...(amount > 0 ? { totalEarned: { increment: absAmount } } : {}),
        updatedAt: new Date(),
      },
    });
    await writeAuditLog(
      {
        actorId: adminId,
        action: "REWARDS_ADJUST",
        entityType: "User",
        entityId: userId,
        metadata: { amount, reason: reason.trim(), description },
      },
      txClient
    );
    return created;
  });

  await emitDomainEvent({
    type: "RewardAdjusted",
    payload: { userId, amount, reason: reason.trim() },
  });

  return tx;
}

/** Expire rewards older than REWARD_EXPIRY_MONTHS that haven't been used. */
export async function expireOldRewards(): Promise<{
  count: number;
  notifiedUsers: number;
}> {
  const now = new Date();

  const expired = await prisma.rewardTransaction.findMany({
    where: {
      type: "EARNED",
      status: "CONFIRMED",
      expiresAt: { lte: now },
    },
    select: { id: true, walletId: true, amount: true, userId: true },
  });

  const byUser = new Map<string, number>();

  for (const tx of expired) {
    await prisma.$transaction([
      prisma.rewardTransaction.update({
        where: { id: tx.id },
        data: { status: "CANCELLED" },
      }),
      prisma.rewardTransaction.create({
        data: {
          userId: tx.userId,
          walletId: tx.walletId,
          amount: tx.amount,
          type: "EXPIRED",
          status: "CONFIRMED",
          description: "Reward expired after 12 months",
        },
      }),
      prisma.rewardsWallet.update({
        where: { id: tx.walletId },
        data: {
          availableBalance: { decrement: tx.amount },
          updatedAt: new Date(),
        },
      }),
    ]);
    byUser.set(tx.userId, (byUser.get(tx.userId) ?? 0) + tx.amount);
  }

  let notifiedUsers = 0;
  for (const [userId, total] of byUser) {
    await emitDomainEvent({
      type: "RewardsExpired",
      payload: { userId, total },
    });
    notifiedUsers++;
  }

  return { count: expired.length, notifiedUsers };
}

/** Notify users whose confirmed earned rewards expire within the warning window. */
export async function notifyExpiringRewards(
  withinDays = REWARD_EXPIRY_WARNING_DAYS
): Promise<number> {
  const now = new Date();
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + withinDays);

  const expiring = await prisma.rewardTransaction.findMany({
    where: {
      type: "EARNED",
      status: "CONFIRMED",
      expiresAt: { gt: now, lte: deadline },
    },
    select: { userId: true, amount: true },
  });

  const totals = new Map<string, number>();
  for (const tx of expiring) {
    totals.set(tx.userId, (totals.get(tx.userId) ?? 0) + tx.amount);
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 25);

  let sent = 0;
  for (const [userId, total] of totals) {
    const recent = await prisma.notification.findFirst({
      where: {
        userId,
        title: "Rewards expiring soon",
        createdAt: { gte: cutoff },
      },
      select: { id: true },
    });
    if (recent) continue;

    await emitDomainEvent({
      type: "RewardsExpiringSoon",
      payload: { userId, total, withinDays },
    });
    sent++;
  }

  return sent;
}

/** Cron/maintenance: expire old rewards + send expiry warnings. */
export async function runRewardsMaintenance() {
  const expired = await expireOldRewards();
  const warned = await notifyExpiringRewards();
  return { ...expired, expiryWarningsSent: warned };
}

export async function getRewardsPlatformAnalytics() {
  const [issued, redeemed, expired, adjusted, wallets, bookings] = await Promise.all([
    prisma.rewardTransaction.aggregate({
      where: { type: "EARNED", status: "CONFIRMED" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.rewardTransaction.aggregate({
      where: { type: "REDEEMED", status: "CONFIRMED" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.rewardTransaction.aggregate({
      where: { type: "EXPIRED" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.rewardTransaction.aggregate({
      where: { type: "ADJUSTMENT", status: "CONFIRMED" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.rewardsWallet.aggregate({
      _sum: { availableBalance: true, totalEarned: true },
      _count: true,
    }),
    prisma.booking.count(),
  ]);

  const repeatStats = await getRepeatCustomerStats();

  const totalIssued = issued._sum.amount ?? 0;
  const totalRedeemed = redeemed._sum.amount ?? 0;
  const totalExpired = expired._sum.amount ?? 0;
  const repeatRate = repeatStats.repeatCustomerRate;

  const redemptionRate =
    totalIssued > 0 ? Math.round((totalRedeemed / totalIssued) * 1000) / 10 : 0;
  const breakageRate =
    totalIssued > 0 ? Math.round((totalExpired / totalIssued) * 1000) / 10 : 0;

  return {
    totalIssued,
    totalIssuedCount: issued._count,
    totalRedeemed,
    totalRedeemedCount: redeemed._count,
    totalExpired,
    totalExpiredCount: expired._count,
    totalAdjusted: adjusted._sum.amount ?? 0,
    totalAdjustedCount: adjusted._count,
    activeLiability: wallets._sum.availableBalance ?? 0,
    totalWallets: wallets._count,
    totalBookings: bookings,
    repeatCustomerRate: repeatRate,
    redemptionRate,
    breakageRate,
    revenueImpact: totalRedeemed,
  };
}

export async function getWalletTransactions(
  userId: string,
  opts?: { cursor?: string; limit?: number }
) {
  const limit = Math.min(Math.max(opts?.limit ?? 20, 1), 50);

  const rows = await prisma.rewardTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(opts?.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    include: {
      booking: {
        select: {
          id: true,
          listing: { select: { title: true } },
        },
      },
    },
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  return {
    transactions: page.map(mapTransaction),
    nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
    hasMore,
  };
}

export async function getWalletSummary(userId: string) {
  const wallet = await getOrCreateWallet(userId);
  const { transactions } = await getWalletTransactions(userId, { limit: 20 });

  return {
    availableBalance: wallet.availableBalance,
    totalEarned: wallet.totalEarned,
    totalRedeemed: wallet.totalRedeemed,
    transactions,
  };
}

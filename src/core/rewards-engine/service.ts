import { prisma } from "@/core/infrastructure/prisma";
import type { Prisma } from "@prisma/client";
import { getRepeatCustomerStats } from "@/core/analytics-engine/repeat-customers";
import { calcCashback, redeemableAmount } from "./utils";
import { writeAuditLog } from "@/core/audit-engine";
import { emitDomainEvent } from "@/core/events";
export {
  CASHBACK_RATE,
  WALLET_REDEEM_RATIO,
  calcCashback,
  redeemableAmount,
} from "./utils";

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

/** Call this when a booking is COMPLETED to credit cashback. Idempotent per booking. */
export async function earnReward(userId: string, bookingId: string, bookingAmount: number) {
  const amount = calcCashback(bookingAmount);
  if (amount <= 0) return null;

  const existing = await prisma.rewardTransaction.findFirst({
    where: { bookingId, type: "EARNED", status: "CONFIRMED" },
  });
  if (existing) return existing;

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
 * Credit 2% cashback for COMPLETED bookings that never got an EARNED ledger row
 * (e.g. earnReward failed after escrow release and was previously swallowed).
 */
export async function creditMissedCompletedBookingRewards(userId: string): Promise<number> {
  const bookings = await prisma.booking.findMany({
    where: {
      customerId: userId,
      status: "COMPLETED",
      payments: { some: { status: "SUCCESS" } },
      rewardTransactions: { none: { type: "EARNED", status: "CONFIRMED" } },
    },
    select: { id: true, totalAmount: true },
  });

  let credited = 0;
  for (const booking of bookings) {
    try {
      const tx = await earnReward(userId, booking.id, booking.totalAmount);
      if (tx) credited += tx.amount;
    } catch (error) {
      console.error(
        `[rewards] Failed to backfill reward for booking ${booking.id}:`,
        error
      );
    }
  }
  return credited;
}

/**
 * Spend rewards against a booking, inside the caller's transaction.
 *
 * The amount is derived here from the wallet row read in the same transaction — never
 * from anything the client sends — so a customer cannot ask for a bigger discount than
 * their balance and the commission ceiling allow. Running inside the booking transaction
 * means a slot conflict rolls the wallet debit back with everything else.
 *
 * Returns the amount actually redeemed.
 */
export async function redeemRewardsInTx(
  tx: Prisma.TransactionClient,
  userId: string,
  bookingId: string,
  bookingAmount: number
): Promise<number> {
  const wallet =
    (await tx.rewardsWallet.findUnique({ where: { userId } })) ??
    (await tx.rewardsWallet.create({ data: { userId } }));

  const redeemed = redeemableAmount(wallet.availableBalance, bookingAmount);
  if (redeemed <= 0) return 0;

  await tx.rewardTransaction.create({
    data: {
      userId,
      walletId: wallet.id,
      bookingId,
      amount: redeemed,
      type: "REDEEMED",
      status: "CONFIRMED",
      description: "Rewards applied to booking",
    },
  });

  await tx.rewardsWallet.update({
    where: { id: wallet.id },
    data: {
      availableBalance: { decrement: redeemed },
      totalRedeemed: { increment: redeemed },
      updatedAt: new Date(),
    },
  });

  return redeemed;
}

/**
 * Put redeemed rewards back when a booking never got paid for.
 *
 * Idempotent: the redemption is marked CANCELLED as part of the same transaction, so a
 * second call finds nothing to refund. Safe to call from the cancel route and from the
 * reconciliation sweep without coordinating between them.
 */
/** Same as {@link refundRedeemedRewards} but joins the caller's transaction. */
export async function refundRedeemedRewardsInTx(
  tx: Prisma.TransactionClient,
  bookingId: string
): Promise<number> {
  const redemptions = await tx.rewardTransaction.findMany({
    where: { bookingId, type: "REDEEMED", status: "CONFIRMED" },
    select: { id: true, userId: true, walletId: true, amount: true },
  });
  if (redemptions.length === 0) return 0;

  let refunded = 0;
  for (const redemption of redemptions) {
    await tx.rewardTransaction.update({
      where: { id: redemption.id },
      data: { status: "CANCELLED" },
    });
    await tx.rewardTransaction.create({
      data: {
        userId: redemption.userId,
        walletId: redemption.walletId,
        bookingId,
        amount: redemption.amount,
        type: "ADJUSTMENT",
        status: "CONFIRMED",
        description: "Rewards returned — booking was not paid for",
      },
    });
    await tx.rewardsWallet.update({
      where: { id: redemption.walletId },
      data: {
        availableBalance: { increment: redemption.amount },
        totalRedeemed: { decrement: redemption.amount },
        updatedAt: new Date(),
      },
    });
    refunded += redemption.amount;
  }

  return refunded;
}

export async function refundRedeemedRewards(bookingId: string): Promise<number> {
  return prisma.$transaction((tx) => refundRedeemedRewardsInTx(tx, bookingId));
}

/**
 * Sweep for rewards stranded on bookings that expired or were cancelled before payment.
 *
 * Reservations expire down several paths, including raw SQL inside another booking's
 * conflict check, so rather than hooking every one of them this reconciles from the end
 * state: a dead booking holding a live redemption.
 */
export async function reconcileAbandonedRedemptions(): Promise<{
  bookings: number;
  refunded: number;
}> {
  const stranded = await prisma.rewardTransaction.findMany({
    where: {
      type: "REDEEMED",
      status: "CONFIRMED",
      booking: {
        status: { in: ["EXPIRED", "CANCELLED"] },
        payments: { none: { status: "SUCCESS" } },
      },
    },
    select: { bookingId: true },
    distinct: ["bookingId"],
  });

  let refunded = 0;
  let bookings = 0;
  for (const { bookingId } of stranded) {
    if (!bookingId) continue;
    const amount = await refundRedeemedRewards(bookingId);
    if (amount > 0) {
      refunded += amount;
      bookings++;
    }
  }

  return { bookings, refunded };
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

/** Cron/maintenance: expire old rewards, warn before expiry, return stranded redemptions. */
export async function runRewardsMaintenance() {
  const expired = await expireOldRewards();
  const warned = await notifyExpiringRewards();
  const reconciled = await reconcileAbandonedRedemptions();
  return {
    ...expired,
    expiryWarningsSent: warned,
    redemptionsReturned: reconciled.bookings,
    redemptionAmountReturned: reconciled.refunded,
  };
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
  // Heal missed credits from past approvals before reading the balance.
  await creditMissedCompletedBookingRewards(userId);

  const wallet = await getOrCreateWallet(userId);
  const [{ transactions }, pendingBookings] = await Promise.all([
    getWalletTransactions(userId, { limit: 20 }),
    prisma.booking.findMany({
      where: {
        customerId: userId,
        status: { in: ["CONFIRMED", "IN_PROGRESS"] },
        payments: { some: { status: "SUCCESS" } },
        rewardTransactions: { none: { type: "EARNED", status: "CONFIRMED" } },
      },
      select: { totalAmount: true },
    }),
  ]);

  const pendingBalance = pendingBookings.reduce(
    (sum, booking) => sum + calcCashback(booking.totalAmount),
    0
  );

  return {
    availableBalance: wallet.availableBalance,
    pendingBalance,
    totalEarned: wallet.totalEarned,
    totalRedeemed: wallet.totalRedeemed,
    transactions,
  };
}

import "server-only";

import { prisma } from "@/core/infrastructure/prisma";
import { computePlatformHealthScore } from "@/core/analytics-engine/admin-dashboard";
import { getRepeatCustomerStats } from "@/core/analytics-engine/repeat-customers";
import {
  canViewEscrowTotals,
  canViewPlatformRevenue,
} from "@/core/authorization-engine/permissions";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

/** Shared trust signals — used by dashboard, trust panel, alerts. */
export async function getPlatformTrustSignals() {
  const [openDisputes, pendingVerifications, failedPayments] = await Promise.all([
    prisma.dispute.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
    prisma.verificationRequest.count({ where: { status: "PENDING" } }),
    prisma.payment.count({ where: { status: "FAILED" } }),
  ]);
  return { openDisputes, pendingVerifications, failedPayments };
}

export async function getRecentAuditLogs(take = 25) {
  return prisma.auditLog.findMany({
    take,
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { fullName: true, email: true } } },
  });
}

export async function getHighCancellationVendors(take = 10) {
  return prisma.vendorProfile.findMany({
    where: { cancellationRate: { gte: 30 } },
    select: {
      id: true,
      businessName: true,
      cancellationRate: true,
      disputeRate: true,
      verified: true,
    },
    orderBy: { cancellationRate: "desc" },
    take,
  });
}

export async function getMonthlyRevenueTrend(monthCount = 6) {
  const now = new Date();
  const months = Array.from({ length: monthCount }, (_, i) => {
    const d = subMonths(now, monthCount - 1 - i);
    return {
      label: d.toLocaleString("en", { month: "short" }),
      start: startOfMonth(d),
      end: endOfMonth(d),
    };
  });

  return Promise.all(
    months.map(async (m) => {
      const agg = await prisma.booking.aggregate({
        where: {
          status: { in: ["CONFIRMED", "COMPLETED"] },
          createdAt: { gte: m.start, lte: m.end },
        },
        _sum: { totalAmount: true },
        _count: true,
      });
      return {
        label: m.label,
        revenue: agg._sum.totalAmount ?? 0,
        bookings: agg._count,
      };
    })
  );
}

/** Full admin dashboard payload. */
export async function loadAdminDashboardData() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const trust = await getPlatformTrustSignals();

  const [
    totalRevenue,
    escrowHeld,
    completedBookings,
    activeBookings,
    activeUsers,
    totalBookings,
    cancelledBookings,
    disputedBookings,
    verifiedVendors,
    totalVendors,
    avgRating,
    monthRevenue,
    lastMonthRevenue,
    recentBookings,
    recentAuditLogs,
    pendingPayouts,
    releasedPayouts,
    rewardLiability,
    revenueTrend,
  ] = await Promise.all([
    prisma.booking.aggregate({
      where: { status: { in: ["CONFIRMED", "COMPLETED", "IN_PROGRESS"] } },
      _sum: { totalAmount: true },
    }),
    prisma.payment.aggregate({
      where: { escrowStatus: "HELD", status: "SUCCESS" },
      _sum: { amount: true },
    }),
    prisma.booking.count({ where: { status: "COMPLETED" } }),
    prisma.booking.count({
      where: { status: { in: ["CONFIRMED", "IN_PROGRESS", "RESERVED", "PENDING_PAYMENT"] } },
    }),
    prisma.user.count(),
    prisma.booking.count(),
    prisma.booking.count({ where: { status: { in: ["CANCELLED", "DECLINED", "EXPIRED"] } } }),
    prisma.dispute.count(),
    prisma.vendorProfile.count({ where: { verified: true } }),
    prisma.vendorProfile.count(),
    prisma.listing.aggregate({ _avg: { ratingAvg: true } }),
    prisma.booking.aggregate({
      where: {
        status: { in: ["CONFIRMED", "COMPLETED"] },
        createdAt: { gte: monthStart, lte: monthEnd },
      },
      _sum: { totalAmount: true },
    }),
    prisma.booking.aggregate({
      where: {
        status: { in: ["CONFIRMED", "COMPLETED"] },
        createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
      },
      _sum: { totalAmount: true },
    }),
    prisma.booking.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { fullName: true } },
        listing: { select: { title: true } },
        vendor: { select: { businessName: true } },
      },
    }),
    getRecentAuditLogs(25),
    prisma.payout.aggregate({
      where: { status: "PENDING" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payout.aggregate({
      where: { status: { in: ["PAID", "PROCESSING"] } },
      _sum: { amount: true },
    }),
    prisma.rewardsWallet.aggregate({ _sum: { availableBalance: true } }),
    getMonthlyRevenueTrend(6),
  ]);

  const thisMonth = monthRevenue._sum.totalAmount ?? 0;
  const lastMonth = lastMonthRevenue._sum.totalAmount ?? 0;
  const revenueGrowth =
    lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null;

  const bookingSuccessRate =
    totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 100;
  const disputeRate =
    totalBookings > 0 ? Math.round((disputedBookings / totalBookings) * 100) : 0;
  const verificationRate =
    totalVendors > 0 ? Math.round((verifiedVendors / totalVendors) * 100) : 0;

  const healthScore = computePlatformHealthScore({
    bookingSuccessRate,
    disputeRate,
    verificationRate,
    revenueGrowth,
    avgRating: avgRating._avg.ratingAvg ?? 0,
  });

  const activity = recentAuditLogs.map((log) => ({
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    actorName: log.actor?.fullName ?? log.actor?.email ?? "System",
    createdAt: log.createdAt.toISOString(),
  }));

  return {
    kpis: {
      totalRevenue: totalRevenue._sum.totalAmount ?? 0,
      escrowHeld: escrowHeld._sum.amount ?? 0,
      completedBookings,
      activeBookings,
      pendingVerifications: trust.pendingVerifications,
      openDisputes: trust.openDisputes,
      activeUsers,
      healthScore,
      pendingPayoutAmount: pendingPayouts._sum.amount ?? 0,
      pendingPayoutCount: pendingPayouts._count,
      releasedPayouts: releasedPayouts._sum.amount ?? 0,
      failedPayments: trust.failedPayments,
      rewardLiability: rewardLiability._sum.availableBalance ?? 0,
      revenueGrowth,
    },
    health: {
      score: healthScore,
      bookingSuccessRate,
      disputeRate,
      verificationRate,
      revenueGrowth,
      avgRating: avgRating._avg.ratingAvg ?? 0,
    },
    revenueTrend,
    activity,
    recentBookings: recentBookings.map((b) => ({
      id: b.id,
      status: b.status,
      totalAmount: b.totalAmount,
      eventDate: b.eventDate.toISOString(),
      customerName: b.customer?.fullName ?? null,
      listingTitle: b.listing.title,
      vendorName: b.vendor.businessName,
      createdAt: b.createdAt.toISOString(),
    })),
    alerts: [
      ...(trust.openDisputes > 0
        ? [{
            type: "dispute",
            severity: "high" as const,
            message: `${trust.openDisputes} open dispute(s) require attention`,
          }]
        : []),
      ...(trust.pendingVerifications > 0
        ? [{
            type: "verification",
            severity: "medium" as const,
            message: `${trust.pendingVerifications} verification(s) pending review`,
          }]
        : []),
      ...(trust.failedPayments > 0
        ? [{
            type: "payment",
            severity: "high" as const,
            message: `${trust.failedPayments} failed payment(s) detected`,
          }]
        : []),
    ],
  };
}

type AdminDashboardPayload = Awaited<ReturnType<typeof loadAdminDashboardData>>;

type AdminUserLike = {
  role: string;
  adminRole?: import("@prisma/client").AdminRole | null;
  email?: string;
};

/** Strip revenue / escrow totals for roles without analytics or escrow access. */
export function sanitizeAdminDashboardForUser(
  data: AdminDashboardPayload,
  user: AdminUserLike
): AdminDashboardPayload & {
  capabilities: { revenue: boolean; escrow: boolean };
} {
  const showRevenue = canViewPlatformRevenue(user);
  const showEscrow = canViewEscrowTotals(user);

  if (showRevenue && showEscrow) {
    return { ...data, capabilities: { revenue: true, escrow: true } };
  }

  const { totalRevenue: _tr, escrowHeld: _eh, revenueGrowth: _rg, ...restKpis } = data.kpis;

  return {
    ...data,
    kpis: {
      ...restKpis,
      totalRevenue: showRevenue ? data.kpis.totalRevenue : 0,
      revenueGrowth: showRevenue ? data.kpis.revenueGrowth : null,
      escrowHeld: showEscrow ? data.kpis.escrowHeld : 0,
    },
    revenueTrend: showRevenue
      ? data.revenueTrend
      : data.revenueTrend.map(({ label, bookings }) => ({ label, revenue: 0, bookings })),
    health: showRevenue
      ? data.health
      : { ...data.health, revenueGrowth: null },
    capabilities: { revenue: showRevenue, escrow: showEscrow },
  };
}

/** Trust & Safety panel — reuses shared signals. */
export async function loadAdminTrustPanelData() {
  const [trust, recentAuditLogs, highCancellationVendors] = await Promise.all([
    getPlatformTrustSignals(),
    getRecentAuditLogs(20),
    getHighCancellationVendors(10),
  ]);

  return {
    ...trust,
    recentAuditLogs,
    highCancellationVendors,
  };
}

/** Analytics page — extended charts. */
export async function loadAdminAnalyticsData() {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(now, 5 - i);
    return {
      label: d.toLocaleString("en", { month: "short" }),
      start: startOfMonth(d),
      end: endOfMonth(d),
    };
  });

  const revenueTrend = await getMonthlyRevenueTrend(6);

  const [bookingTrend, cityPerformance, topVendors, disputeTrend, verificationStats] =
    await Promise.all([
      Promise.all(
        months.map(async (m) => {
          const count = await prisma.booking.count({
            where: { createdAt: { gte: m.start, lte: m.end } },
          });
          return { label: m.label, value: count };
        })
      ),
      prisma.listing.groupBy({
        by: ["city"],
        where: { status: "PUBLISHED" },
        _count: true,
        orderBy: { _count: { city: "desc" } },
        take: 8,
      }),
      prisma.vendorProfile.findMany({
        select: {
          id: true,
          businessName: true,
          ratingAvg: true,
          reviewCount: true,
          verified: true,
          _count: { select: { bookings: true } },
        },
        orderBy: { ratingAvg: "desc" },
        take: 8,
      }),
      Promise.all(
        months.map(async (m) => {
          const count = await prisma.dispute.count({
            where: { createdAt: { gte: m.start, lte: m.end } },
          });
          return { label: m.label, value: count };
        })
      ),
      Promise.all([
        prisma.verificationRequest.count({ where: { status: "PENDING" } }),
        prisma.verificationRequest.count({ where: { status: "VERIFIED" } }),
        prisma.verificationRequest.count({ where: { status: "REJECTED" } }),
        prisma.vendorProfile.count({ where: { verified: true } }),
      ]),
    ]);

  const repeatCustomers = await getRepeatCustomerStats();

  return {
    revenueTrend: revenueTrend.map((m) => ({ label: m.label, value: m.revenue })),
    bookingTrend,
    cityPerformance: cityPerformance.map((c) => ({ city: c.city, listings: c._count })),
    topVendors,
    disputeTrend,
    verification: {
      pending: verificationStats[0],
      approved: verificationStats[1],
      rejected: verificationStats[2],
      verifiedVendors: verificationStats[3],
    },
    repeatCustomerRate: repeatCustomers.repeatCustomerRate,
  };
}

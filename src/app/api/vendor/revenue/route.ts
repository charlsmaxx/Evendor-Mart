import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { getVendorWalletStats } from "@/lib/vendor-wallet";
import { startOfMonth, endOfMonth, subMonths, subDays, format } from "date-fns";

export async function GET() {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } });
  if (!vendor) return jsonError("Vendor not found", 404);

  const now = new Date();
  const wallet = await getVendorWalletStats(vendor.id);

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(now, 5 - i);
    return { label: format(d, "MMM"), start: startOfMonth(d), end: endOfMonth(d) };
  });

  const weeks = Array.from({ length: 4 }, (_, i) => {
    const end = subDays(now, i * 7);
    const start = subDays(end, 6);
    return { label: `W${4 - i}`, start, end };
  });

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = subDays(now, 13 - i);
    const start = new Date(d.toDateString());
    const end = new Date(start.getTime() + 86400000 - 1);
    return { label: format(d, "EEE"), date: format(d, "yyyy-MM-dd"), start, end };
  });

  const [monthlyRevenue, weeklyRevenue, dailyRevenue, totalRevenue, completedBookings, cancelledBookings, rewardSubsidy, bookingGrowth] =
    await Promise.all([
      Promise.all(
        months.map(async (m) => {
          const agg = await prisma.booking.aggregate({
            where: {
              vendorId: vendor.id,
              status: { in: ["CONFIRMED", "COMPLETED"] },
              createdAt: { gte: m.start, lte: m.end },
            },
            _sum: { totalAmount: true },
          });
          return { label: m.label, revenue: agg._sum.totalAmount ?? 0 };
        })
      ),
      Promise.all(
        weeks.map(async (w) => {
          const agg = await prisma.booking.aggregate({
            where: {
              vendorId: vendor.id,
              status: { in: ["CONFIRMED", "COMPLETED"] },
              createdAt: { gte: w.start, lte: w.end },
            },
            _sum: { totalAmount: true },
          });
          return { label: w.label, revenue: agg._sum.totalAmount ?? 0 };
        })
      ),
      Promise.all(
        days.map(async (d) => {
          const agg = await prisma.booking.aggregate({
            where: {
              vendorId: vendor.id,
              status: { in: ["CONFIRMED", "COMPLETED"] },
              createdAt: { gte: d.start, lte: d.end },
            },
            _sum: { totalAmount: true },
          });
          return { label: d.label, date: d.date, revenue: agg._sum.totalAmount ?? 0 };
        })
      ),
      prisma.booking.aggregate({
        where: { vendorId: vendor.id, status: { in: ["CONFIRMED", "COMPLETED"] } },
        _sum: { totalAmount: true },
      }),
      prisma.booking.count({ where: { vendorId: vendor.id, status: "COMPLETED" } }),
      prisma.booking.count({
        where: { vendorId: vendor.id, status: { in: ["CANCELLED", "DECLINED"] } },
      }),
      prisma.rewardTransaction.aggregate({
        where: {
          type: "REDEEMED",
          status: "CONFIRMED",
          booking: { vendorId: vendor.id },
        },
        _sum: { amount: true },
      }),
      prisma.booking.groupBy({
        by: ["status"],
        where: { vendorId: vendor.id },
        _count: true,
      }),
    ]);

  const prevMonthBookings = await prisma.booking.count({
    where: {
      vendorId: vendor.id,
      createdAt: { gte: subMonths(startOfMonth(now), 1), lte: endOfMonth(subMonths(now, 1)) },
    },
  });
  const thisMonthBookings = await prisma.booking.count({
    where: {
      vendorId: vendor.id,
      createdAt: { gte: startOfMonth(now), lte: endOfMonth(now) },
    },
  });
  const bookingGrowthPct =
    prevMonthBookings > 0
      ? Math.round(((thisMonthBookings - prevMonthBookings) / prevMonthBookings) * 100)
      : null;

  const [marketplaceRevenue, manualRevenue] = await Promise.all([
    prisma.booking.aggregate({
      where: { vendorId: vendor.id, status: { in: ["CONFIRMED", "COMPLETED"] }, source: "MARKETPLACE" },
      _sum: { totalAmount: true },
    }),
    prisma.booking.aggregate({
      where: { vendorId: vendor.id, status: { in: ["CONFIRMED", "COMPLETED"] }, source: "MANUAL" },
      _sum: { totalAmount: true },
    }),
  ]);

  return jsonOk({
    monthlyRevenue,
    weeklyRevenue,
    dailyRevenue,
    totalRevenue: totalRevenue._sum.totalAmount ?? 0,
    marketplaceRevenue: marketplaceRevenue._sum.totalAmount ?? 0,
    manualRevenue: manualRevenue._sum.totalAmount ?? 0,
    availableBalance: wallet.availableBalance,
    pendingEarnings: wallet.pendingEarnings,
    escrowBalance: wallet.escrowBalance,
    pendingRelease: wallet.pendingRelease,
    withdrawnAmount: wallet.withdrawnAmount,
    monthEarnings: wallet.monthEarnings,
    yearEarnings: wallet.yearEarnings,
    pendingPayouts: wallet.pendingRelease,
    completedBookings,
    cancelledBookings,
    rewardSubsidy: rewardSubsidy._sum.amount ?? 0,
    bookingGrowthPct,
    conversionRate:
      bookingGrowth.length > 0
        ? Math.round(
            ((bookingGrowth.find((b) => b.status === "COMPLETED")?._count ?? 0) /
              bookingGrowth.reduce((s, b) => s + b._count, 0)) *
              100
          )
        : 0,
    payouts: wallet.payouts,
  });
}

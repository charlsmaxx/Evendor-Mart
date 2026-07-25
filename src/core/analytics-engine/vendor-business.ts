import "server-only";

import { prisma } from "@/core/infrastructure/prisma";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

import type { BookingStatus } from "@prisma/client";

/** Premium vendor analytics — marketplace vs manual split. */
export async function loadVendorBusinessAnalytics(vendorId: string) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const completedStatuses: BookingStatus[] = ["CONFIRMED", "COMPLETED"];

  const completedWhere = {
    vendorId,
    status: { in: completedStatuses },
  };

  const [
    marketplaceTotal,
    manualTotal,
    marketplaceMonth,
    manualMonth,
    totalCustomers,
    repeatCustomers,
    bookingsBySource,
    monthlyTrend,
    topListings,
  ] = await Promise.all([
    prisma.booking.aggregate({
      where: { ...completedWhere, source: "MARKETPLACE" },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.booking.aggregate({
      where: { ...completedWhere, source: "MANUAL" },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.booking.aggregate({
      where: {
        ...completedWhere,
        source: "MARKETPLACE",
        createdAt: { gte: monthStart, lte: monthEnd },
      },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.booking.aggregate({
      where: {
        ...completedWhere,
        source: "MANUAL",
        createdAt: { gte: monthStart, lte: monthEnd },
      },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.businessCustomer.count({ where: { vendorId } }),
    prisma.businessCustomer.count({ where: { vendorId, totalSpend: { gt: 0 } } }),
    prisma.booking.groupBy({
      by: ["source"],
      where: { vendorId, status: { notIn: ["CANCELLED", "DECLINED", "EXPIRED"] } },
      _count: true,
    }),
    Promise.all(
      Array.from({ length: 6 }, async (_, i) => {
        const d = subMonths(now, 5 - i);
        const start = startOfMonth(d);
        const end = endOfMonth(d);
        const [mp, mn] = await Promise.all([
          prisma.booking.aggregate({
            where: {
              vendorId,
              source: "MARKETPLACE",
              status: { in: ["CONFIRMED", "COMPLETED"] },
              createdAt: { gte: start, lte: end },
            },
            _sum: { totalAmount: true },
            _count: true,
          }),
          prisma.booking.aggregate({
            where: {
              vendorId,
              source: "MANUAL",
              status: { in: ["CONFIRMED", "COMPLETED"] },
              createdAt: { gte: start, lte: end },
            },
            _sum: { totalAmount: true },
            _count: true,
          }),
        ]);
        return {
          label: d.toLocaleString("en", { month: "short" }),
          marketplaceRevenue: mp._sum.totalAmount ?? 0,
          manualRevenue: mn._sum.totalAmount ?? 0,
          marketplaceBookings: mp._count,
          manualBookings: mn._count,
        };
      })
    ),
    prisma.booking.groupBy({
      by: ["listingId"],
      where: completedWhere,
      _sum: { totalAmount: true },
      _count: true,
      orderBy: { _sum: { totalAmount: "desc" } },
      take: 5,
    }),
  ]);

  const listingIds = topListings.map((t) => t.listingId);
  const listings = await prisma.listing.findMany({
    where: { id: { in: listingIds } },
    select: { id: true, title: true },
  });
  const listingMap = new Map(listings.map((l) => [l.id, l.title]));

  const totalBookings = bookingsBySource.reduce((s, b) => s + b._count, 0);
  const marketplaceBookings =
    bookingsBySource.find((b) => b.source === "MARKETPLACE")?._count ?? 0;

  return {
    revenue: {
      marketplaceTotal: marketplaceTotal._sum.totalAmount ?? 0,
      manualTotal: manualTotal._sum.totalAmount ?? 0,
      marketplaceMonth: marketplaceMonth._sum.totalAmount ?? 0,
      manualMonth: manualMonth._sum.totalAmount ?? 0,
    },
    bookings: {
      marketplaceCount: marketplaceTotal._count,
      manualCount: manualTotal._count,
      bySource: bookingsBySource.map((b) => ({ source: b.source, count: b._count })),
    },
    customers: {
      total: totalCustomers,
      repeatRate:
        totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0,
    },
    conversionRate:
      totalBookings > 0 ? Math.round((marketplaceBookings / totalBookings) * 100) : 0,
    monthlyTrend,
    topServices: topListings.map((t) => ({
      listingId: t.listingId,
      title: listingMap.get(t.listingId) ?? "Listing",
      revenue: t._sum.totalAmount ?? 0,
      bookings: t._count,
    })),
  };
}

/** CSV export rows for bookings / customers / revenue. */
export async function exportVendorBookingsCsv(vendorId: string) {
  const bookings = await prisma.booking.findMany({
    where: { vendorId },
    include: {
      listing: { select: { title: true } },
      customer: { select: { fullName: true, email: true, phone: true } },
      businessCustomer: { select: { fullName: true, phone: true, email: true } },
    },
    orderBy: { eventDate: "desc" },
  });

  const header =
    "id,source,status,eventDate,listing,customer,phone,email,totalAmount,depositReceived,outstandingBalance\n";
  const rows = bookings.map((b) => {
    const name =
      b.customer?.fullName ?? b.businessCustomer?.fullName ?? "";
    const phone = b.customer?.phone ?? b.businessCustomer?.phone ?? "";
    const email = b.customer?.email ?? b.businessCustomer?.email ?? "";
    return [
      b.id,
      b.source,
      b.status,
      b.eventDate.toISOString(),
      `"${b.listing.title.replace(/"/g, '""')}"`,
      `"${name.replace(/"/g, '""')}"`,
      phone,
      email,
      b.totalAmount,
      b.depositReceived ?? "",
      b.outstandingBalance ?? "",
    ].join(",");
  });
  return header + rows.join("\n");
}

export async function exportVendorCustomersCsv(vendorId: string) {
  const customers = await prisma.businessCustomer.findMany({
    where: { vendorId },
    orderBy: { totalSpend: "desc" },
  });
  const header = "id,fullName,phone,email,totalSpend,lastBookingAt\n";
  const rows = customers.map((c) =>
    [
      c.id,
      `"${c.fullName.replace(/"/g, '""')}"`,
      c.phone,
      c.email ?? "",
      c.totalSpend,
      c.lastBookingAt?.toISOString() ?? "",
    ].join(",")
  );
  return header + rows.join("\n");
}

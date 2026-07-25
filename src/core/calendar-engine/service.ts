import { prisma } from "@/core/infrastructure/prisma";
import { startOfMonth, endOfMonth } from "date-fns";

export type CalendarMonthQuery = {
  vendorId: string;
  year: number;
  /** 1-based month (January = 1) */
  month: number;
  listingId?: string;
};

/** Single calendar engine for vendor / venue / admin calendar views. */
export async function loadCalendarMonth(query: CalendarMonthQuery) {
  const from = startOfMonth(new Date(query.year, query.month - 1, 1));
  const to = endOfMonth(new Date(query.year, query.month - 1, 1));

  const [bookings, blockedDates] = await Promise.all([
    prisma.booking.findMany({
      where: {
        vendorId: query.vendorId,
        ...(query.listingId ? { listingId: query.listingId } : {}),
        eventDate: { gte: from, lte: to },
        status: { notIn: ["CANCELLED", "EXPIRED", "DECLINED"] },
      },
      select: {
        id: true,
        eventDate: true,
        startTime: true,
        endTime: true,
        status: true,
        eventType: true,
        guestCount: true,
        totalAmount: true,
        source: true,
        reservationExpiresAt: true,
        customer: { select: { fullName: true, avatarUrl: true } },
        businessCustomer: { select: { fullName: true } },
        listing: { select: { title: true } },
      },
      orderBy: { eventDate: "asc" },
    }),
    prisma.blockedDate.findMany({
      where: {
        vendorId: query.vendorId,
        date: { gte: from, lte: to },
      },
    }),
  ]);

  return { bookings, blockedDates, from, to };
}

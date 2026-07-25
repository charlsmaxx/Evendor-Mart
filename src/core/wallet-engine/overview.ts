import { prisma } from "@/core/infrastructure/prisma";
import { startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from "date-fns";
import type { Prisma } from "@prisma/client";

import { vendorShareAmount } from "@/core/shared/config";
import { resolveBookingCustomerName } from "@/core/crm-engine";

type VendorOverviewRow = {
  upcoming_bookings: number;
  pending_requests: number;
  confirmed_bookings: number;
  month_revenue: number;
  last_month_revenue: number;
  pending_quotes: number;
  unread_messages: number;
  open_disputes: number;
  unread_notifications: number;
  pending_earnings: number;
  available_balance: number;
};

type VendorForOverview = {
  id: string;
  verified: boolean;
  verificationStatus: string | null;
  subscriptionTier: string;
  ratingAvg: number | null;
  reviewCount: number | null;
  completionRate: number | null;
  responseRate: number | null;
  verificationRequest: { status: string } | null;
};

const recentBookingInclude = {
  customer: { select: { fullName: true, avatarUrl: true } },
  businessCustomer: { select: { fullName: true } },
  listing: { select: { title: true } },
  payments: { select: { status: true, escrowStatus: true } },
} satisfies Prisma.BookingInclude;

/** One round-trip for dashboard counters + wallet totals (avoids 10+ separate Prisma calls). */
async function loadVendorOverviewCounts(
  vendorId: string,
  userId: string,
  now: Date
): Promise<VendorOverviewRow> {
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const rows = await prisma.$queryRaw<VendorOverviewRow[]>`
    SELECT
      (SELECT COUNT(*)::int FROM "Booking"
        WHERE "vendorId" = ${vendorId}
          AND "eventDate" >= ${now}
          AND status IN ('CONFIRMED', 'RESERVED', 'PENDING_PAYMENT')
      ) AS upcoming_bookings,
      (SELECT COUNT(*)::int FROM "Booking"
        WHERE "vendorId" = ${vendorId}
          AND status IN ('RESERVED', 'PENDING_PAYMENT')
      ) AS pending_requests,
      (SELECT COUNT(*)::int FROM "Booking"
        WHERE "vendorId" = ${vendorId} AND status = 'CONFIRMED'
      ) AS confirmed_bookings,
      (SELECT COALESCE(SUM("totalAmount"), 0)::int FROM "Booking"
        WHERE "vendorId" = ${vendorId}
          AND status IN ('CONFIRMED', 'COMPLETED')
          AND "createdAt" >= ${monthStart} AND "createdAt" <= ${monthEnd}
      ) AS month_revenue,
      (SELECT COALESCE(SUM("totalAmount"), 0)::int FROM "Booking"
        WHERE "vendorId" = ${vendorId}
          AND status IN ('CONFIRMED', 'COMPLETED')
          AND "createdAt" >= ${lastMonthStart} AND "createdAt" <= ${lastMonthEnd}
      ) AS last_month_revenue,
      (SELECT COUNT(*)::int FROM "QuoteRequest"
        WHERE "vendorId" = ${vendorId} AND status = 'PENDING'
      ) AS pending_quotes,
      (SELECT COUNT(*)::int FROM "Message" m
        INNER JOIN "Conversation" c ON c.id = m."conversationId"
        WHERE m."readAt" IS NULL
          AND m."senderId" <> ${userId}
          AND c."vendorId" = ${vendorId}
      ) AS unread_messages,
      (SELECT COUNT(*)::int FROM "Dispute" d
        INNER JOIN "Booking" b ON b.id = d."bookingId"
        WHERE d.status = 'OPEN' AND b."vendorId" = ${vendorId}
      ) AS open_disputes,
      (SELECT COUNT(*)::int FROM "Notification"
        WHERE "userId" = ${userId} AND read = false
      ) AS unread_notifications,
      (SELECT COALESCE(SUM(COALESCE(p."heldAmount", p.amount)), 0)::int FROM "Payment" p
        INNER JOIN "Booking" b ON b.id = p."bookingId"
        WHERE p."escrowStatus" = 'HELD'
          AND b."vendorId" = ${vendorId}
          AND b.status IN ('CONFIRMED', 'IN_PROGRESS')
      ) AS pending_earnings,
      (SELECT COALESCE(SUM(amount), 0)::int FROM "Payout"
        WHERE "vendorId" = ${vendorId} AND status = 'PAID'
      ) AS available_balance
  `;

  return rows[0] ?? {
    upcoming_bookings: 0,
    pending_requests: 0,
    confirmed_bookings: 0,
    month_revenue: 0,
    last_month_revenue: 0,
    pending_quotes: 0,
    unread_messages: 0,
    open_disputes: 0,
    unread_notifications: 0,
    pending_earnings: 0,
    available_balance: 0,
  };
}

export async function loadVendorOverviewData(vendor: VendorForOverview, userId: string) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const vendorShare = vendorShareAmount;

  const [counts, recentBookings, todaysJobs, upcomingEvents, recentReviews] =
    await Promise.all([
      loadVendorOverviewCounts(vendor.id, userId, now),
      prisma.booking.findMany({
        where: { vendorId: vendor.id },
        include: recentBookingInclude,
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.booking.findMany({
        where: {
          vendorId: vendor.id,
          eventDate: { gte: todayStart, lte: todayEnd },
          status: { notIn: ["CANCELLED", "DECLINED", "EXPIRED"] },
        },
        include: {
          customer: { select: { fullName: true } },
          businessCustomer: { select: { fullName: true } },
          listing: { select: { title: true } },
        },
        orderBy: { startTime: "asc" },
      }),
      prisma.booking.findMany({
        where: {
          vendorId: vendor.id,
          eventDate: { gte: now },
          status: { in: ["CONFIRMED", "IN_PROGRESS", "RESERVED"] },
        },
        include: {
          customer: { select: { fullName: true } },
          businessCustomer: { select: { fullName: true } },
          listing: { select: { title: true } },
        },
        orderBy: { eventDate: "asc" },
        take: 5,
      }),
      prisma.review.findMany({
        where: { listing: { vendorId: vendor.id } },
        include: {
          user: { select: { fullName: true } },
          listing: { select: { title: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
    ]);

  const thisMonth = counts.month_revenue;
  const lastMonth = counts.last_month_revenue;
  const revenueGrowth =
    lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null;

  const verificationStatus =
    vendor.verificationRequest?.status ?? vendor.verificationStatus ?? "UNVERIFIED";

  return {
    availableBalance: counts.available_balance,
    pendingEarnings: counts.pending_earnings,
    escrowBalance: counts.pending_earnings,
    monthEarnings: vendorShare(thisMonth),
    subscriptionTier: vendor.subscriptionTier,
    isPremium: vendor.subscriptionTier === "PREMIUM",
    verificationStatus,
    verified: vendor.verified,
    upcomingBookings: counts.upcoming_bookings,
    pendingRequests: counts.pending_requests,
    confirmedBookings: counts.confirmed_bookings,
    monthRevenue: thisMonth,
    revenueGrowth,
    ratingAvg: vendor.ratingAvg ?? 0,
    reviewCount: vendor.reviewCount ?? 0,
    completionRate: vendor.completionRate,
    responseRate: vendor.responseRate,
    pendingQuotes: counts.pending_quotes,
    unreadMessages: counts.unread_messages,
    unreadNotifications: counts.unread_notifications,
    openDisputes: counts.open_disputes,
    todaysJobs: todaysJobs.map((b) => ({
      id: b.id,
      customerName: resolveBookingCustomerName(b),
      listingTitle: b.listing.title,
      eventDate: b.eventDate.toISOString(),
      startTime: b.startTime?.toISOString(),
      status: b.status,
      totalAmount: b.totalAmount,
      source: b.source,
    })),
    upcomingEvents: upcomingEvents.map((b) => ({
      id: b.id,
      customerName: resolveBookingCustomerName(b),
      listingTitle: b.listing.title,
      eventDate: b.eventDate.toISOString(),
      status: b.status,
      source: b.source,
    })),
    recentReviews: recentReviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      customerName: r.user.fullName,
      listingTitle: r.listing.title,
      createdAt: r.createdAt.toISOString(),
    })),
    recentBookings: recentBookings.map((b) => ({
      id: b.id,
      customerName: resolveBookingCustomerName(b),
      listingTitle: b.listing.title,
      eventDate: b.eventDate.toISOString(),
      totalAmount: b.totalAmount,
      status: b.status,
      eventType: b.eventType,
      guestCount: b.guestCount,
      source: b.source,
    })),
  };
}

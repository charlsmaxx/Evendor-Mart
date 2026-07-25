import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { createBookingSchema } from "@/lib/validations/booking";
import { reserveSlot, BookingConflictError } from "@/lib/booking-engine";
import { BOOKING_DEPOSIT_PERCENT } from "@/core/shared/config";
import { emitDomainEvent } from "@/core/events";
import { buildPaginationMeta, paginationQuerySchema } from "@/lib/pagination";
import { apiLimiter, checkRateLimit } from "@/lib/rate-limit";
import {
  buildVendorBookingFilterWhere,
  countVendorBookingsByFilter,
  VENDOR_BOOKING_FILTERS,
} from "@/lib/booking-list-filters";

const DEPOSIT_PERCENT = BOOKING_DEPOSIT_PERCENT;

const vendorBookingListSelect = {
  id: true,
  eventDate: true,
  startTime: true,
  endTime: true,
  eventType: true,
  guestCount: true,
  totalAmount: true,
  depositAmount: true,
  status: true,
  reservationExpiresAt: true,
  notes: true,
  createdAt: true,
  listing: { select: { title: true, slug: true } },
  customer: { select: { fullName: true, email: true, phone: true, avatarUrl: true } },
  businessCustomer: { select: { fullName: true, phone: true, email: true } },
  payments: {
    select: { status: true, escrowStatus: true },
    orderBy: { createdAt: "desc" as const },
    take: 1,
  },
  dispute: { select: { id: true, status: true } },
} satisfies Prisma.BookingSelect;

const customerBookingListSelect = {
  id: true,
  eventDate: true,
  status: true,
  depositAmount: true,
  totalAmount: true,
  createdAt: true,
  listing: { select: { title: true, slug: true } },
  vendor: { select: { businessName: true, slug: true } },
  payments: {
    select: { status: true },
    orderBy: { createdAt: "desc" as const },
    take: 1,
  },
} satisfies Prisma.BookingSelect;

const vendorBookingsQuerySchema = paginationQuerySchema.extend({
  filter: z.enum(VENDOR_BOOKING_FILTERS).default("all"),
});

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const rate = await checkRateLimit(apiLimiter, `bookings:${user.id}`);
  if (!rate.success) return jsonError("Rate limit exceeded", 429);

  const parsed = createBookingSchema.safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const listing = await prisma.listing.findUnique({
    where: { id: parsed.data.listingId },
    include: { vendor: true },
  });
  if (!listing || listing.status !== "PUBLISHED") {
    return jsonError("Listing not available", 404);
  }

  const totalAmount = parsed.data.totalAmount;
  const depositAmount = Math.round(totalAmount * (DEPOSIT_PERCENT / 100));

  const snapshot = {
    listingId: listing.id,
    title: listing.title,
    description: listing.description,
    priceMin: listing.priceMin,
    priceMax: listing.priceMax,
    city: listing.city,
    coverImage: listing.coverImage,
    vendorBusinessName: listing.vendor.businessName,
    snapshotAt: new Date().toISOString(),
  };

  try {
    const booking = await reserveSlot({
      listingId: listing.id,
      customerId: user.id,
      vendorId: listing.vendorId,
      source: "MARKETPLACE",
      eventDate: new Date(parsed.data.eventDate),
      startTime: parsed.data.startTime ? new Date(parsed.data.startTime) : undefined,
      endTime: parsed.data.endTime ? new Date(parsed.data.endTime) : undefined,
      eventType: parsed.data.eventType,
      guestCount: parsed.data.guestCount,
      totalAmount,
      depositAmount,
      depositPercent: DEPOSIT_PERCENT,
      notes: parsed.data.notes,
    });

    prisma.booking
      .update({
        where: { id: booking.id },
        data: { bookingSnapshot: snapshot },
      })
      .catch(() => {});

    await emitDomainEvent({
      type: "BookingCreated",
      payload: {
        bookingId: booking.id,
        vendorId: listing.vendorId,
        listingTitle: listing.title,
        customerId: user.id,
      },
    });

    return jsonOk(booking, 201);
  } catch (err) {
    if (err instanceof BookingConflictError) {
      return jsonError(
        "Booking Conflict Detected. This venue is not available for the selected date/time.",
        409
      );
    }
    throw err;
  }
}

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  if (user.role === "VENDOR") {
    const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } });
    if (!vendor) return jsonOk([], 200, buildPaginationMeta(1, 30, 0));

    const parsed = vendorBookingsQuerySchema.safeParse(
      Object.fromEntries(req.nextUrl.searchParams.entries())
    );
    if (!parsed.success) return jsonError("Invalid query parameters", 400);

    const { page, limit, filter } = parsed.data;
    const where = buildVendorBookingFilterWhere(filter, vendor.id);

    const [bookings, total, filterCounts] = await Promise.all([
      prisma.booking.findMany({
        where,
        select: vendorBookingListSelect,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.booking.count({ where }),
      countVendorBookingsByFilter(vendor.id),
    ]);

    return jsonOk(
      bookings,
      200,
      buildPaginationMeta(page, limit, total, { filterCounts })
    );
  }

  const parsed = paginationQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams.entries())
  );
  if (!parsed.success) return jsonError("Invalid query parameters", 400);

  const { page, limit } = parsed.data;
  const where = { customerId: user.id };

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      select: customerBookingListSelect,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.booking.count({ where }),
  ]);

  return jsonOk(bookings, 200, buildPaginationMeta(page, limit, total));
}

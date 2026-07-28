import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { createBookingSchema } from "@/lib/validations/booking";
import {
  reserveSlot,
  BookingConflictError,
  BookingAvailabilityError,
} from "@/lib/booking-engine";
import { BOOKING_CHARGE_PERCENT } from "@/core/shared/config";
import { emitDomainEvent } from "@/core/events";
import { buildPaginationMeta, paginationQuerySchema } from "@/lib/pagination";
import { apiLimiter, checkRateLimit } from "@/lib/rate-limit";
import {
  buildVendorBookingFilterWhere,
  countVendorBookingsByFilter,
  VENDOR_BOOKING_FILTERS,
} from "@/lib/booking-list-filters";
import {
  calcPackageTotal,
  findPackageById,
  formatCancellationPolicyLines,
  normalizeCancellationPolicy,
  packageBasePrice,
} from "@/lib/vendor-packages";
import { writeAuditLog } from "@/core/audit-engine";

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
  vendorCompletedAt: true,
  completionConfirmedAt: true,
  listing: { select: { title: true, slug: true } },
  vendor: { select: { businessName: true, slug: true } },
  payments: {
    select: { status: true },
    orderBy: { createdAt: "desc" as const },
    take: 1,
  },
  dispute: { select: { status: true } },
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
  const priceFloor = listing.priceMin;
  const priceCeiling = Math.max(listing.priceMax, listing.priceMin) * 2;

  const selectedPkg = findPackageById(listing.vendor.metadata, parsed.data.packageId);
  if (parsed.data.packageId && !selectedPkg) {
    return jsonError("Selected package is not available.", 400);
  }

  if (selectedPkg) {
    const expected = calcPackageTotal(selectedPkg, parsed.data.selectedAddOns ?? []);
    // Allow small client rounding drift; reject spoofed totals.
    if (Math.abs(totalAmount - expected) > 1) {
      return jsonError(
        `Booking total must match the selected package and add-ons (₦${expected.toLocaleString()}).`,
        400
      );
    }
  } else {
    if (totalAmount < priceFloor) {
      return jsonError(
        `Amount is below this listing's starting price (₦${priceFloor.toLocaleString()}).`,
        400
      );
    }
    if (totalAmount > priceCeiling) {
      return jsonError(
        `Amount is far above this listing's listed range. Contact the vendor for a custom quote.`,
        400
      );
    }
  }

  const cancellationPolicy = selectedPkg
    ? normalizeCancellationPolicy(selectedPkg.cancellationPolicy)
    : normalizeCancellationPolicy(
        (listing.vendor.metadata as Record<string, unknown> | null)?.cancellationPolicy
      );

  if (!parsed.data.acceptCancellationPolicy) {
    return jsonError("Please accept the cancellation policy before paying.", 400);
  }

  const eventDate = new Date(parsed.data.eventDate);
  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);
  if (eventDate < todayUtc) {
    return jsonError("Event date cannot be in the past.", 400);
  }

  if (parsed.data.startTime && parsed.data.endTime) {
    const start = new Date(parsed.data.startTime);
    const end = new Date(parsed.data.endTime);
    if (!(start < end)) {
      return jsonError("End time must be after start time.", 400);
    }
  }

  const chargeAmount = totalAmount;

  const selectedAddOnsDetailed = (parsed.data.selectedAddOns ?? [])
    .map((sel) => {
      const addOn = selectedPkg?.addOns.find((a) => a.id === sel.addOnId && a.active);
      if (!addOn) return null;
      const quantity = Math.min(
        Math.max(1, sel.quantity || 1),
        addOn.quantityAllowed ? addOn.maxQuantity : 1
      );
      return {
        id: addOn.id,
        name: addOn.name,
        unitPrice: addOn.price,
        quantity,
        lineTotal: addOn.price * quantity,
      };
    })
    .filter(Boolean);

  const snapshot = {
    listingId: listing.id,
    title: listing.title,
    description: listing.description,
    priceMin: listing.priceMin,
    priceMax: listing.priceMax,
    city: listing.city,
    coverImage: listing.coverImage,
    vendorBusinessName: listing.vendor.businessName,
    vendorCategory: listing.vendor.category,
    snapshotAt: new Date().toISOString(),
    package: selectedPkg
      ? {
          id: selectedPkg.id,
          name: selectedPkg.name,
          shortDescription: selectedPkg.shortDescription,
          basePrice: packageBasePrice(selectedPkg),
          badge: selectedPkg.badge ?? null,
          features: selectedPkg.features,
        }
      : null,
    selectedAddOns: selectedAddOnsDetailed,
    categoryAnswers: parsed.data.categoryAnswers ?? {},
    cancellationPolicy,
    cancellationPolicyLines: formatCancellationPolicyLines(cancellationPolicy),
    policyAcceptedAt: new Date().toISOString(),
    pricing: {
      packageBase: selectedPkg ? packageBasePrice(selectedPkg) : totalAmount,
      addOnsTotal: selectedAddOnsDetailed.reduce(
        (s, a) => s + (a as { lineTotal: number }).lineTotal,
        0
      ),
      totalAmount,
    },
  };

  try {
    const booking = await reserveSlot({
      listingId: listing.id,
      customerId: user.id,
      vendorId: listing.vendorId,
      source: "MARKETPLACE",
      eventDate,
      startTime: parsed.data.startTime ? new Date(parsed.data.startTime) : undefined,
      endTime: parsed.data.endTime ? new Date(parsed.data.endTime) : undefined,
      eventType: parsed.data.eventType,
      guestCount: parsed.data.guestCount,
      totalAmount,
      depositAmount: chargeAmount,
      depositPercent: BOOKING_CHARGE_PERCENT,
      notes: parsed.data.notes,
      applyRewards: parsed.data.applyRewards,
      bookingSnapshot: snapshot as Prisma.InputJsonValue,
    });

    await writeAuditLog({
      actorId: user.id,
      action: "BOOKING_POLICY_ACCEPTED",
      entityType: "Booking",
      entityId: booking.id,
      metadata: {
        packageId: selectedPkg?.id ?? null,
        policyPreset: cancellationPolicy.preset,
      },
    });

    await emitDomainEvent({
      type: "BookingCreated",
      payload: {
        bookingId: booking.id,
        vendorId: listing.vendorId,
        listingTitle: listing.title,
        customerId: user.id,
        source: "MARKETPLACE",
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
    if (err instanceof BookingAvailabilityError) {
      return jsonError(err.message, 409);
    }
    throw err;
  }
}

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const scopeParam = req.nextUrl.searchParams.get("scope");
  // Vendors who also book as customers must pass scope=customer for their
  // own bookings. Vendor inbox defaults to vendor scope when omitted.
  const wantsVendorScope =
    user.role === "VENDOR" &&
    scopeParam !== "customer" &&
    (scopeParam === "vendor" || scopeParam === null);

  if (wantsVendorScope && user.role === "VENDOR") {
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

  // Customer bookings (explicit scope=customer, or any non-vendor role).
  // Also used when a VENDOR account booked someone else's listing.
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

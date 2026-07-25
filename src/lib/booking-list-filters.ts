import type { Prisma } from "@prisma/client";
import { endOfDay, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";

export const VENDOR_BOOKING_FILTERS = [
  "all",
  "pending",
  "reserved",
  "confirmed",
  "upcoming",
  "today",
  "completed",
  "cancelled",
  "disputed",
] as const;

export type VendorBookingFilter = (typeof VENDOR_BOOKING_FILTERS)[number];

export function buildVendorBookingFilterWhere(
  filter: VendorBookingFilter,
  vendorId: string
): Prisma.BookingWhereInput {
  const base: Prisma.BookingWhereInput = { vendorId };
  const now = new Date();

  switch (filter) {
    case "pending":
      return { ...base, status: { in: ["RESERVED", "PENDING_PAYMENT"] } };
    case "reserved":
      return { ...base, status: "RESERVED" };
    case "confirmed":
      return { ...base, status: { in: ["CONFIRMED", "IN_PROGRESS"] } };
    case "upcoming":
      return {
        ...base,
        eventDate: { gte: now },
        status: { in: ["CONFIRMED", "IN_PROGRESS", "RESERVED"] },
      };
    case "today":
      return {
        ...base,
        eventDate: { gte: startOfDay(now), lte: endOfDay(now) },
      };
    case "completed":
      return { ...base, status: "COMPLETED" };
    case "cancelled":
      return { ...base, status: { in: ["CANCELLED", "DECLINED", "EXPIRED"] } };
    case "disputed":
      return { ...base, dispute: { status: "OPEN" } };
    case "all":
    default:
      return base;
  }
}

export async function countVendorBookingsByFilter(
  vendorId: string
): Promise<Record<VendorBookingFilter, number>> {
  const counts = await Promise.all(
    VENDOR_BOOKING_FILTERS.map(async (filter) => {
      const total = await prisma.booking.count({
        where: buildVendorBookingFilterWhere(filter, vendorId),
      });
      return [filter, total] as const;
    })
  );
  return Object.fromEntries(counts) as Record<VendorBookingFilter, number>;
}

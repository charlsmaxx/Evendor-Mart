import "server-only";
import { prisma } from "@/core/infrastructure/prisma";
import type { Prisma } from "@prisma/client";

export type UpsertBusinessCustomerInput = {
  vendorId: string;
  fullName: string;
  phone: string;
  email?: string;
  internalNotes?: string;
  favoriteListingId?: string;
};

export async function upsertBusinessCustomer(
  input: UpsertBusinessCustomerInput,
  tx?: Prisma.TransactionClient
) {
  const db = tx ?? prisma;
  const normalizedPhone = input.phone.replace(/\s+/g, "").trim();
  return db.businessCustomer.upsert({
    where: {
      vendorId_phone: { vendorId: input.vendorId, phone: normalizedPhone },
    },
    create: {
      vendorId: input.vendorId,
      fullName: input.fullName.trim(),
      phone: normalizedPhone,
      email: input.email?.trim() || null,
      internalNotes: input.internalNotes,
      favoriteListingId: input.favoriteListingId,
    },
    update: {
      fullName: input.fullName.trim(),
      email: input.email?.trim() || undefined,
      internalNotes: input.internalNotes,
      favoriteListingId: input.favoriteListingId,
    },
  });
}

export async function recordCustomerBookingSpend(
  businessCustomerId: string,
  amount: number,
  eventDate: Date,
  tx?: Prisma.TransactionClient
) {
  const db = tx ?? prisma;
  const customer = await db.businessCustomer.findUnique({
    where: { id: businessCustomerId },
  });
  if (!customer) return;
  await db.businessCustomer.update({
    where: { id: businessCustomerId },
    data: {
      totalSpend: customer.totalSpend + amount,
      lastBookingAt: eventDate,
    },
  });
}

export async function listBusinessCustomers(
  vendorId: string,
  opts?: { q?: string; limit?: number; offset?: number }
) {
  const q = opts?.q?.trim();
  return prisma.businessCustomer.findMany({
    where: {
      vendorId,
      ...(q
        ? {
            OR: [
              { fullName: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ lastBookingAt: "desc" }, { updatedAt: "desc" }],
    take: opts?.limit ?? 50,
    skip: opts?.offset ?? 0,
    include: {
      bookings: {
        take: 5,
        orderBy: { eventDate: "desc" },
        select: {
          id: true,
          eventDate: true,
          status: true,
          totalAmount: true,
          source: true,
          listing: { select: { title: true } },
        },
      },
      _count: { select: { bookings: true } },
    },
  });
}

export async function getBusinessCustomer(vendorId: string, customerId: string) {
  return prisma.businessCustomer.findFirst({
    where: { id: customerId, vendorId },
    include: {
      bookings: {
        orderBy: { eventDate: "desc" },
        include: {
          listing: { select: { title: true, id: true } },
          review: { select: { rating: true, comment: true } },
        },
      },
    },
  });
}

export function resolveBookingCustomerName(booking: {
  customer?: { fullName?: string | null; email?: string } | null;
  businessCustomer?: { fullName?: string | null } | null;
  bookingSnapshot?: unknown;
}): string {
  if (booking.customer?.fullName) return booking.customer.fullName;
  if (booking.businessCustomer?.fullName) return booking.businessCustomer.fullName;
  const snap = booking.bookingSnapshot as { manualCustomer?: { fullName?: string } } | null;
  if (snap?.manualCustomer?.fullName) return snap.manualCustomer.fullName;
  return booking.customer?.email ?? "Customer";
}

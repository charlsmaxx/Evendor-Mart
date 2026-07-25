/**
 * Anti-double-booking engine.
 *
 * Marketplace and manual bookings share the same conflict detection.
 * Source distinguishes origin: MARKETPLACE | MANUAL | ADMIN | API
 */
import "server-only";
import { prisma } from "@/core/infrastructure/prisma";
import { Prisma, type BookingSource, type BookingStatus } from "@prisma/client";
import {
  upsertBusinessCustomer,
  recordCustomerBookingSpend,
} from "@/core/crm-engine";
import { requirePremium, PremiumRequiredError } from "@/core/subscription-engine";
import { writeAuditLog } from "@/core/audit-engine/service";

export const RESERVATION_WINDOW_MINUTES = 15;

export const ACTIVE_STATUSES: string[] = ["RESERVED", "CONFIRMED", "IN_PROGRESS"];

export { PremiumRequiredError };

export function reservationExpiresAt(): Date {
  const d = new Date();
  d.setMinutes(d.getMinutes() + RESERVATION_WINDOW_MINUTES);
  return d;
}

export class BookingConflictError extends Error {
  constructor() {
    super("BOOKING_CONFLICT");
    this.name = "BookingConflictError";
  }
}

interface SlotInput {
  listingId: string;
  vendorId: string;
  eventDate: Date;
  startTime?: Date;
  endTime?: Date;
}

interface ReserveInput extends SlotInput {
  customerId: string;
  eventType?: string;
  guestCount?: number;
  totalAmount: number;
  depositAmount: number;
  depositPercent: number;
  notes?: string;
  source?: BookingSource;
}

export interface ManualBookingInput extends SlotInput {
  createdById: string;
  listingTitle: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  eventType?: string;
  guestCount?: number;
  totalAmount: number;
  depositReceived?: number;
  outstandingBalance?: number;
  notes?: string;
  attachments?: unknown[];
  status?: BookingStatus;
}

async function assertNoConflict(
  tx: Prisma.TransactionClient,
  input: SlotInput
): Promise<void> {
  const eventDay = input.eventDate.toISOString().slice(0, 10);

  await tx.$executeRaw`
    UPDATE "Booking"
    SET status = 'EXPIRED'::"BookingStatus", "updatedAt" = NOW()
    WHERE "listingId" = ${input.listingId}
      AND status = 'RESERVED'::"BookingStatus"
      AND "reservationExpiresAt" IS NOT NULL
      AND "reservationExpiresAt" < NOW()
  `;

  let conflicts: { id: string }[];

  if (input.startTime && input.endTime) {
    conflicts = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Booking"
      WHERE "listingId" = ${input.listingId}
        AND status = ANY(ARRAY['RESERVED','CONFIRMED','IN_PROGRESS']::"BookingStatus"[])
        AND DATE("eventDate") = ${eventDay}::date
        AND "startTime" IS NOT NULL AND "endTime" IS NOT NULL
        AND "startTime" < ${input.endTime}
        AND "endTime" > ${input.startTime}
      LIMIT 1
    `;
  } else {
    conflicts = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Booking"
      WHERE "listingId" = ${input.listingId}
        AND status = ANY(ARRAY['RESERVED','CONFIRMED','IN_PROGRESS']::"BookingStatus"[])
        AND DATE("eventDate") = ${eventDay}::date
      LIMIT 1
    `;
  }

  if (conflicts.length > 0) {
    throw new BookingConflictError();
  }
}

/** Marketplace reservation — creates RESERVED booking + pending payment. */
export async function reserveSlot(input: ReserveInput) {
  return prisma.$transaction(
    async (tx) => {
      await assertNoConflict(tx, input);

      const booking = await tx.booking.create({
        data: {
          listingId: input.listingId,
          customerId: input.customerId,
          vendorId: input.vendorId,
          source: input.source ?? "MARKETPLACE",
          eventDate: input.eventDate,
          startTime: input.startTime,
          endTime: input.endTime,
          eventType: input.eventType,
          guestCount: input.guestCount,
          totalAmount: input.totalAmount,
          depositAmount: input.depositAmount,
          depositPercent: input.depositPercent,
          notes: input.notes,
          status: "RESERVED",
          reservationExpiresAt: reservationExpiresAt(),
        },
        include: { listing: true, vendor: true },
      });

      await tx.payment.create({
        data: {
          bookingId: booking.id,
          amount: input.depositAmount,
          status: "PENDING",
          escrowStatus: "HELD",
          heldAmount: input.depositAmount,
        },
      });

      return booking;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

/** Premium manual booking — same engine, no marketplace payment flow. */
export async function createManualBooking(input: ManualBookingInput) {
  await requirePremium(input.vendorId, "manual_booking");

  const depositReceived = input.depositReceived ?? 0;
  const outstandingBalance =
    input.outstandingBalance ?? Math.max(0, input.totalAmount - depositReceived);
  const status = input.status ?? "CONFIRMED";

  return prisma.$transaction(
    async (tx) => {
      await assertNoConflict(tx, input);

      const businessCustomer = await upsertBusinessCustomer(
        {
          vendorId: input.vendorId,
          fullName: input.customerName,
          phone: input.customerPhone,
          email: input.customerEmail,
        },
        tx
      );

      const booking = await tx.booking.create({
        data: {
          listingId: input.listingId,
          vendorId: input.vendorId,
          businessCustomerId: businessCustomer.id,
          source: "MANUAL",
          createdById: input.createdById,
          eventDate: input.eventDate,
          startTime: input.startTime,
          endTime: input.endTime,
          eventType: input.eventType,
          guestCount: input.guestCount,
          totalAmount: input.totalAmount,
          depositAmount: depositReceived,
          depositPercent: 0,
          depositReceived,
          outstandingBalance,
          notes: input.notes,
          attachments: (input.attachments ?? []) as Prisma.InputJsonValue,
          status,
          bookingSnapshot: {
            manualCustomer: {
              fullName: input.customerName,
              phone: input.customerPhone,
              email: input.customerEmail ?? null,
            },
            listingTitle: input.listingTitle,
            source: "MANUAL",
            snapshotAt: new Date().toISOString(),
          },
        },
        include: { listing: true, businessCustomer: true },
      });

      await recordCustomerBookingSpend(
        businessCustomer.id,
        input.totalAmount,
        input.eventDate,
        tx
      );

      await writeAuditLog(
        {
          actorId: input.createdById,
          action: "MANUAL_BOOKING_CREATED",
          entityType: "Booking",
          entityId: booking.id,
          metadata: {
            vendorId: input.vendorId,
            source: "MANUAL",
            customerPhone: input.customerPhone,
          },
        },
        tx
      );

      return booking;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

export async function confirmBooking(bookingId: string) {
  return prisma.booking.update({
    where: { id: bookingId, status: "RESERVED" },
    data: {
      status: "CONFIRMED",
      reservationExpiresAt: null,
      updatedAt: new Date(),
    },
  });
}

export async function expireStaleReservations(): Promise<number> {
  const result = await prisma.booking.updateMany({
    where: {
      status: "RESERVED",
      reservationExpiresAt: { lte: new Date() },
    },
    data: { status: "EXPIRED", updatedAt: new Date() },
  });
  return result.count;
}

export async function checkAvailability(
  listingId: string,
  eventDate: Date,
  startTime?: Date,
  endTime?: Date
): Promise<{ available: boolean; reason?: string }> {
  await expireStaleReservations();

  const eventDay = eventDate.toISOString().slice(0, 10);

  let conflicts: { id: string; status: string }[];

  if (startTime && endTime) {
    conflicts = await prisma.$queryRaw<{ id: string; status: string }[]>`
      SELECT id, status FROM "Booking"
      WHERE "listingId" = ${listingId}
        AND status = ANY(ARRAY['RESERVED','CONFIRMED','IN_PROGRESS']::"BookingStatus"[])
        AND DATE("eventDate") = ${eventDay}::date
        AND "startTime" IS NOT NULL AND "endTime" IS NOT NULL
        AND "startTime" < ${endTime}
        AND "endTime" > ${startTime}
      LIMIT 1
    `;
  } else {
    conflicts = await prisma.$queryRaw<{ id: string; status: string }[]>`
      SELECT id, status FROM "Booking"
      WHERE "listingId" = ${listingId}
        AND status = ANY(ARRAY['RESERVED','CONFIRMED','IN_PROGRESS']::"BookingStatus"[])
        AND DATE("eventDate") = ${eventDay}::date
      LIMIT 1
    `;
  }

  if (conflicts.length === 0) return { available: true };

  const status = conflicts[0].status;
  if (status === "RESERVED") {
    return {
      available: false,
      reason: "Pending Reservation — another customer is completing payment.",
    };
  }
  return { available: false, reason: "Booking Conflict Detected. Venue Not Available." };
}

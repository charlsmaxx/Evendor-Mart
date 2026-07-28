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
import {
  redeemRewardsInTx,
  refundRedeemedRewardsInTx,
} from "@/core/rewards-engine/service";
import { writeAuditLog } from "@/core/audit-engine/service";
import {
  parseAvailabilitySettings,
  reasonVendorClosedOnDay,
} from "@/core/availability-engine/settings";

export const RESERVATION_WINDOW_MINUTES = 15;

export const ACTIVE_STATUSES: string[] = [
  "RESERVED",
  "PENDING_PAYMENT",
  "CONFIRMED",
  "IN_PROGRESS",
];

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

export class BookingAvailabilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingAvailabilityError";
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
  /** Spend the customer's rewards on this booking. The amount is computed server-side. */
  applyRewards?: boolean;
  /** Contract snapshot: package, add-ons, category answers, cancellation policy. */
  bookingSnapshot?: Prisma.InputJsonValue;
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

async function withSerializableRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
      if (!retryable || i === attempts - 1) throw error;
      lastError = error;
    }
  }
  throw lastError;
}

/**
 * Flip expired RESERVED rows to EXPIRED, fail their pending payments, and return
 * any rewards spent on them. Safe inside or outside a larger transaction.
 */
async function expireStaleReservationsInTx(
  tx: Prisma.TransactionClient,
  listingId?: string
): Promise<string[]> {
  const stale = await tx.booking.findMany({
    where: {
      status: "RESERVED",
      reservationExpiresAt: { lte: new Date() },
      ...(listingId ? { listingId } : {}),
    },
    select: { id: true },
  });
  if (stale.length === 0) return [];

  const ids = stale.map((b) => b.id);

  await tx.booking.updateMany({
    where: { id: { in: ids } },
    data: { status: "EXPIRED", updatedAt: new Date() },
  });

  await tx.payment.updateMany({
    where: { bookingId: { in: ids }, status: "PENDING" },
    data: { status: "FAILED", escrowStatus: "NONE" },
  });

  for (const id of ids) {
    await refundRedeemedRewardsInTx(tx, id);
  }

  return ids;
}

async function assertVendorAvailable(
  tx: Prisma.TransactionClient,
  vendorId: string,
  eventDate: Date
): Promise<void> {
  const eventDay = eventDate.toISOString().slice(0, 10);
  const dayStart = new Date(`${eventDay}T00:00:00.000Z`);
  const dayEnd = new Date(`${eventDay}T23:59:59.999Z`);

  const [vendor, blocked] = await Promise.all([
    tx.vendorProfile.findUnique({
      where: { id: vendorId },
      select: { availability: true },
    }),
    tx.blockedDate.findFirst({
      where: { vendorId, date: { gte: dayStart, lte: dayEnd } },
      select: { id: true, reason: true },
    }),
  ]);

  if (blocked) {
    throw new BookingAvailabilityError(
      blocked.reason?.trim()
        ? `This date is blocked: ${blocked.reason}`
        : "Vendor has blocked this date."
    );
  }

  const settings = parseAvailabilitySettings(vendor?.availability);
  const closed = reasonVendorClosedOnDay(settings, eventDay);
  if (closed) throw new BookingAvailabilityError(closed);
}

async function assertNoConflict(
  tx: Prisma.TransactionClient,
  input: SlotInput,
  opts?: { enforceVendorCalendar?: boolean }
): Promise<void> {
  await expireStaleReservationsInTx(tx, input.listingId);
  // Marketplace only — manual/offline bookings often record past work on closed days.
  if (opts?.enforceVendorCalendar !== false) {
    await assertVendorAvailable(tx, input.vendorId, input.eventDate);
  }

  const eventDay = input.eventDate.toISOString().slice(0, 10);
  let conflicts: { id: string }[];

  if (input.startTime && input.endTime) {
    conflicts = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Booking"
      WHERE "listingId" = ${input.listingId}
        AND status = ANY(ARRAY['RESERVED','PENDING_PAYMENT','CONFIRMED','IN_PROGRESS']::"BookingStatus"[])
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
        AND status = ANY(ARRAY['RESERVED','PENDING_PAYMENT','CONFIRMED','IN_PROGRESS']::"BookingStatus"[])
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
  return withSerializableRetry(() =>
    prisma.$transaction(
      async (tx) => {
        await assertNoConflict(tx, input, { enforceVendorCalendar: true });

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
            ...(input.bookingSnapshot != null
              ? { bookingSnapshot: input.bookingSnapshot }
              : {}),
          },
          include: { listing: true, vendor: true },
        });

        const rewardsRedeemed = input.applyRewards
          ? await redeemRewardsInTx(tx, input.customerId, booking.id, input.totalAmount)
          : 0;

        // What Paystack actually charges. The vendor's share is still computed from
        // totalAmount at escrow release — the discount comes out of Evendor's commission.
        const chargeAmount = input.depositAmount - rewardsRedeemed;

        if (rewardsRedeemed > 0) {
          await tx.booking.update({
            where: { id: booking.id },
            data: { rewardsRedeemed },
          });
          booking.rewardsRedeemed = rewardsRedeemed;
        }

        await tx.payment.create({
          data: {
            bookingId: booking.id,
            amount: chargeAmount,
            status: "PENDING",
            escrowStatus: "HELD",
            heldAmount: chargeAmount,
          },
        });

        return booking;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        // Remote Postgres (pooler) often needs >5s for conflict checks + writes.
        maxWait: 15_000,
        timeout: 30_000,
      }
    )
  );
}

/** Premium manual booking — same engine, no marketplace payment flow. */
export async function createManualBooking(input: ManualBookingInput) {
  await requirePremium(input.vendorId, "manual_booking");

  const depositReceived = input.depositReceived ?? 0;
  const outstandingBalance =
    input.outstandingBalance ?? Math.max(0, input.totalAmount - depositReceived);
  const status = input.status ?? "CONFIRMED";

  return withSerializableRetry(() =>
    prisma.$transaction(
      async (tx) => {
        await assertNoConflict(tx, input, { enforceVendorCalendar: false });

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
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 15_000,
        timeout: 30_000,
      }
    )
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

/** Cron + availability pre-check: expire stale reservations with payment/reward cleanup. */
export async function expireStaleReservations(): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const ids = await expireStaleReservationsInTx(tx);
    return ids.length;
  });
}

export async function checkAvailability(
  listingId: string,
  eventDate: Date,
  startTime?: Date,
  endTime?: Date
): Promise<{ available: boolean; reason?: string }> {
  await expireStaleReservations();

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { vendorId: true },
  });
  if (!listing) return { available: false, reason: "Listing not found." };

  try {
    await prisma.$transaction(async (tx) => {
      await assertVendorAvailable(tx, listing.vendorId, eventDate);
    });
  } catch (error) {
    if (error instanceof BookingAvailabilityError) {
      return { available: false, reason: error.message };
    }
    throw error;
  }

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

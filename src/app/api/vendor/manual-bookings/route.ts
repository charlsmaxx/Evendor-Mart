import { z } from "zod";
import { jsonOk, jsonError, handleApiRoute } from "@/lib/api-response";
import { requireVendorProfile } from "@/lib/vendor-api-auth";
import {
  createManualBooking,
  BookingConflictError,
  PremiumRequiredError,
} from "@/core/booking-engine";
import { emitDomainEvent } from "@/core/events";
import { prisma } from "@/lib/prisma";

const manualBookingSchema = z.object({
  listingId: z.string().uuid(),
  customerName: z.string().min(2),
  customerPhone: z.string().min(7),
  customerEmail: z.string().email().optional().or(z.literal("")),
  eventType: z.string().optional(),
  eventDate: z.string(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  guestCount: z.number().int().positive().optional(),
  totalAmount: z.number().int().positive(),
  depositReceived: z.number().int().min(0).optional(),
  outstandingBalance: z.number().int().min(0).optional(),
  notes: z.string().optional(),
  attachments: z.array(z.unknown()).optional(),
  status: z
    .enum(["CONFIRMED", "PENDING_PAYMENT", "IN_PROGRESS", "COMPLETED", "RESERVED"])
    .optional(),
});

function combineDateAndTime(dateStr: string, timeStr?: string): Date | undefined {
  if (!timeStr) return undefined;
  return new Date(`${dateStr}T${timeStr}:00`);
}

export async function POST(req: Request) {
  return handleApiRoute(async () => {
    const { error, user, vendor } = await requireVendorProfile();
    if (error) return error;

    const parsed = manualBookingSchema.safeParse(await req.json());
    if (!parsed.success) return jsonError(parsed.error.message, 400);

    const listing = await prisma.listing.findFirst({
      where: { id: parsed.data.listingId, vendorId: vendor!.id },
    });
    if (!listing) return jsonError("Listing not found", 404);

    try {
      const booking = await createManualBooking({
        listingId: listing.id,
        listingTitle: listing.title,
        vendorId: vendor!.id,
        createdById: user!.id,
        customerName: parsed.data.customerName,
        customerPhone: parsed.data.customerPhone,
        customerEmail: parsed.data.customerEmail || undefined,
        eventType: parsed.data.eventType,
        eventDate: new Date(parsed.data.eventDate),
        startTime: combineDateAndTime(parsed.data.eventDate, parsed.data.startTime),
        endTime: combineDateAndTime(parsed.data.eventDate, parsed.data.endTime),
        guestCount: parsed.data.guestCount,
        totalAmount: parsed.data.totalAmount,
        depositReceived: parsed.data.depositReceived,
        outstandingBalance: parsed.data.outstandingBalance,
        notes: parsed.data.notes,
        attachments: parsed.data.attachments,
        status: parsed.data.status,
      });

      await emitDomainEvent({
        type: "BookingCreated",
        payload: {
          bookingId: booking.id,
          vendorId: vendor!.id,
          listingTitle: listing.title,
          source: "MANUAL",
        },
      });

      return jsonOk(booking, 201);
    } catch (err) {
      if (err instanceof PremiumRequiredError) {
        return jsonError("Premium subscription required", 402, err.feature);
      }
      if (err instanceof BookingConflictError) {
        return jsonError("Booking conflict — slot unavailable", 409);
      }
      throw err;
    }
  });
}

export async function GET() {
  return handleApiRoute(async () => {
    const { error, vendor } = await requireVendorProfile();
    if (error) return error;

    const bookings = await prisma.booking.findMany({
      where: { vendorId: vendor!.id, source: "MANUAL" },
      include: {
        listing: { select: { title: true } },
        businessCustomer: { select: { fullName: true, phone: true, email: true } },
      },
      orderBy: { eventDate: "desc" },
      take: 100,
    });
    return jsonOk(bookings);
  });
}

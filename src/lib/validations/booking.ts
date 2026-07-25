import { z } from "zod";

export const createBookingSchema = z.object({
  listingId: z.string().uuid(),
  eventDate: z.string().datetime(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  eventType: z.string().max(80).optional(),
  guestCount: z.number().int().positive().optional(),
  totalAmount: z.number().int().positive(),
  notes: z.string().max(500).optional(),
});

export const updateBookingSchema = z.object({
  status: z.enum(["CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "DECLINED"]),
});

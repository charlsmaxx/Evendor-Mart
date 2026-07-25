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
  /**
   * Opt in to spending rewards. Only a flag — the discount is computed from the wallet
   * server-side, so the client cannot name its own figure.
   */
  applyRewards: z.boolean().optional().default(false),
});

export const updateBookingSchema = z.object({
  status: z.enum(["CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "DECLINED"]),
});

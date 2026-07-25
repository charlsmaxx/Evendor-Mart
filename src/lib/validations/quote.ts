import { z } from "zod";

export const createQuoteSchema = z.object({
  vendorId: z.string().uuid(),
  listingId: z.string().uuid().optional(),
  eventDate: z.string().datetime().optional(),
  budget: z.number().int().positive().optional(),
  message: z.string().min(10).max(2000),
});

import { z } from "zod";

export const quoteDetailsSchema = z
  .object({
    eventType: z.string().max(80).optional(),
    location: z.string().max(200).optional(),
    guestCount: z.number().int().positive().max(100000).optional(),
    listingTitle: z.string().max(200).optional(),
  })
  .optional();

export const createQuoteSchema = z.object({
  vendorId: z.string().uuid(),
  listingId: z.string().uuid().optional(),
  eventDate: z.string().datetime().optional(),
  budget: z.number().int().positive().optional(),
  message: z.string().min(10).max(2000),
  details: quoteDetailsSchema,
});

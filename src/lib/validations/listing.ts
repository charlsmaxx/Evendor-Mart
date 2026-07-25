import { z } from "zod";

export const listingSearchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  type: z.enum(["VENUE", "SERVICE"]).optional(),
  city: z.string().optional(),
  minBudget: z.coerce.number().optional(),
  maxBudget: z.coerce.number().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  verified: z.coerce.boolean().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(12),
});

export const createListingSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(20),
  categoryId: z.string().uuid(),
  type: z.enum(["SERVICE", "VENUE"]),
  city: z.string().min(2),
  priceMin: z.number().int().positive(),
  priceMax: z.number().int().positive(),
  coverImage: z.string().url().optional(),
  capacity: z.number().int().positive().optional(),
  address: z.string().min(5).optional(),
  amenities: z.array(z.string()).optional(),
  services: z.array(z.string()).optional(),
  termsAndConditions: z.string().max(10000).nullable().optional(),
});

export const updateListingSchema = createListingSchema.partial().extend({
  id: z.string().uuid(),
  status: z.enum(["DRAFT", "PENDING_REVIEW", "PUBLISHED", "ARCHIVED"]).optional(),
});

export const updateListingBodySchema = createListingSchema.partial().extend({
  status: z.enum(["DRAFT", "PENDING_REVIEW", "PUBLISHED", "ARCHIVED"]).optional(),
});

import { z } from "zod";

export const addPortfolioSchema = z.object({
  url: z.string().url(),
  publicId: z.string().min(1).max(200),
  listingId: z.string().uuid().optional(),
  mediaType: z.enum(["image", "video"]).optional(),
});

export const reorderPortfolioSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int().min(0),
    })
  ).min(1),
});

export const setPortfolioCoverSchema = z.object({
  mediaId: z.string().uuid(),
});

export const deletePortfolioSchema = z.object({
  id: z.string().uuid(),
});

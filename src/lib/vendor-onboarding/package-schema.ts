import { z } from "zod";

const nonNegativeInteger = z.number().int().nonnegative().safe();

const addOnSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  description: z.string(),
  price: nonNegativeInteger,
  imageUrl: z.string().optional(),
  quantityAllowed: z.boolean(),
  maxQuantity: z.number().int().positive(),
  active: z.boolean(),
});

const cancellationPolicySchema = z.object({
  preset: z.enum(["FLEXIBLE", "MODERATE", "STRICT", "CUSTOM"]),
  windows: z.array(z.object({
    id: z.string().min(1),
    moreThanHoursBefore: nonNegativeInteger.nullable(),
    lessThanOrEqualHoursBefore: nonNegativeInteger,
    refundPercent: z.number().min(0).max(100),
    allowCancel: z.boolean(),
    feeAmount: nonNegativeInteger,
  })),
  notes: z.string().optional(),
});

/** Validates known package fields and strips unknown properties before draft persistence. */
export const vendorPackageDraftSchema = z.object({
  id: z.string().min(1),
  tier: z.enum(["BASIC", "PREMIUM", "LUXURY"]).optional(),
  name: z.string(),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  coverImage: z.string().optional(),
  price: nonNegativeInteger.optional(),
  fixedPrice: nonNegativeInteger.nullable().optional(),
  maxPrice: nonNegativeInteger.nullable().optional(),
  estimatedDuration: z.string().optional(),
  features: z.array(z.string()).optional(),
  addOns: z.array(addOnSchema).optional(),
  badge: z.enum(["POPULAR", "BEST_VALUE", "PREMIUM", "NEW"]).nullable().optional(),
  enabled: z.boolean(),
  cancellationPolicy: cancellationPolicySchema.optional(),
});

export const vendorPackageDraftsSchema = z.array(vendorPackageDraftSchema);

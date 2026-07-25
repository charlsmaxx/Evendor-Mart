import { z } from "zod";
import { bankAccountSchema } from "@/lib/validations/bank";
import { serviceVendorCategories } from "@/lib/categories";

export { serviceVendorCategories } from "@/lib/categories";

export const customerOnboardingSchema = z.object({
  fullName: z.string().min(2),
  city: z.string().min(2),
  preferences: z
    .object({
      interests: z.array(z.string()).optional(),
    })
    .optional(),
});

const listingFields = {
  listingTitle: z.string().min(3).optional(),
  listingDescription: z.string().min(20).optional(),
  priceMin: z.number().int().positive().optional(),
  priceMax: z.number().int().positive().optional(),
};

const uploadedImageSchema = z.object({
  url: z.string().url(),
  publicId: z.string().min(1),
  resourceType: z.string().optional(),
});

const vendorMediaFields = {
  avatarUrl: z.string().url().optional().nullable(),
  coverImageUrl: z.string().url().optional().nullable(),
  featuredImages: z.array(uploadedImageSchema).max(7).optional(),
  featuredClips: z.array(uploadedImageSchema).max(3).optional(),
};

export const venueOnboardingSchema = z.object({
  businessName: z.string().min(2),
  category: z.literal("VENUE"),
  city: z.string().min(2),
  address: z.string().min(5),
  bio: z.string().max(1000).optional(),
  ...vendorMediaFields,
  capacity: z.number().int().positive(),
  amenities: z.array(z.string()).optional(),
  services: z.array(z.string()).optional(),
  termsAndConditions: z.string().max(10000).nullable().optional(),
  ...listingFields,
  bankAccount: bankAccountSchema.optional(),
});

export const serviceVendorOnboardingSchema = z.object({
  businessName: z.string().min(2),
  category: z.enum(serviceVendorCategories),
  city: z.string().min(2),
  bio: z.string().max(1000).optional(),
  ...vendorMediaFields,
  termsAndConditions: z.string().max(10000).nullable().optional(),
  ...listingFields,
  bankAccount: bankAccountSchema,
});

/** @deprecated Use venueOnboardingSchema or serviceVendorOnboardingSchema */
export const vendorOnboardingSchema = z.union([venueOnboardingSchema, serviceVendorOnboardingSchema]);

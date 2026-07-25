import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { venueOnboardingSchema, serviceVendorOnboardingSchema } from "@/lib/validations/auth";
import { slugify } from "@/lib/utils";
import { upsertPublishedVendorListing } from "@/lib/vendor-listings";
import type { Prisma, VendorCategory } from "@prisma/client";
import { z } from "zod";

const onboardingBodySchema = z.discriminatedUnion("businessKind", [
  venueOnboardingSchema.extend({ businessKind: z.literal("VENUE") }),
  serviceVendorOnboardingSchema.extend({ businessKind: z.literal("SERVICE") }),
]);

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const body = await req.json();
  const parsed = onboardingBodySchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const data = parsed.data;

  try {
    const slug = slugify(data.businessName);
    const existingVendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } });
    const existingMeta = (existingVendor?.metadata as Record<string, unknown>) ?? {};

    const vendor = await prisma.vendorProfile.upsert({
      where: { userId: user.id },
      update: {
        businessName: data.businessName,
        category: data.category as VendorCategory,
        city: data.city,
        bio: data.bio,
        metadata: {
          ...existingMeta,
          businessKind: data.businessKind,
          ...(data.coverImageUrl ? { coverImageUrl: data.coverImageUrl } : {}),
          ...(data.bankAccount
            ? {
                bankAccount: {
                  ...data.bankAccount,
                  verified: true,
                  verifiedAt: new Date().toISOString(),
                },
              }
            : {}),
        } as Prisma.InputJsonValue,
      },
      create: {
        userId: user.id,
        businessName: data.businessName,
        slug,
        category: data.category as VendorCategory,
        city: data.city,
        bio: data.bio,
        metadata: {
          businessKind: data.businessKind,
          ...(data.coverImageUrl ? { coverImageUrl: data.coverImageUrl } : {}),
          ...(data.bankAccount
            ? {
                bankAccount: {
                  ...data.bankAccount,
                  verified: true,
                  verifiedAt: new Date().toISOString(),
                },
              }
            : {}),
        } as Prisma.InputJsonValue,
      },
    });

    const listingMedia = {
      coverImage: data.coverImageUrl ?? undefined,
      featuredImages: data.featuredImages,
      featuredClips: data.featuredClips,
    };

    const listing = await upsertPublishedVendorListing({
      vendorId: vendor.id,
      vendorCategory: data.category as VendorCategory,
      city: data.city,
      businessName: data.businessName,
      bio: data.bio,
      listingTitle: data.listingTitle,
      listingDescription: data.listingDescription,
      priceMin: data.priceMin,
      priceMax: data.priceMax,
      termsAndConditions: data.termsAndConditions,
      address: data.businessKind === "VENUE" ? data.address : undefined,
      capacity: data.businessKind === "VENUE" ? data.capacity : undefined,
      amenities: data.businessKind === "VENUE" ? data.amenities : undefined,
      services: data.businessKind === "VENUE" ? data.services : undefined,
      ...listingMedia,
    });

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        role: "VENDOR",
        onboardingComplete: true,
        city: data.city,
        fullName: data.businessName,
        ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
      },
    });

    return jsonOk({ user: updated, vendor, listing });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error";
    return jsonError(`Could not save profile: ${message}`, 500);
  }
}

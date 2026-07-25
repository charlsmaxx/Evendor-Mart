import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { loadVendorDraft } from "@/lib/vendor-onboarding/persist";
import { upsertPublishedVendorListing } from "@/lib/vendor-listings";
import { syncListingPortfolioMedia } from "@/lib/vendor-media-server";
import { generateVendorSeo } from "@/lib/vendor-onboarding/seo";
import { buildAmenitiesPayload, buildServicesPayload } from "@/components/vendor/venue-offerings-picker";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

const completeSchema = z.object({
  businessKind: z.enum(["VENUE", "SERVICE"]),
});

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const parsed = completeSchema.safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const { businessKind } = parsed.data;

  try {
    const { draft, vendorId } = await loadVendorDraft(user.id, businessKind);
    if (!vendorId) return jsonError("Save your progress first", 400);

    if (!draft.step1.businessName.trim()) return jsonError("Business name is required", 400);
    if (!draft.step8.accountName) return jsonError("Verify your bank account before publishing", 400);

    const primaryService = draft.step3.services.find((s) => s.name && s.priceMin > 0) ?? draft.step3.services[0];
    const seo = generateVendorSeo(draft);

    const vendor = await prisma.vendorProfile.update({
      where: { id: vendorId },
      data: {
        businessName: draft.step1.businessName,
        slug: draft.step1.slug,
        bio: draft.step1.description,
        city: draft.step2.city,
        country: draft.step2.country,
        availability: {
          workingHours: draft.step6.workingHours,
          vacations: draft.step6.vacations,
          vacationMode: draft.step6.vacationMode,
          unavailableDates: draft.step6.unavailableDates,
        } as Prisma.InputJsonValue,
        metadata: {
          businessKind,
          coverImageUrl: draft.step1.coverImageUrl,
          tagline: draft.step1.tagline,
          experience: draft.step1.yearsExperience,
          teamSize: draft.step1.teamSize,
          languages: draft.step1.languages,
          establishedYear: draft.step1.establishedYear,
          secondaryCategory: draft.step1.secondaryCategory,
          location: draft.step2,
          preferences: draft.step7,
          businessEmail: draft.step5.businessEmail,
          portfolioCategories: draft.step4.portfolioCategories,
          searchOptimization: {
            specialties: draft.step7.specialties,
            keywords: draft.step7.keywords,
            styles: draft.step7.styles,
            tags: draft.step7.tags,
          },
          seo,
          socialLinks: {
            instagram: draft.step5.instagram,
            facebook: draft.step5.facebook,
            tiktok: draft.step5.tiktok,
            youtube: draft.step5.youtube,
            website: draft.step5.website,
          },
          servicesOfferings: draft.step3.services,
          bankAccount: draft.step8.accountName
            ? {
                bankCode: draft.step8.bankCode,
                bankName: draft.step8.bankName,
                accountNumber: draft.step8.accountNumber,
                accountName: draft.step8.accountName,
                verified: true,
                verifiedAt: new Date().toISOString(),
              }
            : undefined,
          onboardingComplete: true,
        } as Prisma.InputJsonValue,
      },
    });

    const listing = await upsertPublishedVendorListing({
      vendorId: vendor.id,
      vendorCategory: vendor.category,
      city: draft.step2.city,
      businessName: draft.step1.businessName,
      bio: draft.step1.description,
      listingTitle: primaryService?.name || draft.step1.businessName,
      listingDescription: primaryService?.description || draft.step1.description,
      priceMin: primaryService?.priceMin,
      priceMax: primaryService?.priceMax,
      termsAndConditions: draft.step3.termsAndConditions ?? null,
      coverImage: draft.step1.coverImageUrl ?? undefined,
      featuredImages: draft.step4.featuredImages,
      featuredClips: draft.step4.featuredClips,
      address: draft.step2.address,
      capacity: draft.step3.capacity,
      amenities: buildAmenitiesPayload(draft.step3.amenities ?? [], []),
      services: buildServicesPayload(draft.step3.venueServices ?? [], []),
    });

    await syncListingPortfolioMedia(
      vendor.id,
      listing.id,
      draft.step4.featuredImages,
      draft.step4.featuredClips
    );

    await prisma.user.update({
      where: { id: user.id },
      data: {
        role: "VENDOR",
        onboardingComplete: true,
        city: draft.step2.city,
        fullName: draft.step1.businessName,
        avatarUrl: draft.step1.avatarUrl,
      },
    });

    return jsonOk({
      vendor,
      listing,
      redirectTo: businessKind === "VENUE" ? "/vendor/listings" : "/dashboard",
    });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Could not complete onboarding", 500);
  }
}

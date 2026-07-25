import "server-only";

import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import {
  mergeDraft,
  parseDraft,
  type BusinessKind,
  type VendorOnboardingDraft,
} from "@/lib/vendor-onboarding/types";
import { generateVendorSeo } from "@/lib/vendor-onboarding/seo";
import type { Prisma, VendorCategory } from "@prisma/client";

export async function loadVendorDraft(userId: string, businessKind: BusinessKind) {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
  if (!vendor) return { draft: parseDraft(null, businessKind), vendorId: null as string | null };

  const meta = (vendor.metadata as Record<string, unknown>) ?? {};
  const stored = meta.onboardingDraft;
  const kind = (meta.businessKind as BusinessKind) ?? businessKind;
  return { draft: parseDraft(stored, kind), vendorId: vendor.id };
}

export async function saveVendorDraft(
  userId: string,
  businessKind: BusinessKind,
  patch: Partial<VendorOnboardingDraft>
) {
  const existing = await prisma.vendorProfile.findUnique({ where: { userId } });
  const current = parseDraft(
    existing ? (existing.metadata as Record<string, unknown>)?.onboardingDraft : null,
    businessKind
  );
  const draft = mergeDraft({ ...current, businessKind }, patch);
  const seo = generateVendorSeo(draft);

  const slugBase = draft.step1.slug || slugify(draft.step1.businessName) || "vendor";
  let slug = slugBase;
  if (existing && existing.slug !== slug) {
    const taken = await prisma.vendorProfile.findFirst({
      where: { slug, NOT: { userId } },
    });
    if (taken) slug = `${slugBase}-${Date.now().toString(36).slice(-4)}`;
  } else if (!existing) {
    const taken = await prisma.vendorProfile.findUnique({ where: { slug } });
    if (taken) slug = `${slugBase}-${Date.now().toString(36).slice(-4)}`;
  }

  draft.step1.slug = slug;

  const metadata = {
    ...((existing?.metadata as Record<string, unknown>) ?? {}),
    businessKind,
    onboardingDraft: draft,
    onboardingStep: draft.currentStep,
    coverImageUrl: draft.step1.coverImageUrl ?? undefined,
    seo,
    searchOptimization: {
      specialties: draft.step7.specialties,
      keywords: draft.step7.keywords,
      styles: draft.step7.styles,
      tags: draft.step7.tags,
    },
    tagline: draft.step1.tagline,
    experience: draft.step1.yearsExperience,
    teamSize: draft.step1.teamSize,
    languages: draft.step1.languages,
    establishedYear: draft.step1.establishedYear,
    secondaryCategory: draft.step1.secondaryCategory,
    location: draft.step2,
    preferences: draft.step7,
    businessEmail: draft.step5.businessEmail,
    socialLinks: {
      instagram: draft.step5.instagram,
      facebook: draft.step5.facebook,
      tiktok: draft.step5.tiktok,
      youtube: draft.step5.youtube,
      website: draft.step5.website,
    },
    portfolioCategories: draft.step4.portfolioCategories,
  } as Prisma.InputJsonValue;

  const category = (draft.step1.category ||
    (businessKind === "VENUE" ? "VENUE" : "PHOTOGRAPHER")) as VendorCategory;

  const vendor = existing
    ? await prisma.vendorProfile.update({
        where: { userId },
        data: {
          businessName: draft.step1.businessName || existing.businessName,
          slug,
          bio: draft.step1.description || existing.bio,
          city: draft.step2.city || existing.city,
          country: draft.step2.country || existing.country,
          category,
          availability: {
            workingHours: draft.step6.workingHours,
            vacations: draft.step6.vacations,
            vacationMode: draft.step6.vacationMode,
            unavailableDates: draft.step6.unavailableDates,
          } as Prisma.InputJsonValue,
          metadata,
        },
      })
    : await prisma.vendorProfile.create({
        data: {
          userId,
          businessName: draft.step1.businessName || "My Business",
          slug,
          bio: draft.step1.description || null,
          city: draft.step2.city || "Lagos",
          country: draft.step2.country || "Nigeria",
          category,
          availability: {
            workingHours: draft.step6.workingHours,
            vacations: draft.step6.vacations,
            vacationMode: draft.step6.vacationMode,
            unavailableDates: draft.step6.unavailableDates,
          } as Prisma.InputJsonValue,
          metadata,
        },
      });

  if (draft.step1.avatarUrl !== undefined) {
    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: draft.step1.avatarUrl },
    });
  }

  return { draft, vendor };
}

export async function isSlugAvailable(slug: string, userId: string) {
  const normalized = slugify(slug);
  if (!normalized || normalized.length < 3) return { available: false, slug: normalized, reason: "too_short" };
  const taken = await prisma.vendorProfile.findFirst({
    where: { slug: normalized, NOT: { userId } },
  });
  return { available: !taken, slug: normalized };
}

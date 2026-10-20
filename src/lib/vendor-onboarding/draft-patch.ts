import { z } from "zod";
import { vendorPackageDraftsSchema } from "@/lib/vendor-onboarding/package-schema";
import type { VendorOnboardingDraft } from "@/lib/vendor-onboarding/types";

const faqDraftSchema = z.object({
  id: z.string().optional(),
  question: z.string().optional(),
  answer: z.string().optional(),
  sortOrder: z.number().int().optional(),
}).passthrough();

const serviceRequirementDraftSchema = z.union([
  z.string(),
  z.object({
    id: z.string().optional(),
    text: z.string().optional(),
    sortOrder: z.number().int().optional(),
  }).passthrough(),
]);

export const vendorDraftPatchSchema = z.object({
  businessKind: z.enum(["VENUE", "SERVICE"]),
  currentStep: z.number().int().min(1).max(8).optional(),
  step1: z.record(z.unknown()).optional(),
  step2: z.record(z.unknown()).optional(),
  step3: z.record(z.unknown()).optional(),
  step4: z.record(z.unknown()).optional(),
  step5: z.record(z.unknown()).optional(),
  step6: z.record(z.unknown()).optional(),
  step7: z.record(z.unknown()).optional(),
  step8: z.record(z.unknown()).optional(),
  packages: vendorPackageDraftsSchema.optional(),
  servicesOffered: z.array(z.string()).optional(),
  faqs: z.array(faqDraftSchema).optional(),
  serviceRequirements: z.array(serviceRequirementDraftSchema).optional(),
});

export type VendorDraftPatch = z.infer<typeof vendorDraftPatchSchema>;

export function profileDraftPatchForBusinessKind(
  businessKind: VendorDraftPatch["businessKind"],
  patch: Omit<VendorDraftPatch, "businessKind">
): Partial<VendorOnboardingDraft> {
  if (businessKind === "SERVICE") return patch as Partial<VendorOnboardingDraft>;

  // These top-level profile fields were not part of venue draft persistence.
  const venuePatch = { ...patch };
  delete venuePatch.servicesOffered;
  delete venuePatch.faqs;
  delete venuePatch.serviceRequirements;
  return venuePatch as Partial<VendorOnboardingDraft>;
}

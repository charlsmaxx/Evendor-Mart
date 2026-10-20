import {
  normalizeFaqs,
  normalizeServiceRequirements,
  normalizeServicesOffered,
} from "@/lib/vendor-profile-content";
import type { BusinessKind } from "@/lib/vendor-onboarding/types";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function hasOwn(record: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

/** Fill older service drafts from saved profile content without overriding draft edits. */
export function restoreServiceProfileContentDraft(
  rawDraft: unknown,
  metadata: unknown,
  businessKind: BusinessKind
) {
  if (businessKind !== "SERVICE") return rawDraft;

  const draft = asRecord(rawDraft);
  const savedProfile = asRecord(metadata);
  return {
    ...draft,
    servicesOffered: hasOwn(draft, "servicesOffered")
      ? draft.servicesOffered
      : normalizeServicesOffered(savedProfile.servicesOffered),
    faqs: hasOwn(draft, "faqs")
      ? draft.faqs
      : normalizeFaqs(savedProfile.faqs),
    serviceRequirements: hasOwn(draft, "serviceRequirements")
      ? draft.serviceRequirements
      : normalizeServiceRequirements(savedProfile.serviceRequirements),
  };
}

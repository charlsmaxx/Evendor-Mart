import type { VendorOnboardingDraft } from "@/lib/vendor-onboarding/types";

export type CompletionItem = {
  id: string;
  label: string;
  done: boolean;
  weight: number;
};

export type BusinessHealthResult = {
  score: number;
  label: "Getting started" | "Good" | "Excellent";
  items: CompletionItem[];
};

export function calculateBusinessHealth(draft: VendorOnboardingDraft): BusinessHealthResult {
  const items: CompletionItem[] = [
    {
      id: "business-name",
      label: "Add business name",
      done: draft.step1.businessName.trim().length >= 2,
      weight: 8,
    },
    {
      id: "cover",
      label: "Upload cover image",
      done: Boolean(draft.step1.coverImageUrl),
      weight: 10,
    },
    {
      id: "logo",
      label: "Upload profile image",
      done: Boolean(draft.step1.avatarUrl),
      weight: 8,
    },
    {
      id: "description",
      label: "Write business description",
      done: draft.step1.description.trim().length >= 40,
      weight: 10,
    },
    {
      id: "location",
      label: "Complete location details",
      done: Boolean(draft.step2.city && draft.step2.address),
      weight: 10,
    },
    {
      id: "services",
      label: "Complete service pricing",
      done: draft.step3.services.some((s) => s.name && s.priceMin > 0),
      weight: 12,
    },
    {
      id: "portfolio",
      label: "Add 5+ portfolio images",
      done: draft.step4.featuredImages.length >= 5,
      weight: 12,
    },
    {
      id: "portfolio-min",
      label: "Add portfolio images",
      done: draft.step4.featuredImages.length >= 1,
      weight: 6,
    },
    {
      id: "social",
      label: "Add social links",
      done: Boolean(draft.step5.instagram || draft.step5.facebook || draft.step5.tiktok),
      weight: 6,
    },
    {
      id: "availability",
      label: "Set working hours",
      done: Object.values(draft.step6.workingHours).some((d) => d.enabled),
      weight: 8,
    },
    {
      id: "preferences",
      label: "Set booking preferences",
      done: draft.step7.depositPercent > 0,
      weight: 6,
    },
    {
      id: "bank",
      label: "Verify bank account",
      done: Boolean(draft.step8.accountName),
      weight: 14,
    },
    {
      id: "slug",
      label: "Set profile URL",
      done: draft.step1.slug.length >= 3,
      weight: 4,
    },
    {
      id: "search-tags",
      label: "Add specialties or tags",
      done: draft.step7.specialties.length > 0 || draft.step7.tags.length > 0,
      weight: 6,
    },
  ];

  const applicable = items.filter((item) => {
    if (item.id === "portfolio-min" && items.find((i) => i.id === "portfolio")?.done) return false;
    return true;
  });

  const totalWeight = applicable.reduce((s, i) => s + i.weight, 0);
  const earned = applicable.reduce((s, i) => s + (i.done ? i.weight : 0), 0);
  const score = totalWeight ? Math.round((earned / totalWeight) * 100) : 0;

  let label: BusinessHealthResult["label"] = "Getting started";
  if (score >= 85) label = "Excellent";
  else if (score >= 60) label = "Good";

  return { score, label, items: applicable };
}

export function stepCompletionPercent(step: number, draft: VendorOnboardingDraft): number {
  const health = calculateBusinessHealth(draft);
  const stepWeights: Record<number, string[]> = {
    1: ["business-name", "logo", "cover", "description", "slug"],
    2: ["location"],
    3: ["services"],
    4: ["portfolio", "portfolio-min"],
    5: ["social"],
    6: ["availability"],
    7: ["preferences", "search-tags"],
    8: ["bank"],
  };
  const ids = stepWeights[step] ?? [];
  const relevant = health.items.filter((i) => ids.includes(i.id));
  if (!relevant.length) return step <= draft.currentStep ? 100 : 0;
  const w = relevant.reduce((s, i) => s + i.weight, 0);
  const e = relevant.reduce((s, i) => s + (i.done ? i.weight : 0), 0);
  return w ? Math.round((e / w) * 100) : 0;
}

import type { UploadedMedia } from "@/lib/vendor-media";
import type { VendorAvailabilitySettings } from "@/lib/vendor-availability";
import type { BankAccountInput } from "@/lib/validations/bank";
import { SERVICE_VENDOR_CATEGORY_OPTIONS } from "@/lib/categories";

export const ONBOARDING_TOTAL_STEPS = 8;

export type BusinessKind = "VENUE" | "SERVICE";

export type VendorServiceItem = {
  id: string;
  name: string;
  description: string;
  priceMin: number;
  priceMax?: number;
  duration?: string;
  included: string[];
  addOns: string[];
  images: UploadedMedia[];
  badge?: "popular" | "best_value" | "premium" | "";
};

export type Step1Business = {
  businessName: string;
  slug: string;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  category: string;
  secondaryCategory?: string;
  tagline: string;
  description: string;
  yearsExperience: string;
  teamSize: string;
  languages: string[];
  establishedYear: string;
};

export type Step2Location = {
  country: string;
  state: string;
  city: string;
  address: string;
  mapUrl: string;
  serviceRadiusKm: string;
  travelsOutsideCity: boolean;
  travelsOutsideState: boolean;
  travelFeePolicy: string;
};

export type Step3Services = {
  services: VendorServiceItem[];
  capacity?: number;
  amenities?: string[];
  venueServices?: string[];
  termsAndConditions?: string;
};

export type Step4Portfolio = {
  featuredImages: UploadedMedia[];
  featuredClips: UploadedMedia[];
  portfolioCategories: string[];
};

export type Step5BusinessDetails = {
  businessEmail: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  youtube: string;
  website: string;
};

export type Step6Availability = VendorAvailabilitySettings;

export type Step7Preferences = {
  bookingApproval: "instant" | "approval_required";
  minimumNoticeHours: number;
  maxAdvanceBookingDays: number;
  cancellationPolicy: string;
  reschedulePolicy: string;
  preferredEventTypes: string[];
  preferredBudgetMin: number;
  preferredBudgetMax: number;
  specialties: string[];
  keywords: string[];
  styles: string[];
  tags: string[];
};

export type Step8Payouts = Partial<BankAccountInput> & { accountName?: string };

export type VendorOnboardingDraft = {
  businessKind: BusinessKind;
  currentStep: number;
  step1: Step1Business;
  step2: Step2Location;
  step3: Step3Services;
  step4: Step4Portfolio;
  step5: Step5BusinessDetails;
  step6: Step6Availability;
  step7: Step7Preferences;
  step8: Step8Payouts;
  updatedAt: string;
};

export const PORTFOLIO_CATEGORIES = [
  "Wedding",
  "Birthday",
  "Corporate",
  "Traditional Marriage",
  "Baby Shower",
  "Outdoor",
  "Bridal Shower",
  "Graduation",
] as const;

export const SERVICE_VENDOR_CATEGORIES = SERVICE_VENDOR_CATEGORY_OPTIONS.map((c) => ({
  value: c.value,
  label: c.label,
}));

export const SPECIALTY_SUGGESTIONS = [
  "Luxury Weddings",
  "Outdoor Events",
  "Minimalist Decor",
  "Traditional Weddings",
  "Corporate Events",
  "Birthday Parties",
  "Destination Events",
] as const;

export function createEmptyService(): VendorServiceItem {
  return {
    id: `svc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: "",
    description: "",
    priceMin: 0,
    included: [],
    addOns: [],
    images: [],
    badge: "",
  };
}

export function defaultDraft(businessKind: BusinessKind): VendorOnboardingDraft {
  const category = businessKind === "VENUE" ? "VENUE" : "PHOTOGRAPHER";
  return {
    businessKind,
    currentStep: 1,
    step1: {
      businessName: "",
      slug: "",
      avatarUrl: null,
      coverImageUrl: null,
      category,
      secondaryCategory: "",
      tagline: "",
      description: "",
      yearsExperience: "",
      teamSize: "",
      languages: ["English"],
      establishedYear: "",
    },
    step2: {
      country: "Nigeria",
      state: "",
      city: "",
      address: "",
      mapUrl: "",
      serviceRadiusKm: "25",
      travelsOutsideCity: false,
      travelsOutsideState: false,
      travelFeePolicy: "",
    },
    step3: {
      services: [createEmptyService()],
      capacity: undefined,
      amenities: [],
      venueServices: [],
      termsAndConditions: "",
    },
    step4: {
      featuredImages: [],
      featuredClips: [],
      portfolioCategories: [],
    },
    step5: {
      businessEmail: "",
      instagram: "",
      facebook: "",
      tiktok: "",
      youtube: "",
      website: "",
    },
    step6: {
      workingHours: {
        monday: { enabled: true, start: "09:00", end: "18:00" },
        tuesday: { enabled: true, start: "09:00", end: "18:00" },
        wednesday: { enabled: true, start: "09:00", end: "18:00" },
        thursday: { enabled: true, start: "09:00", end: "18:00" },
        friday: { enabled: true, start: "09:00", end: "18:00" },
        saturday: { enabled: true, start: "10:00", end: "16:00" },
        sunday: { enabled: false, start: "10:00", end: "16:00" },
      },
      vacations: [],
      vacationMode: false,
      unavailableDates: [],
    },
    step7: {
      bookingApproval: "approval_required",
      minimumNoticeHours: 48,
      maxAdvanceBookingDays: 365,
      cancellationPolicy: "",
      reschedulePolicy: "",
      preferredEventTypes: [],
      preferredBudgetMin: 0,
      preferredBudgetMax: 0,
      specialties: [],
      keywords: [],
      styles: [],
      tags: [],
    },
    step8: {},
    updatedAt: new Date().toISOString(),
  };
}

export function mergeDraft(
  base: VendorOnboardingDraft,
  patch: Partial<VendorOnboardingDraft>
): VendorOnboardingDraft {
  return {
    ...base,
    ...patch,
    step1: { ...base.step1, ...patch.step1 },
    step2: { ...base.step2, ...patch.step2 },
    step3: { ...base.step3, ...patch.step3 },
    step4: { ...base.step4, ...patch.step4 },
    step5: { ...base.step5, ...patch.step5 },
    step6: { ...base.step6, ...patch.step6 },
    step7: { ...base.step7, ...patch.step7 },
    step8: { ...base.step8, ...patch.step8 },
    updatedAt: new Date().toISOString(),
  };
}

export function parseDraft(raw: unknown, businessKind: BusinessKind): VendorOnboardingDraft {
  const base = defaultDraft(businessKind);
  if (!raw || typeof raw !== "object") return base;
  const d = raw as Partial<VendorOnboardingDraft>;
  return mergeDraft(base, d);
}

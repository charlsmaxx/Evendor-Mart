"use client";

import dynamic from "next/dynamic";
import { OnboardingStepSkeleton } from "@/components/loading/onboarding-step-skeleton";
import type { VendorOnboardingDraft } from "@/lib/vendor-onboarding/types";

const Step1Business = dynamic(
  () => import("./onboarding-step-panels").then((m) => ({ default: m.Step1Business })),
  { loading: () => <OnboardingStepSkeleton /> }
);
const Step2Location = dynamic(
  () => import("./onboarding-step-panels").then((m) => ({ default: m.Step2Location })),
  { loading: () => <OnboardingStepSkeleton /> }
);
const Step3Services = dynamic(
  () => import("./onboarding-step-panels").then((m) => ({ default: m.Step3Services })),
  { loading: () => <OnboardingStepSkeleton /> }
);
const Step4Portfolio = dynamic(
  () => import("./onboarding-step-panels").then((m) => ({ default: m.Step4Portfolio })),
  { loading: () => <OnboardingStepSkeleton /> }
);
const Step5BusinessDetails = dynamic(
  () => import("./onboarding-step-panels").then((m) => ({ default: m.Step5BusinessDetails })),
  { loading: () => <OnboardingStepSkeleton /> }
);
const Step6Availability = dynamic(
  () => import("./onboarding-step-panels").then((m) => ({ default: m.Step6Availability })),
  { loading: () => <OnboardingStepSkeleton /> }
);
const Step7Preferences = dynamic(
  () => import("./onboarding-step-panels").then((m) => ({ default: m.Step7Preferences })),
  { loading: () => <OnboardingStepSkeleton /> }
);
const Step8Payouts = dynamic(
  () => import("./onboarding-step-panels").then((m) => ({ default: m.Step8Payouts })),
  { loading: () => <OnboardingStepSkeleton /> }
);

type StepProps = {
  draft: VendorOnboardingDraft;
  update: (patch: Partial<VendorOnboardingDraft>) => void;
  isVenue?: boolean;
};

export function OnboardingStepLoader({ step, draft, update, isVenue }: StepProps & { step: number }) {
  switch (step) {
    case 1:
      return <Step1Business draft={draft} update={update} isVenue={!!isVenue} />;
    case 2:
      return <Step2Location draft={draft} update={update} />;
    case 3:
      return <Step3Services draft={draft} update={update} isVenue={!!isVenue} />;
    case 4:
      return <Step4Portfolio draft={draft} update={update} />;
    case 5:
      return <Step5BusinessDetails draft={draft} update={update} />;
    case 6:
      return <Step6Availability draft={draft} update={update} />;
    case 7:
      return <Step7Preferences draft={draft} update={update} />;
    case 8:
      return <Step8Payouts draft={draft} update={update} />;
    default:
      return null;
  }
}

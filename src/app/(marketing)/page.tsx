import dynamic from "next/dynamic";
import { HeroSection } from "@/components/marketing/hero-section";
import { SocialProofSection } from "@/components/marketing/social-proof-section";
import { ProblemSection } from "@/components/marketing/problem-section";

/** ISR: homepage shell + featured vendors refresh every 5 minutes. */
export const revalidate = 300;

const SolutionSection = dynamic(() =>
  import("@/components/marketing/solution-section").then((m) => ({ default: m.SolutionSection }))
);
const CategoryShowcase = dynamic(() =>
  import("@/components/marketing/category-showcase").then((m) => ({ default: m.CategoryShowcase }))
);
const HowItWorksSection = dynamic(() =>
  import("@/components/marketing/how-it-works-section").then((m) => ({ default: m.HowItWorksSection }))
);
const FeaturedVendorsSection = dynamic(() =>
  import("@/components/marketing/featured-vendors-section").then((m) => ({
    default: m.FeaturedVendorsSection,
  }))
);
const TestimonialsSection = dynamic(() =>
  import("@/components/marketing/testimonials-section").then((m) => ({ default: m.TestimonialsSection }))
);
const RewardsSection = dynamic(() =>
  import("@/components/marketing/rewards-section").then((m) => ({ default: m.RewardsSection }))
);
const MobilePreviewSection = dynamic(() =>
  import("@/components/marketing/mobile-preview-section").then((m) => ({
    default: m.MobilePreviewSection,
  }))
);
const CtaSection = dynamic(() =>
  import("@/components/marketing/cta-section").then((m) => ({ default: m.CtaSection }))
);
const SiteFooter = dynamic(() =>
  import("@/components/marketing/site-footer").then((m) => ({ default: m.SiteFooter }))
);

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <SocialProofSection />
      <ProblemSection />
      <SolutionSection />
      <CategoryShowcase />
      <HowItWorksSection />
      <FeaturedVendorsSection />
      <TestimonialsSection />
      <RewardsSection />
      <MobilePreviewSection />
      <CtaSection />
      <SiteFooter />
    </>
  );
}

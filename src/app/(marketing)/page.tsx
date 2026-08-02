import dynamic from "next/dynamic";
import { HeroSection } from "@/components/marketing/hero-section";
import { HeroCtaSection } from "@/components/marketing/hero-cta-section";
import { SocialProofSection } from "@/components/marketing/social-proof-section";
import { ProblemSection } from "@/components/marketing/problem-section";

/** ISR: homepage shell + featured vendors refresh every 5 minutes. */
export const revalidate = 300;

const SolutionSection = dynamic(() =>
  import("@/components/marketing/solution-section").then((m) => ({ default: m.SolutionSection }))
);
const StayAheadSection = dynamic(() =>
  import("@/components/marketing/solution-section").then((m) => ({ default: m.StayAheadSection }))
);
const CategoryShowcase = dynamic(() =>
  import("@/components/marketing/category-showcase").then((m) => ({ default: m.CategoryShowcase }))
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
const CtaSection = dynamic(() =>
  import("@/components/marketing/cta-section").then((m) => ({ default: m.CtaSection }))
);
const EventWebsiteSection = dynamic(() =>
  import("@/components/marketing/event-website-section").then((m) => ({
    default: m.EventWebsiteSection,
  }))
);
const SiteFooter = dynamic(() =>
  import("@/components/marketing/site-footer").then((m) => ({ default: m.SiteFooter }))
);

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <HeroCtaSection />
      <ProblemSection />
      <SocialProofSection />
      <SolutionSection />
      <FeaturedVendorsSection />
      <CategoryShowcase />
      <TestimonialsSection />
      <StayAheadSection />
      <RewardsSection />
      <CtaSection />
      <EventWebsiteSection />
      <SiteFooter />
    </>
  );
}

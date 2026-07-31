import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { AboutHeroSection } from "@/components/marketing/about/about-hero-section";
import { AboutWhyExistSection } from "@/components/marketing/about/about-why-exist-section";
import { AboutStorySection } from "@/components/marketing/about/about-story-section";

export const metadata: Metadata = {
  title: "About",
  description:
    "Evendor is building Africa's trusted event marketplace—helping people discover venues and vendors, book with confidence, and celebrate without the chaos.",
  openGraph: {
    title: "About Evendor",
    description:
      "Why Evendor exists, how we work, and our vision for the future of event planning across Africa.",
  },
};

const AboutWhatWeDoSection = dynamic(() =>
  import("@/components/marketing/about/about-what-we-do-section").then((m) => ({
    default: m.AboutWhatWeDoSection,
  }))
);
const AboutWhyChooseSection = dynamic(() =>
  import("@/components/marketing/about/about-why-choose-section").then((m) => ({
    default: m.AboutWhyChooseSection,
  }))
);
const AboutBuiltForSection = dynamic(() =>
  import("@/components/marketing/about/about-built-for-section").then((m) => ({
    default: m.AboutBuiltForSection,
  }))
);
const AboutValuesSection = dynamic(() =>
  import("@/components/marketing/about/about-values-section").then((m) => ({
    default: m.AboutValuesSection,
  }))
);
const AboutVisionSection = dynamic(() =>
  import("@/components/marketing/about/about-vision-section").then((m) => ({
    default: m.AboutVisionSection,
  }))
);
const AboutCtaSection = dynamic(() =>
  import("@/components/marketing/about/about-cta-section").then((m) => ({
    default: m.AboutCtaSection,
  }))
);
const SiteFooter = dynamic(() =>
  import("@/components/marketing/site-footer").then((m) => ({ default: m.SiteFooter }))
);

export default function AboutPage() {
  return (
    <>
      <AboutHeroSection />
      <AboutWhyExistSection />
      <AboutStorySection />
      <AboutWhatWeDoSection />
      <AboutWhyChooseSection />
      <AboutBuiltForSection />
      <AboutValuesSection />
      <AboutVisionSection />
      <AboutCtaSection />
      <SiteFooter />
    </>
  );
}

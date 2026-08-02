import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { HowItWorksSection } from "@/components/marketing/how-it-works-section";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "Discover, compare, and book verified event vendors and venues on Evendor — with payments held in escrow until the job is done.",
  openGraph: {
    title: "How Evendor works",
    description:
      "Browse verified vendors, compare options, and book with escrow-protected payments.",
  },
};

const CtaSection = dynamic(() =>
  import("@/components/marketing/cta-section").then((m) => ({ default: m.CtaSection }))
);
const SiteFooter = dynamic(() =>
  import("@/components/marketing/site-footer").then((m) => ({ default: m.SiteFooter }))
);

export default function HowItWorksPage() {
  return (
    <>
      <div className="pt-8 md:pt-12">
        <HowItWorksSection />
      </div>
      <CtaSection />
      <SiteFooter />
    </>
  );
}

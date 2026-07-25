import { SectionShell } from "@/components/shared/section-shell";
import { GlowButton } from "@/components/shared/glow-button";

export function CtaSection() {
  return (
    <SectionShell id="cta" className="pb-32">
      <div className="glass mx-auto max-w-3xl rounded-3xl border border-border bg-card p-12 text-center shadow-sm">
        <h2 className="font-display text-3xl font-bold md:text-4xl">Ready to plan smarter?</h2>
        <p className="mt-4 text-muted-foreground">Join thousands planning unforgettable events across Africa.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <GlowButton href="/register?redirect=/dashboard">Get Started</GlowButton>
          <GlowButton href="/list-your-business" variant="outline">Become a Vendor</GlowButton>
        </div>
      </div>
    </SectionShell>
  );
}

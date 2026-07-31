import { SectionShell } from "@/components/shared/section-shell";
import { GlowButton } from "@/components/shared/glow-button";

export function AboutCtaSection() {
  return (
    <SectionShell id="about-cta" className="pb-28 md:pb-32">
      <div className="glass mx-auto max-w-3xl rounded-3xl border border-border bg-card p-10 text-center shadow-sm md:p-14">
        <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          Ready to plan your next event?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground md:text-lg">
          Start exploring trusted event halls and professionals—or list your business and grow with
          Africa&apos;s modern event marketplace.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <GlowButton href="/marketplace">Explore Vendors</GlowButton>
          <GlowButton href="/marketplace?category=venues" variant="outline">
            Explore Event Halls
          </GlowButton>
          <GlowButton href="/list-your-business" variant="outline">
            Become a Vendor
          </GlowButton>
        </div>
      </div>
    </SectionShell>
  );
}

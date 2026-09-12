import { SectionShell } from "@/components/shared/section-shell";
import { VendorCard } from "@/components/marketplace/vendor-card";
import { getFeaturedVendors } from "@/core/search-engine/listings";
import { GlowButton } from "@/components/shared/glow-button";

export async function FeaturedVendorsSection() {
  const listings = await getFeaturedVendors(4);

  return (
    <SectionShell id="featured">
      <div className="text-center sm:text-left">
        <h2 className="font-display text-3xl font-bold md:text-4xl">Featured vendors</h2>
        <p className="mt-2 text-muted-foreground">
          Hand-picked partners trusted by thousands of events.
        </p>
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {listings.map((l) => (
          <VendorCard
            key={l.id}
            listing={l}
            showSave
            hideTypeAndFeaturedBadges
          />
        ))}
      </div>
      <div className="mt-10 flex justify-center">
        <GlowButton href="/marketplace" variant="outline">
          View all
        </GlowButton>
      </div>
    </SectionShell>
  );
}

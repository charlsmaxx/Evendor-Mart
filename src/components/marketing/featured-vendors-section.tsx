import { SectionShell } from "@/components/shared/section-shell";
import { VendorCard } from "@/components/marketplace/vendor-card";
import { getFeaturedListings } from "@/lib/listings";
import { GlowButton } from "@/components/shared/glow-button";

export async function FeaturedVendorsSection() {
  const listings = await getFeaturedListings(4);

  return (
    <SectionShell id="featured">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-3xl font-bold md:text-4xl">Featured vendors</h2>
          <p className="mt-2 text-muted-foreground">Hand-picked partners trusted by thousands of events.</p>
        </div>
        <GlowButton href="/marketplace" variant="outline">View all</GlowButton>
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {listings.map((l) => (
          <VendorCard key={l.id} listing={l} />
        ))}
      </div>
    </SectionShell>
  );
}

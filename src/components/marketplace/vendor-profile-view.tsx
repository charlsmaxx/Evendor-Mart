import { OptimizedImage } from "@/components/ui/optimized-image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatPriceRange } from "@/lib/utils";
import { ListingActions } from "@/components/marketplace/listing-actions";
import { ListingPortfolio, ListingReviews } from "@/components/marketplace/listing-gallery";
import { VendorPackagesSection } from "@/components/marketplace/vendor-packages";
import { VendorMessageButton } from "@/components/marketplace/vendor-message-button";
import { ShareListingButton } from "@/components/marketplace/share-listing-button";
import { MapPin, Star, BadgeCheck, Briefcase } from "lucide-react";
import type { getVendorPublicProfile } from "@/lib/vendor-profile";

type ProfileData = NonNullable<Awaited<ReturnType<typeof getVendorPublicProfile>>>;

export function VendorProfileView({ data }: { data: ProfileData }) {
  const { vendor, primaryListing, coverImage, avatarUrl, allReviews, ratingAvg, reviewCount, packages, about } = data;

  const portfolioItems = [
    ...vendor.portfolioMedia,
    ...vendor.listings.flatMap((l) => l.portfolioMedia),
  ].filter((item, index, arr) => arr.findIndex((x) => x.id === item.id) === index);

  const categoryLabel = vendor.listings[0]?.category?.name ?? vendor.category.replace(/_/g, " ");

  return (
    <div className="-mx-4 sm:mx-0">
      {/* Cover photo */}
      <div className="relative h-48 w-full overflow-hidden sm:h-64 md:h-72 md:rounded-2xl">
        <OptimizedImage
          src={coverImage}
          preset="cover"
          alt={`${vendor.businessName} cover`}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      </div>

      {/* Profile header */}
      <div className="relative px-4 sm:px-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="-mt-12 flex items-end gap-4">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-4 border-background bg-primary/10 shadow-lg">
              {avatarUrl ? (
                <OptimizedImage
                  src={avatarUrl}
                  preset="avatar"
                  alt={vendor.businessName}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-primary">
                  {vendor.businessName.charAt(0)}
                </div>
              )}
            </div>
            <div className="pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-bold md:text-3xl">{vendor.businessName}</h1>
                {vendor.verified && (
                  <Badge variant="verified">
                    <BadgeCheck className="h-3 w-3" /> Verified
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground capitalize">{categoryLabel}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pb-1">
            <VendorMessageButton
              vendorId={vendor.id}
              listingId={primaryListing?.id}
              vendorSlug={vendor.slug}
              label="Chat vendor"
            />
            <ShareListingButton title={vendor.businessName} variant="outline" />
            {vendor.listings[0]?.category?.slug && (
              <Link href={`/marketplace?category=${vendor.listings[0].category.slug}`}>
                <Badge variant="secondary" className="cursor-pointer px-3 py-2">
                  View category
                </Badge>
              </Link>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-6 flex flex-wrap gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" /> {vendor.city}
          </span>
          <span className="flex items-center gap-1.5 text-amber-500">
            <Star className="h-4 w-4 fill-amber-400" />
            {ratingAvg.toFixed(1)} ({reviewCount} reviews)
          </span>
          <span className="flex items-center gap-1.5">
            <Briefcase className="h-4 w-4" /> {vendor.listings.length} listing
            {vendor.listings.length !== 1 ? "s" : ""}
          </span>
        </div>

        {about?.tagline && (
          <p className="mt-4 text-lg font-medium text-foreground">{about.tagline}</p>
        )}
      </div>

      <section className="mt-10 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-xl font-semibold">About the vendor</h2>
        {vendor.bio ? (
          <p className="mt-4 whitespace-pre-wrap leading-relaxed text-muted-foreground">{vendor.bio}</p>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">This vendor is setting up their profile on Evendor.</p>
        )}
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          {about?.experience && <span>{about.experience} experience</span>}
          {about?.teamSize && <span>Team: {about.teamSize}</span>}
          {about?.establishedYear && <span>Est. {about.establishedYear}</span>}
          {about?.languages?.length ? <span>Speaks: {about.languages.join(", ")}</span> : null}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Message this vendor through Evendor Chat — direct phone and email are not shared for your protection.
        </p>
      </section>

      {primaryListing ? (
        <section className="mt-10 rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-semibold">Featured service</h2>
              <Link href={`/listings/${primaryListing.slug}`} className="mt-1 block text-sm text-primary hover:underline">
                {primaryListing.title} →
              </Link>
            </div>
          </div>
          <p className="mt-3 text-lg font-medium text-primary">
            {formatPriceRange(primaryListing.priceMin, primaryListing.priceMax)}
          </p>
          <p className="mt-4 text-muted-foreground">{primaryListing.description}</p>
          <div className="mt-6">
            <ListingActions
              listingId={primaryListing.id}
              listingSlug={primaryListing.slug}
              listingTitle={primaryListing.title}
              vendorId={vendor.id}
              slug={vendor.slug}
              priceMin={primaryListing.priceMin}
              priceMax={primaryListing.priceMax}
              isVenue={primaryListing.type === "VENUE"}
            />
          </div>
        </section>
      ) : (
        <section className="mt-10 rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center text-muted-foreground">
          <p className="font-medium">Services coming soon</p>
          <p className="mt-1 text-sm">Message this vendor to discuss your event needs.</p>
        </section>
      )}

      <VendorPackagesSection packages={packages} />

      {/* All listings */}
      {vendor.listings.length > 1 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold">All services</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {vendor.listings.map((l) => (
              <Link
                key={l.id}
                href={`/listings/${l.slug}`}
                className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
              >
                <p className="font-semibold">{l.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{l.category.name}</p>
                <p className="mt-2 text-sm font-medium text-primary">
                  {formatPriceRange(l.priceMin, l.priceMax)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <ListingPortfolio items={portfolioItems} />
      <ListingReviews
        reviews={allReviews}
        ratingAvg={ratingAvg}
        reviewCount={reviewCount}
        className="mt-10"
      />
    </div>
  );
}

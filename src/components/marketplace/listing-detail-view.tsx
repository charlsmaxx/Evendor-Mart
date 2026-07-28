import Link from "next/link";
import { BadgeCheck, MapPin, Star, Users, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPriceRange } from "@/lib/utils";
import { resolvePublicListingCover, getVendorProfileImages } from "@/lib/images";
import { parseListingMetadata } from "@/lib/listing-metadata";
import { getEnabledPackages } from "@/lib/vendor-packages";
import { ListingGalleryHero } from "@/components/marketplace/listing-gallery-hero";
import { ListingActions } from "@/components/marketplace/listing-actions";
import { ListingPortfolio, ListingReviews } from "@/components/marketplace/listing-gallery";
import { VendorPackagesSection } from "@/components/marketplace/vendor-packages";
import { ShareListingButton } from "@/components/marketplace/share-listing-button";
import { VenueOfferingsDisplay } from "@/components/marketplace/venue-offerings-display";
import type { getPublishedListingBySlug } from "@/core/search-engine/listings";

type ListingData = NonNullable<Awaited<ReturnType<typeof getPublishedListingBySlug>>>;

function collectGalleryImages(listing: ListingData) {
  const vendorImages = getVendorProfileImages(listing.vendor.metadata);
  const vendorCover = vendorImages.coverImageUrl;
  const avatar = listing.vendor.user?.avatarUrl;

  const fromPortfolio = listing.portfolioMedia.map((m) => m.url);
  const fromVendor = listing.vendor.portfolioMedia.map((m) => m.url);
  const fromListing = [
    listing.coverImage,
    ...listing.images,
  ].filter((u): u is string => Boolean(u));

  const ordered = [
    ...(vendorCover ? [vendorCover] : []),
    ...fromListing,
    ...fromPortfolio,
    ...fromVendor,
    ...(avatar ? [avatar] : []),
  ];

  return ordered.filter((url, i, arr) => arr.indexOf(url) === i);
}

export function ListingDetailView({ listing }: { listing: ListingData }) {
  const { vendor } = listing;
  const meta = parseListingMetadata(listing.metadata);
  const packages = getEnabledPackages(vendor.metadata);
  const cover = resolvePublicListingCover(listing, vendor);
  const gallery = collectGalleryImages(listing);
  const amenities = listing.venueDetails?.amenities ?? [];
  const services = meta.services;
  const isVenue = listing.type === "VENUE";

  const portfolioItems = [
    ...listing.portfolioMedia,
    ...vendor.portfolioMedia.filter(
      (m) => !listing.portfolioMedia.some((lm) => lm.id === m.id)
    ),
  ];

  return (
    <div className="-mx-4 sm:mx-0">
      {/* Breadcrumb */}
      <nav className="mb-4 flex flex-wrap items-center gap-1 px-4 text-sm text-muted-foreground sm:px-0">
        <Link href="/marketplace" className="hover:text-foreground">
          Marketplace
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={`/marketplace?category=${listing.category.slug}`} className="hover:text-foreground">
          {listing.category.name}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="truncate text-foreground">{listing.title}</span>
      </nav>

      <div className="px-4 sm:px-0">
        <ListingGalleryHero images={gallery.length ? gallery : [cover]} title={listing.title} />
      </div>

      <div className="mt-8 grid gap-10 px-4 lg:grid-cols-[1fr_340px] lg:items-start lg:gap-12 sm:px-0">
        {/* Main content */}
        <div className="min-w-0 space-y-10">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="capitalize">
                {listing.type === "VENUE" ? "Event venue" : "Service"}
              </Badge>
              {listing.verified && (
                <Badge variant="verified">
                  <BadgeCheck className="h-3 w-3" /> Verified
                </Badge>
              )}
              {listing.featured && <Badge variant="featured">Featured</Badge>}
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold md:text-4xl">{listing.title}</h1>
            <p className="mt-1 text-muted-foreground">
              by{" "}
              <Link href={`/vendors/${vendor.slug}`} className="font-medium text-primary hover:underline">
                {vendor.businessName}
              </Link>
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-5 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {listing.venueDetails?.address ?? listing.city}
                </span>
                <span className="flex items-center gap-1.5 text-amber-500">
                  <Star className="h-4 w-4 fill-amber-400" />
                  {listing.ratingAvg.toFixed(1)} ({listing.reviewCount} reviews)
                </span>
                {isVenue && listing.venueDetails?.capacity ? (
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    Up to {listing.venueDetails.capacity} guests
                  </span>
                ) : null}
              </div>
              <ShareListingButton title={listing.title} className="hidden sm:inline-flex" />
            </div>

            {/* Mobile: price + actions under the title so customers don't scroll for them */}
            <div
              className="mt-5 rounded-2xl border border-border p-4 lg:hidden"
              style={{
                background:
                  "linear-gradient(135deg,rgba(122,46,61,0.04) 0%,rgba(229,223,217,0.12) 100%)",
              }}
            >
              <ListingActions
                listingId={listing.id}
                listingSlug={listing.slug}
                listingTitle={listing.title}
                vendorId={vendor.id}
                slug={vendor.slug}
                priceMin={listing.priceMin}
                priceMax={listing.priceMax}
                isVenue={isVenue}
                showPrice
                packages={packages}
                vendorCategory={vendor.category}
              />
            </div>
          </header>

          <section>
            <h2 className="font-display text-xl font-semibold">About this {isVenue ? "venue" : "service"}</h2>
            <p className="mt-4 whitespace-pre-wrap leading-relaxed text-muted-foreground">
              {listing.description}
            </p>
          </section>

          {isVenue && (
            <VenueOfferingsDisplay
              capacity={listing.venueDetails?.capacity}
              address={listing.venueDetails?.address}
              city={listing.city}
              amenities={amenities}
              services={services}
            />
          )}

          {!isVenue && services.length > 0 && (
            <section className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-xl font-semibold">Services included</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {services.map((s) => (
                  <Badge key={s} variant="secondary">{s}</Badge>
                ))}
              </div>
            </section>
          )}

          <VendorPackagesSection packages={packages} />

          <ListingPortfolio items={portfolioItems} />

          {meta.termsAndConditions && (
            <section className="rounded-2xl border border-border bg-muted/30 p-6">
              <h2 className="font-display text-xl font-semibold">Terms &amp; conditions</h2>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {meta.termsAndConditions}
              </p>
            </section>
          )}

          <ListingReviews
            reviews={listing.reviews}
            ratingAvg={listing.ratingAvg}
            reviewCount={listing.reviewCount}
          />
        </div>

        {/* Sticky booking sidebar — desktop; mobile uses the block under the title */}
        <aside className="hidden lg:sticky lg:top-24 lg:block">
          <div
            className="space-y-5 rounded-2xl border border-border p-6 shadow-sm"
            style={{
              background:
                "linear-gradient(135deg,rgba(122,46,61,0.04) 0%,rgba(229,223,217,0.12) 100%)",
            }}
          >
            <div>
              <p className="text-sm text-muted-foreground">Starting from</p>
              <p className="font-display text-2xl font-bold text-primary">
                {formatPriceRange(listing.priceMin, listing.priceMax)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {isVenue ? "Per event · paid in full to book" : "Custom packages available"}
              </p>
            </div>

            <ListingActions
              listingId={listing.id}
              listingSlug={listing.slug}
              listingTitle={listing.title}
              vendorId={vendor.id}
              slug={vendor.slug}
              priceMin={listing.priceMin}
              priceMax={listing.priceMax}
              isVenue={isVenue}
              packages={packages}
              vendorCategory={vendor.category}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

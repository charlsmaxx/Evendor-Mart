import { OptimizedImage } from "@/components/ui/optimized-image";
import Link from "next/link";
import { memo } from "react";
import { Star, MapPin, BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatStartingPrice } from "@/lib/utils";
import { DEFAULT_LISTING_COVER } from "@/lib/images";

export interface VendorCardData {
  id: string;
  slug: string;
  vendorSlug: string;
  title: string;
  city: string;
  coverImage?: string | null;
  priceMin: number;
  priceMax: number;
  ratingAvg: number;
  reviewCount: number;
  verified: boolean;
  featured: boolean;
  vendorName: string;
  type: "SERVICE" | "VENUE";
}

export const VendorCard = memo(function VendorCard({ listing }: { listing: VendorCardData }) {
  const href = `/listings/${listing.slug}`;
  const image = listing.coverImage || DEFAULT_LISTING_COVER;

  return (
    <Link href={href} className="group block">
      <article className="glass overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
        <div className="relative aspect-[4/3] overflow-hidden">
          <OptimizedImage
            src={image}
            preset="card"
            alt={listing.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute left-3 top-3 flex gap-2">
            <Badge variant="secondary" className="text-xs">
              {listing.type === "VENUE" ? "Venue" : "Vendor"}
            </Badge>
            {listing.verified && (
              <Badge variant="verified" className="gap-1">
                <BadgeCheck className="h-3 w-3" /> ✓ Verified
              </Badge>
            )}
            {listing.featured && <Badge variant="featured">Featured</Badge>}
          </div>
        </div>
        <div className="p-5">
          <p className="text-xs text-muted-foreground">{listing.vendorName}</p>
          <h3 className="mt-1 font-display text-lg font-semibold">{listing.title}</h3>
          <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {listing.city}
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <Star className="h-3.5 w-3.5 fill-amber-400" />
              {listing.ratingAvg.toFixed(1)} ({listing.reviewCount})
            </span>
          </div>
          <p className="mt-3 font-medium text-primary">
            {formatStartingPrice(listing.priceMin)}
          </p>
          <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary/80">
            🎁 Earn 2% Cashback
          </p>
        </div>
      </article>
    </Link>
  );
});

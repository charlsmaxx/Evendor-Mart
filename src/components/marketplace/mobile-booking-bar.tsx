"use client";

import { ListingActions } from "@/components/marketplace/listing-actions";
import type { VendorPackage } from "@/lib/vendor-packages";

type MobileBookingBarProps = {
  listingId: string;
  listingSlug: string;
  listingTitle: string;
  vendorId: string;
  slug: string;
  priceMin: number;
  priceMax: number;
  isVenue?: boolean;
  packages?: VendorPackage[];
  vendorCategory?: string | null;
  availableServices?: string[];
};

/** Fixed bottom action bar for mobile profile / listing pages. */
export function MobileBookingBar(props: MobileBookingBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md lg:hidden">
      <div className="mx-auto max-w-6xl safe-area-pb">
        <ListingActions {...props} variant="floating" />
      </div>
    </div>
  );
}

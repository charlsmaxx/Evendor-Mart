"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCompareStore } from "@/stores/compare-store";
import { GitCompare, Heart, MessageSquare, Calendar } from "lucide-react";
import { startVendorConversation } from "@/lib/start-conversation";
import { formatCurrency, formatPriceRange, cn } from "@/lib/utils";
import { calcCashback } from "@/lib/rewards-utils";
import { reportClientError } from "@/lib/client-error";
import { ShareListingButton } from "@/components/marketplace/share-listing-button";
import { BookingForm } from "@/components/marketplace/booking-form";
import type { VendorPackage } from "@/lib/vendor-packages";

interface ListingActionsProps {
  listingId: string;
  listingSlug: string;
  listingTitle: string;
  vendorId: string;
  slug: string;
  priceMin: number;
  priceMax: number;
  isVenue?: boolean;
  /** Show starting price above the action buttons */
  showPrice?: boolean;
  className?: string;
  packages?: VendorPackage[];
  vendorCategory?: string | null;
}

export function ListingActions({
  listingId,
  listingSlug,
  listingTitle,
  vendorId,
  priceMin,
  priceMax,
  slug,
  isVenue = false,
  showPrice = false,
  className,
  packages = [],
  vendorCategory,
}: ListingActionsProps) {
  const router = useRouter();
  const add = useCompareStore((s) => s.add);
  const compareItems = useCompareStore((s) => s.items);
  const [showBook, setShowBook] = useState(false);
  const [loading, setLoading] = useState(false);
  const [compareAdded, setCompareAdded] = useState(false);

  const inCompare = compareItems.some((i) => i.listingId === listingId);

  async function toggleFavorite() {
    await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    });
  }

  async function startChat() {
    setLoading(true);
    const result = await startVendorConversation({ vendorId, listingId, vendorSlug: slug, router });
    setLoading(false);
    if (!result.ok && result.error) reportClientError("messages", result.error);
  }

  function handleCompare() {
    const result = add(listingId, vendorId, isVenue ? "VENUE" : "SERVICE");
    if (result === "same-vendor") {
      reportClientError(
        "compare",
        isVenue
          ? "Compare other event centers on the platform — you can't add another listing from the same venue."
          : "You can only compare listings from different vendors."
      );
      return;
    }
    if (result === "duplicate") return;
    setCompareAdded(true);
    setTimeout(() => setCompareAdded(false), 2000);
  }

  return (
    <div className={cn("space-y-4", className)}>
      {showPrice && (
        <div>
          <p className="text-sm text-muted-foreground">Starting from</p>
          <p className="font-display text-xl font-bold text-primary sm:text-2xl">
            {formatPriceRange(priceMin, priceMax)}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="gradient" onClick={() => setShowBook(!showBook)}>
          <Calendar className="h-4 w-4" /> Book now
        </Button>
        <Button variant="outline" onClick={startChat} disabled={loading}>
          <MessageSquare className="h-4 w-4" /> {loading ? "Opening…" : "Chat vendor"}
        </Button>
        <ShareListingButton
          title={listingTitle}
          url={
            typeof window !== "undefined"
              ? `${window.location.origin}/listings/${listingSlug}`
              : undefined
          }
        />
        <Button variant="ghost" onClick={toggleFavorite}>
          <Heart className="h-4 w-4" /> Save
        </Button>
        <Button variant="ghost" onClick={handleCompare}>
          <GitCompare className="h-4 w-4" />{" "}
          {inCompare || compareAdded ? "In compare" : isVenue ? "Compare venues" : "Compare"}
        </Button>
      </div>

      <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
        🎁 Book this listing and earn{" "}
        <span className="underline decoration-dotted">
          {formatCurrency(calcCashback(priceMin))}+
        </span>{" "}
        in Evendor Rewards
      </p>

      {showBook && (
        <BookingForm
          listingId={listingId}
          priceMin={priceMin}
          priceMax={priceMax}
          isVenue={isVenue}
          packages={packages}
          vendorCategory={vendorCategory}
        />
      )}
    </div>
  );
}

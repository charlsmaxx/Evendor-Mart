"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCompareStore } from "@/stores/compare-store";
import { CalendarDays, GitCompare, Heart, MessageSquare, Calendar, FileText } from "lucide-react";
import { startVendorConversation } from "@/lib/start-conversation";
import { formatCurrency, cn } from "@/lib/utils";
import { reportClientError } from "@/lib/client-error";
import { ShareListingButton } from "@/components/marketplace/share-listing-button";
import { BookingDialog } from "@/components/marketplace/booking-dialog";
import { RequestQuoteDialog } from "@/components/marketplace/request-quote-dialog";
import { AvailabilityDialog } from "@/components/marketplace/availability-dialog";
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
  availableServices?: string[];
  /** Hide Book/Chat (used when those live in the floating mobile bar) */
  hidePrimaryActions?: boolean;
  /** Show Check availability button */
  showAvailability?: boolean;
  vendorAvailability?: unknown;
  /** Layout variant for sticky mobile chrome */
  variant?: "default" | "utility" | "floating";
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
  availableServices = [],
  hidePrimaryActions = false,
  showAvailability = false,
  vendorAvailability,
  variant = "default",
}: ListingActionsProps) {
  const router = useRouter();
  const add = useCompareStore((s) => s.add);
  const compareItems = useCompareStore((s) => s.items);
  const [showBook, setShowBook] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [compareAdded, setCompareAdded] = useState(false);
  const [saved, setSaved] = useState(false);

  const inCompare = compareItems.some((i) => i.listingId === listingId);

  async function toggleFavorite() {
    const res = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    });
    if (res.ok) setSaved(true);
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

  if (variant === "floating") {
    return (
      <>
        <div className={cn("flex w-full gap-2", className)}>
          <Button variant="gradient" className="flex-1" onClick={() => setShowBook(true)}>
            <Calendar className="h-4 w-4" /> Book now
          </Button>
          <Button variant="outline" className="flex-1" onClick={startChat} disabled={loading}>
            <MessageSquare className="h-4 w-4" /> {loading ? "…" : "Chat"}
          </Button>
          {!isVenue && (
            <Button variant="secondary" size="icon" onClick={() => setShowQuote(true)} aria-label="Request quote">
              <FileText className="h-4 w-4" />
            </Button>
          )}
        </div>
        <BookingDialog
          open={showBook}
          onOpenChange={setShowBook}
          listingId={listingId}
          priceMin={priceMin}
          priceMax={priceMax}
          isVenue={isVenue}
          packages={packages}
          vendorCategory={vendorCategory}
          availableServices={availableServices}
          title={isVenue ? "Book this venue" : "Book this service"}
        />
        {!isVenue && (
          <RequestQuoteDialog
            open={showQuote}
            onOpenChange={setShowQuote}
            vendorId={vendorId}
            listingId={listingId}
            listingTitle={listingTitle}
          />
        )}
      </>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {showPrice && (
        <div>
          <p className="text-sm text-muted-foreground">Starting from</p>
          <p className="font-display text-xl font-bold text-primary sm:text-2xl">
            {formatCurrency(priceMin)}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!hidePrimaryActions && (
          <>
            <Button variant="gradient" onClick={() => setShowBook(true)}>
              <Calendar className="h-4 w-4" /> Book now
            </Button>
            {!isVenue && (
              <Button variant="outline" onClick={() => setShowQuote(true)}>
                <FileText className="h-4 w-4" /> Request quote
              </Button>
            )}
            <Button variant="outline" onClick={startChat} disabled={loading}>
              <MessageSquare className="h-4 w-4" /> {loading ? "Opening…" : "Chat vendor"}
            </Button>
          </>
        )}
        {showAvailability && (
          <Button variant="outline" onClick={() => setAvailabilityOpen(true)}>
            <CalendarDays className="h-4 w-4" /> Check availability
          </Button>
        )}
        <ShareListingButton
          title={listingTitle}
          url={
            typeof window !== "undefined"
              ? `${window.location.origin}/listings/${listingSlug}`
              : undefined
          }
        />
        <Button variant="ghost" onClick={toggleFavorite}>
          <Heart className={cn("h-4 w-4", saved && "fill-primary text-primary")} />{" "}
          {saved ? "Saved" : "Save"}
        </Button>
        <Button variant="ghost" onClick={handleCompare}>
          <GitCompare className="h-4 w-4" />{" "}
          {inCompare || compareAdded ? "In compare" : isVenue ? "Compare venues" : "Compare"}
        </Button>
      </div>

      <BookingDialog
        open={showBook}
        onOpenChange={setShowBook}
        listingId={listingId}
        priceMin={priceMin}
        priceMax={priceMax}
        isVenue={isVenue}
        packages={packages}
        vendorCategory={vendorCategory}
        availableServices={availableServices}
        title={isVenue ? "Book this venue" : "Book this service"}
      />

      {!isVenue && (
        <RequestQuoteDialog
          open={showQuote}
          onOpenChange={setShowQuote}
          vendorId={vendorId}
          listingId={listingId}
          listingTitle={listingTitle}
        />
      )}

      {showAvailability && (
        <AvailabilityDialog
          open={availabilityOpen}
          onOpenChange={setAvailabilityOpen}
          vendorId={vendorId}
          availability={vendorAvailability}
          onBook={() => {
            setAvailabilityOpen(false);
            setShowBook(true);
          }}
        />
      )}
    </div>
  );
}

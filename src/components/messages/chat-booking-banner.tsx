"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, Download, ExternalLink, CalendarPlus } from "lucide-react";

export type ChatRelatedBooking = {
  id: string;
  status: string;
  listingTitle: string;
  eventDate: string;
  canConfirm: boolean;
  canDispute: boolean;
  hasReceipt: boolean;
};

export type ChatBookListing = {
  id: string;
  title: string;
  slug: string;
  priceMin: number;
  priceMax: number;
  isVenue: boolean;
  vendorCategory?: string | null;
  packages?: import("@/lib/vendor-packages").VendorPackage[];
};

export function ChatBookingBanner({
  booking,
  onBook,
}: {
  booking: ChatRelatedBooking;
  onBook?: () => void;
}) {
  const needsAction = booking.canConfirm || booking.canDispute;

  return (
    <div className="border-b border-border bg-card/95 px-4 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{booking.listingTitle}</p>
          <p className="text-xs text-muted-foreground">
            {needsAction
              ? "Escrow action available for this booking"
              : `Booking · ${new Date(booking.eventDate).toLocaleDateString()} · ${booking.status.replace("_", " ")}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {booking.canConfirm && (
            <Link href={`/bookings/${booking.id}#confirm`}>
              <Button size="sm" variant="gradient" className="h-8 gap-1.5 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Confirm done
              </Button>
            </Link>
          )}
          {booking.canDispute && (
            <Link href={`/bookings/${booking.id}#confirm`}>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 border-amber-300 text-xs text-amber-800 hover:bg-amber-50"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Dispute
              </Button>
            </Link>
          )}
          {booking.hasReceipt && (
            <a href={`/api/bookings/${booking.id}/invoice`} download>
              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" />
                Receipt
              </Button>
            </a>
          )}
          <Link href={`/bookings/${booking.id}`}>
            <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs">
              Details
              <ExternalLink className="h-3 w-3" />
            </Button>
          </Link>
          {onBook && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              type="button"
              onClick={onBook}
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              Book again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ChatBookVendorBanner({
  vendorName,
  onBook,
}: {
  vendorName?: string;
  onBook: () => void;
}) {
  return (
    <div className="border-b border-border bg-primary/5 px-4 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            Ready to book{vendorName ? ` ${vendorName}` : ""}?
          </p>
          <p className="text-xs text-muted-foreground">
            Secure your date with escrow protection on Evendor.
          </p>
        </div>
        <Button
          size="sm"
          variant="gradient"
          className="h-8 gap-1.5 text-xs"
          type="button"
          onClick={onBook}
        >
          <CalendarPlus className="h-3.5 w-3.5" />
          Book this vendor
        </Button>
      </div>
    </div>
  );
}

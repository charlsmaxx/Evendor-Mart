import { format } from "date-fns";
import Image from "next/image";
import { Camera, MapPin, Store } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export type BookingSnapshotData = {
  listingId?: string;
  title?: string;
  description?: string;
  priceMin?: number;
  priceMax?: number;
  city?: string;
  coverImage?: string;
  vendorBusinessName?: string;
  snapshotAt?: string;
  listingTitle?: string;
  source?: string;
  manualCustomer?: { fullName?: string; email?: string; phone?: string };
  package?: { id?: string; name?: string; basePrice?: number };
  selectedAddOns?: { name?: string; quantity?: number; lineTotal?: number }[];
  cancellationPolicyLines?: string[];
  categoryAnswers?: Record<string, unknown>;
  pricing?: { totalAmount?: number };
};

export function parseBookingSnapshot(snapshot: unknown): BookingSnapshotData | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  return snapshot as BookingSnapshotData;
}

type BookingSnapshotCardProps = {
  snapshot: unknown;
  className?: string;
};

export function BookingSnapshotCard({ snapshot, className = "" }: BookingSnapshotCardProps) {
  const data = parseBookingSnapshot(snapshot);
  if (!data) return null;

  const title = data.title ?? data.listingTitle ?? "Booking snapshot";
  const priceLabel =
    data.priceMin != null && data.priceMax != null
      ? `${formatCurrency(data.priceMin)} – ${formatCurrency(data.priceMax)}`
      : null;

  return (
    <div className={`rounded-2xl border border-border/80 bg-card/80 p-5 backdrop-blur-sm space-y-3 ${className}`}>
      <div className="flex items-start gap-3">
        {data.coverImage ? (
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border">
            <Image src={data.coverImage} alt="" fill className="object-cover" sizes="64px" />
          </div>
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border bg-muted">
            <Camera className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Snapshot at booking
          </p>
          <p className="font-semibold">{title}</p>
          {data.vendorBusinessName && (
            <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
              <Store className="h-3.5 w-3.5" /> {data.vendorBusinessName}
            </p>
          )}
        </div>
      </div>

      {data.description && (
        <p className="text-sm text-muted-foreground line-clamp-3">{data.description}</p>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {data.city && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {data.city}
          </span>
        )}
        {priceLabel && <span>{priceLabel}</span>}
        {data.source === "MANUAL" && data.manualCustomer && (
          <span>
            Manual: {data.manualCustomer.fullName ?? data.manualCustomer.email ?? "Customer"}
          </span>
        )}
      </div>

      {data.package?.name && (
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm">
          <p className="font-medium">Package: {data.package.name}</p>
          {data.package.basePrice != null && (
            <p className="text-xs text-muted-foreground">
              Base {formatCurrency(data.package.basePrice)}
            </p>
          )}
          {!!data.selectedAddOns?.length && (
            <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
              {data.selectedAddOns.map((a, i) => (
                <li key={`${a.name}-${i}`}>
                  {a.name}
                  {a.quantity && a.quantity > 1 ? ` ×${a.quantity}` : ""}
                  {a.lineTotal != null ? ` · ${formatCurrency(a.lineTotal)}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!!data.cancellationPolicyLines?.length && (
        <div className="rounded-lg border border-border/60 px-3 py-2 text-sm">
          <p className="font-medium">Cancellation policy (accepted at booking)</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
            {data.cancellationPolicyLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {data.snapshotAt && (
        <p className="text-xs text-muted-foreground">
          Captured {format(new Date(data.snapshotAt), "MMM d, yyyy · h:mm a")}
        </p>
      )}
    </div>
  );
}

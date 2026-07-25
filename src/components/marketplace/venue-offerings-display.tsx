import { Check, Users, MapPin } from "lucide-react";
import {
  VENUE_AMENITY_GROUPS,
  VENUE_SERVICE_GROUPS,
  splitOfferings,
  groupResolvedOfferings,
} from "@/lib/venue-offerings";

export function VenueOfferingsDisplay({
  capacity,
  address,
  city,
  amenities,
  services,
}: {
  capacity?: number | null;
  address?: string | null;
  city: string;
  amenities: string[];
  services: string[];
}) {
  const amenitySplit = splitOfferings(amenities);
  const serviceSplit = splitOfferings(services);
  const amenityGroups = groupResolvedOfferings(amenitySplit.known, VENUE_AMENITY_GROUPS);
  const serviceGroups = groupResolvedOfferings(serviceSplit.known, VENUE_SERVICE_GROUPS);
  const hasContent =
    capacity ||
    address ||
    amenitySplit.known.length > 0 ||
    amenitySplit.custom.length > 0 ||
    serviceSplit.known.length > 0 ||
    serviceSplit.custom.length > 0;

  if (!hasContent) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-6 space-y-8">
      <div>
        <h2 className="font-display text-xl font-semibold">Everything about this venue</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review capacity, facilities, and services before you book.
        </p>
      </div>

      {(capacity || address) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {capacity ? (
            <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
              <Users className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">Guest capacity</p>
                <p className="text-sm text-muted-foreground">Up to {capacity.toLocaleString()} guests</p>
              </div>
            </div>
          ) : null}
          <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
            <MapPin className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="font-semibold">Location</p>
              <p className="text-sm text-muted-foreground">{address ?? city}</p>
            </div>
          </div>
        </div>
      )}

      {amenityGroups.map((group) => (
        <div key={group.id}>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {group.label}
          </h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {group.selected.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.key} className="flex items-center gap-2.5 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{item.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {amenitySplit.custom.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            More amenities
          </h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {amenitySplit.custom.map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(serviceGroups.length > 0 || serviceSplit.custom.length > 0) && (
        <div className="border-t border-border pt-6">
          <h3 className="font-display text-lg font-semibold">Services at this venue</h3>
          {serviceGroups.map((group) => (
            <div key={group.id} className="mt-5">
              <p className="text-sm font-semibold text-muted-foreground">{group.label}</p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {group.selected.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.key} className="flex items-center gap-2.5 text-sm">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span>{item.label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {serviceSplit.custom.length > 0 && (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {serviceSplit.custom.map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

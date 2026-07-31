import { MapPinned } from "lucide-react";
import type { ServiceAreaInfo } from "@/lib/vendor-profile-content";

export function ServiceAreasSection({ area }: { area: ServiceAreaInfo | null }) {
  if (!area) return null;

  if (area.availableNationwide) {
    return (
      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-xl font-semibold">Service areas</h2>
        <div className="mt-4 flex items-start gap-3">
          <MapPinned className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <p className="font-semibold">Available Nationwide</p>
            <p className="mt-1 text-sm text-muted-foreground">
              This vendor travels across Nigeria
              {area.travelFeePolicy ? ` · ${area.travelFeePolicy}` : ""}.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const cities = area.cities?.length ? area.cities : area.city ? [area.city] : [];
  const states = area.states?.length ? area.states : area.state ? [area.state] : [];

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl font-semibold">Service areas</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {states.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              States served
            </p>
            <p className="mt-2 text-sm text-foreground">{states.join(", ")}</p>
          </div>
        )}
        {cities.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Cities served
            </p>
            <p className="mt-2 text-sm text-foreground">{cities.join(", ")}</p>
          </div>
        )}
      </div>
      {(area.travelsOutsideCity || area.travelsOutsideState || area.serviceRadiusKm) && (
        <p className="mt-4 text-sm text-muted-foreground">
          {area.travelsOutsideState
            ? "Travels outside state"
            : area.travelsOutsideCity
              ? "Travels outside city"
              : null}
          {area.serviceRadiusKm != null ? ` · Within ~${area.serviceRadiusKm} km` : ""}
          {area.travelFeePolicy ? ` · ${area.travelFeePolicy}` : ""}
        </p>
      )}
    </section>
  );
}

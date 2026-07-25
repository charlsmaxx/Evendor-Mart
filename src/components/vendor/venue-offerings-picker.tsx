"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  VENUE_AMENITY_GROUPS,
  VENUE_SERVICE_GROUPS,
  resolveOffering,
  type VenueOfferingGroup,
} from "@/lib/venue-offerings";
import { TagListInput } from "@/components/vendor/tag-list-input";

function OfferingGroup({
  group,
  selected,
  onToggle,
}: {
  group: VenueOfferingGroup;
  selected: Set<string>;
  onToggle: (key: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-foreground">{group.label}</p>
      <div className="flex flex-wrap gap-2">
        {group.items.map((item) => {
          const active = selected.has(item.key);
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onToggle(item.key)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition",
                active
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
              {active && <Check className="h-3.5 w-3.5" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function VenueOfferingsPicker({
  amenities,
  services,
  customAmenities,
  customServices,
  onAmenitiesChange,
  onServicesChange,
  onCustomAmenitiesChange,
  onCustomServicesChange,
}: {
  amenities: string[];
  services: string[];
  customAmenities: string[];
  customServices: string[];
  onAmenitiesChange: (keys: string[]) => void;
  onServicesChange: (keys: string[]) => void;
  onCustomAmenitiesChange: (items: string[]) => void;
  onCustomServicesChange: (items: string[]) => void;
}) {
  const amenitySet = new Set(amenities);
  const serviceSet = new Set(services);

  function toggleAmenity(key: string) {
    const next = new Set(amenitySet);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onAmenitiesChange([...next]);
  }

  function toggleService(key: string) {
    const next = new Set(serviceSet);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onServicesChange([...next]);
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <p className="font-semibold">What your venue offers</p>
        <p className="text-sm text-muted-foreground">
          Tap everything included with the space — customers see this on your listing before they book.
        </p>
      </div>

      <div className="space-y-6 rounded-xl border border-border bg-muted/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Facilities &amp; amenities</p>
        {VENUE_AMENITY_GROUPS.map((group) => (
          <OfferingGroup
            key={group.id}
            group={group}
            selected={amenitySet}
            onToggle={toggleAmenity}
          />
        ))}
        <TagListInput
          label="Other amenities"
          description="Anything not listed above"
          value={customAmenities}
          onChange={onCustomAmenitiesChange}
          placeholder="e.g. Swimming pool access"
        />
      </div>

      <div className="space-y-6 rounded-xl border border-border bg-muted/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Services you provide</p>
        {VENUE_SERVICE_GROUPS.map((group) => (
          <OfferingGroup
            key={group.id}
            group={group}
            selected={serviceSet}
            onToggle={toggleService}
          />
        ))}
        <TagListInput
          label="Other services"
          description="Additional services at your venue"
          value={customServices}
          onChange={onCustomServicesChange}
          placeholder="e.g. Live band setup"
        />
      </div>
    </div>
  );
}

/** Merge amenity keys + custom labels for API storage */
export function buildAmenitiesPayload(keys: string[], custom: string[]) {
  return [...keys, ...custom.map((c) => c.trim()).filter(Boolean)];
}

export function buildServicesPayload(keys: string[], custom: string[]) {
  return [...keys, ...custom.map((c) => c.trim()).filter(Boolean)];
}

export function parseAmenitiesFromStorage(stored: string[] = []) {
  const keys: string[] = [];
  const custom: string[] = [];
  for (const v of stored) {
    const resolved = resolveOffering(v);
    if (resolved && VENUE_AMENITY_GROUPS.some((g) => g.items.some((i) => i.key === resolved.key))) {
      if (!keys.includes(resolved.key)) keys.push(resolved.key);
    } else if (v.trim()) custom.push(v.trim());
  }
  return { keys, custom };
}

export function parseServicesFromStorage(stored: string[] = []) {
  const keys: string[] = [];
  const custom: string[] = [];
  for (const v of stored) {
    const resolved = resolveOffering(v);
    if (resolved && VENUE_SERVICE_GROUPS.some((g) => g.items.some((i) => i.key === resolved.key))) {
      if (!keys.includes(resolved.key)) keys.push(resolved.key);
    } else if (v.trim()) custom.push(v.trim());
  }
  return { keys, custom };
}

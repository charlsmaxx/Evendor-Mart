"use client";

import { useCompareStore } from "@/stores/compare-store";
import { useQuery } from "@tanstack/react-query";
import { X, Star, Plus } from "lucide-react";
import { formatPriceRange } from "@/lib/utils";
import Link from "next/link";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { Button } from "@/components/ui/button";
import { reportClientError } from "@/lib/client-error";

type CompareListing = {
  id: string;
  slug: string;
  title: string;
  city: string;
  priceMin: number;
  priceMax: number;
  ratingAvg: number;
  reviewCount: number;
  verified: boolean;
  type: "VENUE" | "SERVICE";
  vendorId: string;
  vendorName: string;
  capacity: number | null;
  categoryName: string;
  coverImage: string;
};

const COMPARE_ROWS: { label: string; render: (l: CompareListing) => string }[] = [
  { label: "Price", render: (l) => formatPriceRange(l.priceMin, l.priceMax) },
  { label: "City", render: (l) => l.city },
  { label: "Type", render: (l) => (l.type === "VENUE" ? "Venue" : "Service") },
  { label: "Capacity", render: (l) => (l.capacity ? `Up to ${l.capacity} guests` : "—") },
  { label: "Rating", render: (l) => `${l.ratingAvg.toFixed(1)} (${l.reviewCount})` },
  { label: "Category", render: (l) => l.categoryName },
  { label: "Verified", render: (l) => (l.verified ? "Yes" : "No") },
];

export function CompareDrawer() {
  const items = useCompareStore((s) => s.items);
  const add = useCompareStore((s) => s.add);
  const remove = useCompareStore((s) => s.remove);
  const clear = useCompareStore((s) => s.clear);

  const listingIds = items.map((i) => i.listingId);
  const anchorId = listingIds[0];

  const { data: listings = [] } = useQuery({
    queryKey: ["compare", listingIds],
    enabled: listingIds.length > 0,
    queryFn: async () => {
      const res = await fetch(`/api/listings/compare?ids=${listingIds.join(",")}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Compare failed");
      return (json.data ?? []) as CompareListing[];
    },
  });

  const isVenueCompare =
    items.some((i) => i.type === "VENUE") || listings.some((l) => l.type === "VENUE");

  const { data: suggestions = [] } = useQuery({
    queryKey: ["compare-suggestions", anchorId, listingIds.join(",")],
    enabled: Boolean(anchorId) && listingIds.length < 3,
    queryFn: async () => {
      const excludeVendors = items.map((i) => i.vendorId).join(",");
      const res = await fetch(
        `/api/listings/compare/suggestions?listingId=${anchorId}&exclude=${listingIds.join(",")}&excludeVendors=${excludeVendors}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Suggestions failed");
      return (json.data ?? []) as CompareListing[];
    },
  });

  if (!listingIds.length) return null;

  const showTable = listings.length >= 2;
  const title = isVenueCompare ? "Compare event centers" : "Compare listings";

  function addSuggestion(s: CompareListing) {
    const result = add(s.id, s.vendorId, s.type);
    if (result === "same-vendor") {
      reportClientError(
        "compare",
        "You can only compare event centers from different venues on the platform."
      );
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-4xl glass glow-purple rounded-2xl p-4 shadow-2xl">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">
          {title} ({listingIds.length}/3)
        </h3>
        <button type="button" onClick={clear} className="text-xs text-muted-foreground hover:text-foreground">
          Clear all
        </button>
      </div>

      {listings.length === 1 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {isVenueCompare
            ? "Add other event centers from the platform to compare side by side."
            : "Add one more listing from a different vendor to see a side-by-side comparison."}
        </p>
      )}

      {suggestions.length > 0 && listingIds.length < 3 && (
        <div className="mt-3 rounded-xl border border-border/80 bg-background/50 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            {isVenueCompare ? "Other event centers on Evendor" : "Similar listings to compare"}
          </p>
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {suggestions.map((s) => (
              <li
                key={s.id}
                className="flex min-w-[140px] max-w-[160px] shrink-0 flex-col rounded-lg border border-border bg-card p-2"
              >
                <div className="relative mb-1.5 h-12 w-full overflow-hidden rounded-md">
                  <OptimizedImage src={s.coverImage} preset="thumb" alt="" fill className="object-cover" sizes="160px" />
                </div>
                <p className="line-clamp-2 text-xs font-medium leading-tight">{s.title}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {s.city} · {formatPriceRange(s.priceMin, s.priceMax)}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 w-full text-xs"
                  onClick={() => addSuggestion(s)}
                >
                  <Plus className="mr-1 h-3 w-3" /> Add
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showTable ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-b border-border p-2 text-left text-xs font-medium text-muted-foreground w-28">
                  &nbsp;
                </th>
                {listings.map((l) => (
                  <th key={l.id} className="border-b border-border p-2 text-left align-top">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="relative mb-2 h-14 w-20 overflow-hidden rounded-lg">
                          <OptimizedImage src={l.coverImage} preset="thumb" alt="" fill className="object-cover" sizes="80px" />
                        </div>
                        <Link href={`/listings/${l.slug}`} className="font-medium hover:text-primary line-clamp-2">
                          {l.title}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted-foreground">{l.vendorName}</p>
                      </div>
                      <button type="button" onClick={() => remove(l.id)} aria-label="Remove">
                        <X className="h-4 w-4 shrink-0" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((row) => (
                <tr key={row.label} className="border-b border-border/60">
                  <td className="p-2 text-xs font-medium text-muted-foreground">{row.label}</td>
                  {listings.map((l) => (
                    <td key={`${l.id}-${row.label}`} className="p-2 text-sm">
                      {row.label === "Rating" ? (
                        <span className="inline-flex items-center gap-1 text-amber-500">
                          <Star className="h-3.5 w-3.5 fill-amber-400" />
                          {row.render(l)}
                        </span>
                      ) : (
                        row.render(l)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {listings.map((l) => (
            <li key={l.id} className="flex items-start justify-between gap-2 text-sm">
              <div>
                <Link href={`/listings/${l.slug}`} className="font-medium hover:text-primary">
                  {l.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {l.city} · {formatPriceRange(l.priceMin, l.priceMax)} · ★{l.ratingAvg.toFixed(1)}
                </p>
              </div>
              <button type="button" onClick={() => remove(l.id)} aria-label="Remove">
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

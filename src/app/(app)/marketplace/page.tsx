import { Suspense } from "react";
import { searchListings } from "@/lib/listings";
import { VendorCard } from "@/components/marketplace/vendor-card";
import { MarketplaceFilters } from "@/components/marketplace/marketplace-filters";
import { MarketplacePagination } from "@/components/marketplace/marketplace-pagination";
import {
  MarketplaceFiltersSkeleton,
  MarketplaceGridSkeleton,
} from "@/components/loading/marketplace-skeleton";

export const metadata = { title: "Marketplace" };

async function MarketplaceGrid({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]
  );
  const { listings, total, page, limit } = await searchListings(filteredParams);

  return (
    <>
      <p className="mb-6 text-sm text-muted-foreground">{total} results</p>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((l) => (
          <VendorCard key={l.id} listing={l} />
        ))}
      </div>
      {listings.length === 0 && (
        <p className="text-center text-muted-foreground py-12">No listings match your filters.</p>
      )}
      <MarketplacePagination
        page={page}
        limit={limit}
        total={total}
        searchParams={params}
      />
    </>
  );
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const type = params.type;
  const subtitle =
    type === "VENUE"
      ? "Event halls, ballrooms, and spaces for your next occasion."
      : type === "SERVICE"
        ? "Photographers, caterers, DJs, and other event service providers."
        : "Browse event venues and service vendors — use the tabs to filter.";

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Marketplace</h1>
      <p className="mt-2 text-muted-foreground">{subtitle}</p>
      <div className="mt-8">
        <Suspense fallback={<MarketplaceFiltersSkeleton />}>
          <MarketplaceFilters />
        </Suspense>
      </div>
      <div className="mt-8">
        <Suspense fallback={<MarketplaceGridSkeleton />}>
          <MarketplaceGrid searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

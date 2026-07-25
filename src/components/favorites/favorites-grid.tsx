"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { VendorCard } from "@/components/marketplace/vendor-card";
import type { VendorCardData } from "@/components/marketplace/vendor-card";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import { parsePaginatedApiResponse } from "@/lib/parse-paginated-api-response";

type FavoriteRow = {
  id: string;
  listing: VendorCardData;
};

export function FavoritesGrid() {
  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ["favorites"],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await fetch(`/api/favorites?page=${pageParam}&limit=24`);
      const parsed = await parsePaginatedApiResponse<FavoriteRow>(res);
      if (!parsed.ok) throw new Error(parsed.message);
      return { items: parsed.data, meta: parsed.meta! };
    },
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasMore ? lastPage.meta.page + 1 : undefined,
  });

  const listings = data?.pages.flatMap((page) => page.items.map((f) => f.listing)) ?? [];
  const lastMeta = data?.pages[data.pages.length - 1]?.meta;

  return (
    <>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((l) => (
          <VendorCard key={l.id} listing={l} />
        ))}
      </div>
      {!isLoading && !listings.length && (
        <p className="mt-8 text-muted-foreground">Save vendors you love from the marketplace.</p>
      )}
      <LoadMoreButton
        meta={hasNextPage ? lastMeta : null}
        onLoadMore={() => fetchNextPage()}
        loading={isFetchingNextPage}
      />
    </>
  );
}

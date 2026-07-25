import { Skeleton } from "@/components/ui/skeleton";

export function MarketplaceFiltersSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-28 rounded-full" />
        ))}
      </div>
      <div className="glass flex flex-wrap gap-4 rounded-2xl p-4">
        <Skeleton className="h-10 min-w-[200px] flex-1 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-40 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
    </div>
  );
}

export function MarketplaceGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      <Skeleton className="mb-6 h-4 w-24" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
          <article key={i} className="glass overflow-hidden rounded-2xl">
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="space-y-3 p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-3/4" />
              <div className="flex justify-between pt-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

export function MarketplacePageSkeleton() {
  return (
    <div>
      <Skeleton className="h-9 w-48" />
      <Skeleton className="mt-2 h-4 w-full max-w-xl" />
      <div className="mt-8">
        <MarketplaceFiltersSkeleton />
      </div>
      <div className="mt-8">
        <MarketplaceGridSkeleton />
      </div>
    </div>
  );
}

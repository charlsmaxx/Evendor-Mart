import { Skeleton } from "@/components/ui/skeleton";

export function MessagesSkeleton() {
  return (
    <div className="flex h-[min(70vh,640px)] overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <aside className="flex w-full flex-col border-r border-border md:w-96 md:max-w-[40%]">
        <div className="border-b border-border px-4 py-4">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="mt-2 h-4 w-56" />
          <Skeleton className="mt-3 h-10 w-full rounded-full" />
        </div>
        <div className="flex-1 space-y-1 p-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl p-3">
              <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full max-w-[200px]" />
              </div>
            </div>
          ))}
        </div>
      </aside>
      <section className="hidden min-w-0 flex-1 flex-col items-center justify-center bg-muted/20 p-8 md:flex">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <Skeleton className="mt-4 h-5 w-40" />
        <Skeleton className="mt-2 h-4 w-72" />
      </section>
    </div>
  );
}

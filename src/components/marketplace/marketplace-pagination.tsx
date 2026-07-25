import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type MarketplacePaginationProps = {
  page: number;
  limit: number;
  total: number;
  searchParams: Record<string, string | undefined>;
};

function buildPageHref(searchParams: Record<string, string | undefined>, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value && key !== "page") params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/marketplace?${qs}` : "/marketplace";
}

function visiblePages(current: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, totalPages, current]);
  if (current > 2) pages.add(current - 1);
  if (current < totalPages - 1) pages.add(current + 1);
  if (current <= 3) pages.add(2).add(3);
  if (current >= totalPages - 2) pages.add(totalPages - 1).add(totalPages - 2);

  return [...pages].sort((a, b) => a - b);
}

export function MarketplacePagination({
  page,
  limit,
  total,
  searchParams,
}: MarketplacePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages <= 1) return null;

  const pages = visiblePages(page, totalPages);
  const showEllipsis = (index: number, p: number) =>
    index > 0 && p - pages[index - 1] > 1;

  return (
    <nav
      className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-between"
      aria-label="Marketplace pagination"
    >
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages} · {total} results
      </p>
      <div className="flex flex-wrap items-center justify-center gap-1">
        <Link
          href={buildPageHref(searchParams, Math.max(1, page - 1))}
          aria-disabled={page <= 1}
          className={cn(
            "inline-flex h-9 items-center gap-1 rounded-full border border-border px-3 text-sm font-medium transition hover:bg-muted",
            page <= 1 && "pointer-events-none opacity-40"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Link>

        {pages.map((p, index) => (
          <span key={p} className="flex items-center gap-1">
            {showEllipsis(index, p) && (
              <span className="px-1 text-muted-foreground">…</span>
            )}
            <Link
              href={buildPageHref(searchParams, p)}
              aria-current={p === page ? "page" : undefined}
              className={cn(
                "inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-sm font-medium transition",
                p === page
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted"
              )}
            >
              {p}
            </Link>
          </span>
        ))}

        <Link
          href={buildPageHref(searchParams, Math.min(totalPages, page + 1))}
          aria-disabled={page >= totalPages}
          className={cn(
            "inline-flex h-9 items-center gap-1 rounded-full border border-border px-3 text-sm font-medium transition hover:bg-muted",
            page >= totalPages && "pointer-events-none opacity-40"
          )}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </nav>
  );
}

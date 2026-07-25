"use client";

import { Button } from "@/components/ui/button";
import type { PaginationMeta } from "@/lib/pagination";

export function LoadMoreButton({
  meta,
  onLoadMore,
  loading,
  label = "Load more",
}: {
  meta?: PaginationMeta | null;
  onLoadMore: () => void;
  loading?: boolean;
  label?: string;
}) {
  if (!meta?.hasMore) return null;

  return (
    <div className="flex justify-center pt-6">
      <Button variant="outline" onClick={onLoadMore} disabled={loading}>
        {loading ? "Loading…" : label}
      </Button>
    </div>
  );
}

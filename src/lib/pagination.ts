import { z } from "zod";

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  filterCounts?: Record<string, number>;
};

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
  extra?: Pick<PaginationMeta, "filterCounts">
): PaginationMeta {
  return {
    page,
    limit,
    total,
    hasMore: page * limit < total,
    ...extra,
  };
}

export function parsePaginationParams(
  searchParams: URLSearchParams,
  defaults?: { page?: number; limit?: number }
) {
  return paginationQuerySchema.parse({
    page: searchParams.get("page") ?? defaults?.page ?? 1,
    limit: searchParams.get("limit") ?? defaults?.limit ?? 30,
  });
}

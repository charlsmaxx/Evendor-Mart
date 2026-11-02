export const ARCHIVE_LISTING_DATA = {
  status: "ARCHIVED",
  featured: false,
} as const;

export const PUBLIC_LISTING_CACHE_KEYS = [
  "featured:v2:4",
  "featured:v2:8",
  "featured:v2:12",
  "featured:v2:vendors:4",
  "featured:v2:vendors:8",
  "featured:v2:vendors:10",
  "featured:v2:vendors:12",
  "featured:v2:venues:4",
  "featured:v2:venues:8",
  "featured:v2:venues:12",
] as const;

export const PUBLIC_SEARCH_CACHE_PREFIX = "search:v4:";

export type ArchivedListingSnapshot = {
  id: string;
  title: string;
  slug: string;
  status: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED";
};

/** Only statuses written by the archive transaction are eligible for restoration. */
export function isRestorableListingSnapshot(value: unknown): value is ArchivedListingSnapshot[] {
  if (!Array.isArray(value)) return false;
  return value.every((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const row = entry as Record<string, unknown>;
    return typeof row.id === "string" && typeof row.title === "string" &&
      typeof row.slug === "string" &&
      ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "REJECTED"].includes(String(row.status));
  });
}

/** Run public cache invalidation only after the database transaction succeeds. */
export async function archiveAfterDatabaseUpdate<T>(
  archive: () => Promise<T>,
  invalidatePublicCaches: (result: T) => Promise<void>,
  didArchive: (result: T) => boolean = () => true
): Promise<T> {
  const result = await archive();
  if (didArchive(result)) await invalidatePublicCaches(result);
  return result;
}

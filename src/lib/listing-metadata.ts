export type ListingMetadata = {
  termsAndConditions?: string;
  services?: string[];
};

/** API/form input may send `null` to clear optional fields. */
export type ListingMetadataPatch = {
  termsAndConditions?: string | null;
  services?: string[];
};

export function parseListingMetadata(metadata: unknown): Required<ListingMetadata> {
  const m = (metadata as Record<string, unknown>) ?? {};
  const services = m.services;
  return {
    termsAndConditions: typeof m.termsAndConditions === "string" ? m.termsAndConditions : "",
    services: Array.isArray(services)
      ? services.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      : [],
  };
}

export function mergeListingMetadata(
  existing: unknown,
  patch: ListingMetadataPatch
): ListingMetadata {
  const current = parseListingMetadata(existing);
  return {
    termsAndConditions:
      patch.termsAndConditions !== undefined
        ? patch.termsAndConditions || undefined
        : current.termsAndConditions || undefined,
    services: patch.services !== undefined ? patch.services : current.services,
  };
}

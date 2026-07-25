import type { Prisma } from "@prisma/client";

export type BookingEvidenceItem = {
  url: string;
  publicId?: string;
  caption?: string;
  uploadedAt: string;
};

export function getVendorEvidence(snapshot: unknown): BookingEvidenceItem[] {
  if (!snapshot || typeof snapshot !== "object") return [];
  const raw = (snapshot as Record<string, unknown>).vendorEvidence;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is BookingEvidenceItem =>
      !!item &&
      typeof item === "object" &&
      typeof (item as BookingEvidenceItem).url === "string"
  );
}

export function appendVendorEvidence(
  snapshot: unknown,
  item: Omit<BookingEvidenceItem, "uploadedAt">
): Prisma.InputJsonValue {
  const base =
    snapshot && typeof snapshot === "object"
      ? { ...(snapshot as Record<string, unknown>) }
      : {};
  const existing = getVendorEvidence(base);
  return {
    ...base,
    vendorEvidence: [
      ...existing,
      { ...item, uploadedAt: new Date().toISOString() },
    ],
  };
}

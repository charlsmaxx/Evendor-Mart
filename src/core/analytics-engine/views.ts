import { prisma } from "@/core/infrastructure/prisma";

/** Persist a marketplace VIEW for vendor analytics / dashboard profile views. */
export async function recordVendorView(params: {
  vendorId: string;
  listingId?: string | null;
  source: "profile" | "listing";
  viewerUserId?: string | null;
}) {
  const vendor = await prisma.vendorProfile.findUnique({
    where: { id: params.vendorId },
    select: { id: true, userId: true },
  });
  if (!vendor) return { recorded: false as const, reason: "not_found" as const };

  // Don't inflate stats when the vendor opens their own page.
  if (params.viewerUserId && params.viewerUserId === vendor.userId) {
    return { recorded: false as const, reason: "own_profile" as const };
  }

  if (params.listingId) {
    const listing = await prisma.listing.findFirst({
      where: { id: params.listingId, vendorId: vendor.id },
      select: { id: true },
    });
    if (!listing) {
      return { recorded: false as const, reason: "listing_mismatch" as const };
    }
  }

  await prisma.analyticsEvent.create({
    data: {
      vendorId: vendor.id,
      eventType: "VIEW",
      listingId: params.listingId ?? null,
      metadata: {
        source: params.source,
        viewerUserId: params.viewerUserId ?? null,
      },
    },
  });

  return { recorded: true as const };
}

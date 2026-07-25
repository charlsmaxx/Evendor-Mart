import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { mergeListingMetadata, parseListingMetadata } from "@/lib/listing-metadata";
import { updateListingBodySchema } from "@/lib/validations/listing";

async function getOwnedListing(id: string, userId: string, role: string) {
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      vendor: true,
      category: true,
      venueDetails: true,
      _count: { select: { bookings: true, quoteRequests: true } },
    },
  });
  if (!listing) return null;
  if (listing.vendor.userId !== userId && role !== "ADMIN") return null;
  return listing;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const listing = await getOwnedListing(id, user.id, user.role);
  if (!listing) return jsonError("Not found", 404);

  return jsonOk({
    id: listing.id,
    title: listing.title,
    description: listing.description,
    categoryId: listing.categoryId,
    type: listing.type,
    city: listing.city,
    priceMin: listing.priceMin,
    priceMax: listing.priceMax,
    coverImage: listing.coverImage ?? listing.images?.[0] ?? null,
    status: listing.status,
    capacity: listing.venueDetails?.capacity ?? null,
    address: listing.venueDetails?.address ?? null,
    amenities: listing.venueDetails?.amenities ?? [],
    categoryName: listing.category?.name ?? null,
    ...parseListingMetadata(listing.metadata),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const listing = await getOwnedListing(id, user.id, user.role);
  if (!listing) return jsonError("Not found", 404);

  const parsed = updateListingBodySchema.safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const { capacity, coverImage, amenities, services, termsAndConditions, address, ...data } = parsed.data;

  const listingData: Record<string, unknown> = { ...data };
  if (coverImage !== undefined) {
    listingData.coverImage = coverImage;
    listingData.images = coverImage ? [coverImage] : [];
  }

  if (services !== undefined || termsAndConditions !== undefined) {
    listingData.metadata = mergeListingMetadata(listing.metadata, {
      ...(services !== undefined ? { services } : {}),
      ...(termsAndConditions !== undefined ? { termsAndConditions } : {}),
    });
  }

  const updated = await prisma.listing.update({
    where: { id },
    data: listingData,
  });

  if (
    (capacity !== undefined ||
      amenities !== undefined ||
      address !== undefined) &&
    (data.type === "VENUE" || listing.type === "VENUE")
  ) {
    await prisma.venueDetails.upsert({
      where: { listingId: id },
      create: {
        listingId: id,
        capacity: capacity ?? 100,
        amenities: amenities ?? [],
        address: address ?? null,
      },
      update: {
        ...(capacity !== undefined ? { capacity } : {}),
        ...(amenities !== undefined ? { amenities } : {}),
        ...(address !== undefined ? { address } : {}),
      },
    });
  }

  return jsonOk(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const listing = await getOwnedListing(id, user.id, user.role);
  if (!listing) return jsonError("Not found", 404);

  const hasActivity = listing._count.bookings > 0 || listing._count.quoteRequests > 0;

  if (hasActivity || listing.status === "PUBLISHED") {
    const archived = await prisma.listing.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });
    return jsonOk({ archived: true, listing: archived });
  }

  await prisma.listing.delete({ where: { id } });
  return jsonOk({ deleted: true });
}

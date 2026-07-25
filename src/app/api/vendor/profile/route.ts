import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/core/audit-engine";
import { syncListingPortfolioMedia } from "@/lib/vendor-media-server";
import { isVideoMedia } from "@/lib/vendor-media";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const uploadedMediaSchema = z.object({
  url: z.string().url(),
  publicId: z.string().min(1),
  resourceType: z.string().optional(),
});

const profileSchema = z.object({
  businessName: z.string().min(2).max(120).optional(),
  bio: z.string().max(2000).optional(),
  city: z.string().max(80).optional(),
  phone: z.string().max(30).nullable().optional(),
  avatarUrl: z.string().url().optional().nullable(),
  coverImageUrl: z.string().url().optional().nullable(),
  featuredImages: z.array(uploadedMediaSchema).max(7).optional(),
  featuredClips: z.array(uploadedMediaSchema).max(3).optional(),
  socialLinks: z
    .object({
      instagram: z.string().optional(),
      facebook: z.string().optional(),
      tiktok: z.string().optional(),
      website: z.string().optional(),
    })
    .optional(),
  availability: z.record(z.unknown()).optional(),
  packages: z.array(z.record(z.unknown())).optional(),
  experience: z.string().max(500).optional(),
  address: z.string().max(300).optional(),
});

export async function GET() {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const vendor = await prisma.vendorProfile.findUnique({
    where: { userId: user.id },
    include: {
      user: { select: { email: true, fullName: true, phone: true, avatarUrl: true } },
      listings: {
        select: { id: true, title: true, status: true, images: true, priceMin: true },
        orderBy: { createdAt: "asc" },
      },
      portfolioMedia: { orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] },
    },
  });
  if (!vendor) return jsonError("Vendor not found", 404);

  const meta = (vendor.metadata as Record<string, unknown>) ?? {};
  const primaryListingId = vendor.listings[0]?.id ?? null;
  const listingMedia = primaryListingId
    ? vendor.portfolioMedia.filter((m) => m.listingId === primaryListingId)
    : vendor.portfolioMedia;

  const featuredImages = listingMedia
    .filter((m) => !isVideoMedia(m))
    .map((m) => ({ url: m.url, publicId: m.publicId }));
  const featuredClips = listingMedia
    .filter((m) => isVideoMedia(m))
    .map((m) => ({ url: m.url, publicId: m.publicId, resourceType: "video" as const }));

  return jsonOk({
    businessName: vendor.businessName,
    bio: vendor.bio,
    city: vendor.city,
    country: vendor.country,
    category: vendor.category,
    verified: vendor.verified,
    verificationStatus: vendor.verificationStatus,
    email: vendor.user.email,
    fullName: vendor.user.fullName,
    phone: vendor.user.phone,
    avatarUrl: vendor.user.avatarUrl,
    coverImageUrl: (meta.coverImageUrl as string) ?? vendor.listings[0]?.images[0] ?? null,
    featuredImages,
    featuredClips,
    primaryListingId,
    socialLinks: (meta.socialLinks as Record<string, string>) ?? {},
    availability: vendor.availability,
    packages: (meta.packages as unknown[]) ?? [],
    listings: vendor.listings,
    experience: (meta.experience as string) ?? "",
    address: (meta.address as string) ?? "",
  });
}

export async function PATCH(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } });
  if (!vendor) return jsonError("Vendor not found", 404);

  const parsed = profileSchema.safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const { phone, avatarUrl, socialLinks, availability, packages, coverImageUrl, experience, address, featuredImages, featuredClips, ...vendorFields } =
    parsed.data;

  const existingMeta = (vendor.metadata as Record<string, unknown>) ?? {};
  const metadata = {
    ...existingMeta,
    ...(socialLinks ? { socialLinks } : {}),
    ...(packages ? { packages } : {}),
    ...(coverImageUrl !== undefined ? { coverImageUrl } : {}),
    ...(experience !== undefined ? { experience } : {}),
    ...(address !== undefined ? { address } : {}),
  } as Prisma.InputJsonValue;

  await prisma.$transaction([
    prisma.vendorProfile.update({
      where: { id: vendor.id },
      data: {
        ...vendorFields,
        ...(availability !== undefined ? { availability: availability as Prisma.InputJsonValue } : {}),
        metadata,
      },
    }),
    ...(phone !== undefined || avatarUrl !== undefined
      ? [
          prisma.user.update({
            where: { id: user.id },
            data: {
              ...(phone !== undefined ? { phone } : {}),
              ...(avatarUrl !== undefined ? { avatarUrl } : {}),
            },
          }),
        ]
      : []),
  ]);

  if (featuredImages !== undefined || featuredClips !== undefined) {
    const primaryListing = await prisma.listing.findFirst({
      where: { vendorId: vendor.id },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (primaryListing) {
      const existing = await prisma.portfolioMedia.findMany({
        where: { listingId: primaryListing.id },
        orderBy: { sortOrder: "asc" },
      });
      const images =
        featuredImages ??
        existing.filter((m) => !isVideoMedia(m)).map((m) => ({ url: m.url, publicId: m.publicId }));
      const clips =
        featuredClips ??
        existing.filter((m) => isVideoMedia(m)).map((m) => ({ url: m.url, publicId: m.publicId, resourceType: "video" }));
      await syncListingPortfolioMedia(vendor.id, primaryListing.id, images, clips);

      if (images.length) {
        await prisma.listing.update({
          where: { id: primaryListing.id },
          data: { images: images.map((m) => m.url) },
        });
      }
    }
  }

  await writeAuditLog({
    actorId: user.id,
    action: "VENDOR_PROFILE_UPDATED",
    entityType: "VendorProfile",
    entityId: vendor.id,
  });

  return jsonOk({ updated: true });
}

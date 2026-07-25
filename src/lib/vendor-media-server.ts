import "server-only";

import { prisma } from "@/lib/prisma";
import type { UploadedMedia } from "@/lib/vendor-media";

export async function syncListingPortfolioMedia(
  vendorId: string,
  listingId: string,
  images: UploadedMedia[],
  clips: UploadedMedia[] = []
) {
  await prisma.portfolioMedia.deleteMany({ where: { listingId } });

  const rows = [
    ...images.map((m, i) => ({
      vendorId,
      listingId,
      url: m.url,
      publicId: m.publicId,
      sortOrder: i,
    })),
    ...clips.map((m, i) => ({
      vendorId,
      listingId,
      url: m.url,
      publicId: m.publicId,
      sortOrder: images.length + i,
    })),
  ];

  if (rows.length) {
    await prisma.portfolioMedia.createMany({ data: rows });
  }
}

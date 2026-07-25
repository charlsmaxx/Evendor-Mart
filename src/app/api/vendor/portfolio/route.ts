import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { requireRole } from "@/lib/rbac";
import { addPortfolioSchema, deletePortfolioSchema, reorderPortfolioSchema, setPortfolioCoverSchema } from "@/lib/validations/portfolio";

async function getVendor(userId: string) {
  return prisma.vendorProfile.findUnique({ where: { userId } });
}

export async function GET() {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  try {
    await requireRole(user.id, ["VENDOR", "ADMIN"]);
  } catch {
    return jsonError("Forbidden", 403);
  }

  const vendor = await getVendor(user.id);
  if (!vendor) return jsonOk([]);

  const media = await prisma.portfolioMedia.findMany({
    where: { vendorId: vendor.id },
    include: { listing: { select: { id: true, title: true, slug: true } } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  const meta = (vendor.metadata as Record<string, unknown>) ?? {};

  return jsonOk({
    items: media,
    coverMediaId: (meta.portfolioCoverMediaId as string) ?? null,
  });
}

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  try {
    await requireRole(user.id, ["VENDOR", "ADMIN"]);
  } catch {
    return jsonError("Forbidden", 403);
  }

  const parsed = addPortfolioSchema.safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const vendor = await getVendor(user.id);
  if (!vendor) return jsonError("Vendor profile required", 400);

  if (parsed.data.listingId) {
    const listing = await prisma.listing.findUnique({ where: { id: parsed.data.listingId } });
    if (!listing || listing.vendorId !== vendor.id) {
      return jsonError("Listing not found", 404);
    }
  }

  const count = await prisma.portfolioMedia.count({ where: { vendorId: vendor.id } });
  const media = await prisma.portfolioMedia.create({
    data: {
      vendorId: vendor.id,
      listingId: parsed.data.listingId,
      url: parsed.data.url,
      publicId: parsed.data.publicId,
      sortOrder: count,
    },
    include: { listing: { select: { id: true, title: true, slug: true } } },
  });

  return jsonOk(media, 201);
}

export async function DELETE(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  try {
    await requireRole(user.id, ["VENDOR", "ADMIN"]);
  } catch {
    return jsonError("Forbidden", 403);
  }

  const id = req.nextUrl.searchParams.get("id");
  const parsed = deletePortfolioSchema.safeParse({ id });
  if (!parsed.success) return jsonError("Invalid id", 400);

  const vendor = await getVendor(user.id);
  if (!vendor) return jsonError("Vendor profile required", 400);

  const media = await prisma.portfolioMedia.findUnique({ where: { id: parsed.data.id } });
  if (!media || media.vendorId !== vendor.id) {
    return jsonError("Not found", 404);
  }

  await prisma.portfolioMedia.delete({ where: { id: parsed.data.id } });
  return jsonOk({ deleted: true });
}

export async function PATCH(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  try {
    await requireRole(user.id, ["VENDOR", "ADMIN"]);
  } catch {
    return jsonError("Forbidden", 403);
  }

  const vendor = await getVendor(user.id);
  if (!vendor) return jsonError("Vendor profile required", 400);

  const body = await req.json();

  if (body.mediaId) {
    const parsed = setPortfolioCoverSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message, 400);

    const media = await prisma.portfolioMedia.findUnique({ where: { id: parsed.data.mediaId } });
    if (!media || media.vendorId !== vendor.id) return jsonError("Not found", 404);

    const meta = (vendor.metadata as Record<string, unknown>) ?? {};
    await prisma.vendorProfile.update({
      where: { id: vendor.id },
      data: {
        metadata: { ...meta, portfolioCoverMediaId: media.id, portfolioCoverUrl: media.url },
      },
    });
    return jsonOk({ coverMediaId: media.id, coverUrl: media.url });
  }

  const parsed = reorderPortfolioSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  await prisma.$transaction(
    parsed.data.items.map((item) =>
      prisma.portfolioMedia.updateMany({
        where: { id: item.id, vendorId: vendor.id },
        data: { sortOrder: item.sortOrder },
      })
    )
  );

  return jsonOk({ reordered: true });
}

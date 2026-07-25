import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { requireRole } from "@/lib/rbac";
import { vendorReplySchema } from "@/lib/validations/review";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  try {
    await requireRole(user.id, ["VENDOR", "ADMIN"]);
  } catch {
    return jsonError("Forbidden", 403);
  }

  const { id } = await params;
  const parsed = vendorReplySchema.safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } });
  if (!vendor) return jsonError("Vendor profile required", 400);

  const review = await prisma.review.findUnique({
    where: { id },
    include: { listing: true },
  });

  if (!review || review.listing.vendorId !== vendor.id) {
    return jsonError("Review not found", 404);
  }

  const updated = await prisma.review.update({
    where: { id },
    data: {
      vendorReply: parsed.data.vendorReply,
      repliedAt: new Date(),
    },
    include: {
      user: { select: { fullName: true, avatarUrl: true } },
      listing: { select: { id: true, title: true, slug: true } },
    },
  });

  return jsonOk(updated);
}

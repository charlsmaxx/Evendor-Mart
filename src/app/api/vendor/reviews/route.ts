import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { requireRole } from "@/lib/rbac";

export async function GET() {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  try {
    await requireRole(user.id, ["VENDOR", "ADMIN"]);
  } catch {
    return jsonError("Forbidden", 403);
  }

  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } });
  if (!vendor) return jsonOk([]);

  const reviews = await prisma.review.findMany({
    where: { listing: { vendorId: vendor.id } },
    include: {
      user: { select: { fullName: true, avatarUrl: true } },
      listing: { select: { id: true, title: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return jsonOk(reviews);
}

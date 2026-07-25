import { NextRequest } from "next/server";
import { writeAuditLog } from "@/core/audit-engine";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { requireAdminSection } from "@/lib/rbac";
import { jsonOk, jsonError } from "@/lib/api-response";
import { buildPaginationMeta, parsePaginationParams } from "@/lib/pagination";
import { z } from "zod";

const patchSchema = z.object({
  vendorId: z.string().uuid(),
  verified: z.boolean().optional(),
  featured: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);
  try {
    await requireAdminSection(user, "vendors");
  } catch {
    return jsonError("Forbidden", 403);
  }

  const { page, limit } = parsePaginationParams(req.nextUrl.searchParams, { limit: 25 });

  const [vendors, total] = await Promise.all([
    prisma.vendorProfile.findMany({
      include: {
        user: { select: { email: true, fullName: true } },
        _count: { select: { listings: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.vendorProfile.count(),
  ]);

  const data = vendors.map(({ _count, ...vendor }) => ({
    ...vendor,
    listingCount: _count.listings,
  }));

  return jsonOk(data, 200, buildPaginationMeta(page, limit, total));
}

export async function PATCH(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);
  try {
    await requireAdminSection(user, "vendors");
  } catch {
    return jsonError("Forbidden", 403);
  }

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const vendor = await prisma.vendorProfile.update({
    where: { id: parsed.data.vendorId },
    data: {
      ...(parsed.data.verified !== undefined ? { verified: parsed.data.verified } : {}),
      ...(parsed.data.featured !== undefined ? { featured: parsed.data.featured } : {}),
    },
  });

  await writeAuditLog({
    actorId: user.id,
    action: "VENDOR_UPDATE",
    entityType: "VendorProfile",
    entityId: vendor.id,
    metadata: parsed.data,
  });

  return jsonOk(vendor);
}

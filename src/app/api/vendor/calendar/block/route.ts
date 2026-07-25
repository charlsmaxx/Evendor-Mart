import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { z } from "zod";

const schema = z.object({
  date: z.string(),
  reason: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } });
  if (!vendor) return jsonError("Vendor profile not found", 404);

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const date = new Date(parsed.data.date);
  if (isNaN(date.getTime())) return jsonError("Invalid date", 400);

  const blocked = await prisma.blockedDate.upsert({
    where: {
      // We create a compound unique-ish check via the findFirst fallback
      id: "dummy-never-matches",
    },
    update: {},
    create: {
      vendorId: vendor.id,
      date,
      reason: parsed.data.reason,
    },
  }).catch(async () => {
    // Fallback: just create if doesn't exist
    const existing = await prisma.blockedDate.findFirst({
      where: { vendorId: vendor.id, date: { gte: new Date(date.toDateString()), lte: new Date(date.toDateString() + " 23:59:59") } },
    });
    if (existing) return existing;
    return prisma.blockedDate.create({ data: { vendorId: vendor.id, date, reason: parsed.data.reason } });
  });

  return jsonOk(blocked, 201);
}

export async function DELETE(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } });
  if (!vendor) return jsonError("Vendor profile not found", 404);

  const { id } = await req.json().catch(() => ({})) as { id?: string };
  if (!id) return jsonError("Block ID required", 400);

  await prisma.blockedDate.deleteMany({ where: { id, vendorId: vendor.id } });
  return jsonOk({ deleted: true });
}

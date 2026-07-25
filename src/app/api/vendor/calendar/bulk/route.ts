import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { blockVendorDates } from "@/lib/vendor-calendar-batch";
import { z } from "zod";

const schema = z.object({
  dates: z.array(z.string()).min(1).max(31),
  reason: z.string().max(200).optional(),
});

const deleteSchema = z.object({
  ids: z.array(z.string()).min(1),
});

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } });
  if (!vendor) return jsonError("Vendor profile not found", 404);

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const result = await blockVendorDates(vendor.id, parsed.data.dates, parsed.data.reason);

  const dayStarts = parsed.data.dates
    .map((dateStr) => {
      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime())) return null;
      return new Date(date.toDateString());
    })
    .filter((d): d is Date => d !== null);

  const blocked =
    dayStarts.length > 0
      ? await prisma.blockedDate.findMany({
          where: { vendorId: vendor.id, date: { in: dayStarts } },
          orderBy: { date: "asc" },
        })
      : [];

  return jsonOk({ blocked, ...result }, 201);
}

export async function DELETE(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } });
  if (!vendor) return jsonError("Vendor profile not found", 404);

  const parsed = deleteSchema.safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const result = await prisma.blockedDate.deleteMany({
    where: { id: { in: parsed.data.ids }, vendorId: vendor.id },
  });

  return jsonOk({ deleted: result.count });
}

import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseAvailabilitySettings } from "@/lib/vendor-availability";
import type { Prisma } from "@prisma/client";

const patchSchema = z.object({
  workingHours: z.record(
    z.object({
      enabled: z.boolean(),
      start: z.string(),
      end: z.string(),
    })
  ).optional(),
  vacations: z.array(
    z.object({
      id: z.string(),
      start: z.string(),
      end: z.string(),
      label: z.string().optional(),
    })
  ).optional(),
});

export async function GET() {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const vendor = await prisma.vendorProfile.findUnique({
    where: { userId: user.id },
    include: { listings: { select: { id: true, title: true }, where: { status: { not: "ARCHIVED" } } } },
  });
  if (!vendor) return jsonError("Vendor not found", 404);

  return jsonOk({
    listings: vendor.listings,
    settings: parseAvailabilitySettings(vendor.availability),
  });
}

export async function PATCH(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } });
  if (!vendor) return jsonError("Vendor not found", 404);

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const current = parseAvailabilitySettings(vendor.availability);
  const nextSettings = {
    workingHours: parsed.data.workingHours ?? current.workingHours,
    vacations: parsed.data.vacations ?? current.vacations,
  };

  await prisma.vendorProfile.update({
    where: { id: vendor.id },
    data: { availability: nextSettings as Prisma.InputJsonValue },
  });

  return jsonOk({ settings: nextSettings });
}

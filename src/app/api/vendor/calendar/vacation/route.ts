import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { eachDayInRange, parseAvailabilitySettings } from "@/lib/vendor-availability";
import { blockVendorVacationDays } from "@/lib/vendor-calendar-batch";
import type { Prisma } from "@prisma/client";

const schema = z.object({
  start: z.string(),
  end: z.string(),
  label: z.string().max(120).optional(),
});

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } });
  if (!vendor) return jsonError("Vendor not found", 404);

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const days = eachDayInRange(parsed.data.start, parsed.data.end);
  if (days.length === 0) return jsonError("Invalid date range", 400);
  if (days.length > 60) return jsonError("Vacation cannot exceed 60 days", 400);

  const reason = parsed.data.label?.trim() || "Vacation / holiday";
  const vacationId = `vac-${Date.now()}`;
  const daysBlocked = days.length;

  await prisma.$transaction(async (tx) => {
    await blockVendorVacationDays(tx, vendor.id, days, reason);

    const settings = parseAvailabilitySettings(vendor.availability);
    settings.vacations.push({
      id: vacationId,
      start: parsed.data.start,
      end: parsed.data.end,
      label: parsed.data.label,
    });

    await tx.vendorProfile.update({
      where: { id: vendor.id },
      data: { availability: settings as Prisma.InputJsonValue },
    });
  });

  return jsonOk({ id: vacationId, daysBlocked }, 201);
}

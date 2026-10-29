import { prisma } from "@/lib/prisma";
import { calendarDateKey, parseCalendarDate } from "@/lib/calendar-date";

/** Block many calendar days in one transaction with minimal round-trips. */
export async function blockVendorDates(
  vendorId: string,
  dateStrings: string[],
  reason?: string
) {
  const uniqueDays = new Map<string, Date>();
  for (const dateString of dateStrings) {
    const date = parseCalendarDate(dateString);
    if (date) uniqueDays.set(calendarDateKey(date), date);
  }
  const dayStarts = [...uniqueDays.values()];

  if (dayStarts.length === 0) return { created: 0, skipped: 0 };

  const rangeStart = dayStarts.reduce(
    (min, d) => (d < min ? d : min),
    dayStarts[0]
  );
  const rangeEnd = new Date(
    dayStarts.reduce((max, d) => (d > max ? d : max), dayStarts[0]).getTime() + 86400000
  );

  const existing = await prisma.blockedDate.findMany({
    where: {
      vendorId,
      date: { gte: rangeStart, lt: rangeEnd },
    },
    select: { date: true },
  });

  const existingDays = new Set(existing.map((row) => calendarDateKey(row.date)));
  const toCreate = dayStarts
    .filter((day) => !existingDays.has(calendarDateKey(day)))
    .map((date) => ({
      vendorId,
      date,
      reason,
    }));

  if (toCreate.length > 0) {
    await prisma.blockedDate.createMany({ data: toCreate });
  }

  return {
    created: toCreate.length,
    skipped: dayStarts.length - toCreate.length,
  };
}

/** Block vacation range inside an existing transaction (updates vendor availability JSON). */
export async function blockVendorVacationDays(
  tx: Pick<typeof prisma, "blockedDate">,
  vendorId: string,
  days: Date[],
  reason: string
) {
  if (days.length === 0) return 0;

  const dayStarts = [...new Set(days.map((day) => new Date(day.toDateString()).toDateString()))].map(
    (s) => new Date(s)
  );
  const rangeStart = dayStarts.reduce((min, d) => (d < min ? d : min), dayStarts[0]);
  const rangeEnd = new Date(
    dayStarts.reduce((max, d) => (d > max ? d : max), dayStarts[0]).getTime() + 86400000
  );

  const existing = await tx.blockedDate.findMany({
    where: {
      vendorId,
      date: { gte: rangeStart, lt: rangeEnd },
    },
    select: { date: true },
  });

  const existingDays = new Set(existing.map((row) => row.date.toDateString()));
  const toCreate = dayStarts
    .filter((day) => !existingDays.has(day.toDateString()))
    .map((date) => ({
      vendorId,
      date,
      reason,
    }));

  if (toCreate.length > 0) {
    await tx.blockedDate.createMany({ data: toCreate });
  }

  return toCreate.length;
}

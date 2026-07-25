import { prisma } from "@/core/infrastructure/prisma";

export type RepeatCustomerStats = {
  totalCustomers: number;
  repeatCustomers: number;
  repeatCustomerRate: number;
};

/** Efficient repeat-customer metrics without loading all customerId groups into memory. */
export async function getRepeatCustomerStats(): Promise<RepeatCustomerStats> {
  const [totalRow, repeatRow] = await Promise.all([
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(DISTINCT "customerId")::int AS count
      FROM "Booking"
      WHERE "customerId" IS NOT NULL
    `,
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM (
        SELECT "customerId"
        FROM "Booking"
        WHERE "customerId" IS NOT NULL
        GROUP BY "customerId"
        HAVING COUNT(*) > 1
      ) AS repeats
    `,
  ]);

  const totalCustomers = totalRow[0]?.count ?? 0;
  const repeatCustomers = repeatRow[0]?.count ?? 0;
  const repeatCustomerRate =
    totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0;

  return { totalCustomers, repeatCustomers, repeatCustomerRate };
}

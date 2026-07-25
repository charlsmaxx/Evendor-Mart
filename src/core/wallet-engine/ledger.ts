/**
 * Vendor money ledger — the only place that decides what a vendor may withdraw.
 *
 * Three distinct pools, never mixed:
 *  - escrowHeld     customer paid, event not settled. Not the vendor's money yet.
 *  - releasedTotal  escrow released into the vendor's balance (one Payout row per booking).
 *  - withdrawn/inFlight  money already leaving (or gone) to the vendor's bank.
 *
 * available = released − withdrawn − inFlight
 */
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/core/infrastructure/prisma";

type Client = PrismaClient | Prisma.TransactionClient;

/** Payout rows that represent escrow actually released to the vendor. */
export const RELEASED_PAYOUT_STATUSES = ["PENDING", "PROCESSING", "PAID"] as const;

/** Withdrawals that have consumed balance but not yet settled. */
export const IN_FLIGHT_WITHDRAWAL_STATUSES = ["PENDING", "PROCESSING"] as const;

export type VendorBalance = {
  escrowHeld: number;
  releasedTotal: number;
  withdrawnTotal: number;
  inFlightTotal: number;
  availableBalance: number;
};

export async function computeVendorBalance(
  vendorId: string,
  client: Client = prisma
): Promise<VendorBalance> {
  const [heldPayments, releasedAgg, withdrawnAgg, inFlightAgg] = await Promise.all([
    // A reservation starts life with escrowStatus HELD before the customer pays,
    // so escrow must also require a successful charge.
    client.payment.findMany({
      where: {
        escrowStatus: "HELD",
        status: "SUCCESS",
        booking: { vendorId, status: { in: ["CONFIRMED", "IN_PROGRESS"] } },
      },
      select: { heldAmount: true, amount: true },
    }),
    client.payout.aggregate({
      where: { vendorId, status: { in: [...RELEASED_PAYOUT_STATUSES] } },
      _sum: { amount: true },
    }),
    client.withdrawal.aggregate({
      where: { vendorId, status: "PAID" },
      _sum: { amount: true },
    }),
    client.withdrawal.aggregate({
      where: { vendorId, status: { in: [...IN_FLIGHT_WITHDRAWAL_STATUSES] } },
      _sum: { amount: true },
    }),
  ]);

  const escrowHeld = heldPayments.reduce((sum, p) => sum + (p.heldAmount ?? p.amount), 0);
  const releasedTotal = releasedAgg._sum.amount ?? 0;
  const withdrawnTotal = withdrawnAgg._sum.amount ?? 0;
  const inFlightTotal = inFlightAgg._sum.amount ?? 0;

  return {
    escrowHeld,
    releasedTotal,
    withdrawnTotal,
    inFlightTotal,
    availableBalance: Math.max(0, releasedTotal - withdrawnTotal - inFlightTotal),
  };
}

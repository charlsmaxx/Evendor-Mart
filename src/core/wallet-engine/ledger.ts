/**
 * Vendor money ledger — leftover pre-MVP internal credits only.
 *
 * New completions create Payout PENDING (requestable). Those are NOT withdrawable
 * through the legacy Paystack transfer path.
 *
 * Legacy rows: status PAID with no paidById (internal credit before manual payouts).
 * Bank-settled rows: status PAID with paidById set — excluded so they cannot be paid twice.
 */
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/core/infrastructure/prisma";

type Client = PrismaClient | Prisma.TransactionClient;

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
    client.payment.findMany({
      where: {
        escrowStatus: "HELD",
        status: "SUCCESS",
        booking: { vendorId, status: { in: ["CONFIRMED", "IN_PROGRESS"] } },
      },
      select: { heldAmount: true, amount: true },
    }),
    client.payout.aggregate({
      where: { vendorId, status: "PAID", paidById: null },
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


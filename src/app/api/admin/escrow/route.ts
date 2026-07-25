import { requireAuth } from "@/lib/auth";
import { requireAdminSection } from "@/lib/rbac";
import { jsonOk, jsonError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);
  try {
    await requireAdminSection(user, "escrow");
  } catch {
    return jsonError("Forbidden", 403);
  }

  const [
    escrowHeld,
    pendingPayouts,
    releasedPayouts,
    disputedFunds,
    failedPayments,
    recentPayments,
    recentPayouts,
  ] = await Promise.all([
    prisma.payment.aggregate({
      where: { escrowStatus: "HELD" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payout.findMany({
      where: { status: "PENDING" },
      include: {
        booking: {
          select: {
            id: true,
            totalAmount: true,
            eventDate: true,
            listing: { select: { title: true } },
          },
        },
        vendor: { select: { businessName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.payout.aggregate({
      where: { status: { in: ["PAID", "PROCESSING"] } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: { escrowStatus: "DISPUTED" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payment.findMany({
      where: { status: "FAILED" },
      include: {
        booking: {
          select: {
            id: true,
            listing: { select: { title: true } },
            customer: { select: { fullName: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        booking: {
          select: {
            id: true,
            listing: { select: { title: true } },
            customer: { select: { fullName: true } },
          },
        },
      },
    }),
    prisma.payout.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        vendor: { select: { businessName: true } },
        booking: { select: { listing: { select: { title: true } } } },
      },
    }),
  ]);

  return jsonOk({
    escrowBalance: escrowHeld._sum.amount ?? 0,
    escrowCount: escrowHeld._count,
    pendingPayouts,
    releasedTotal: releasedPayouts._sum.amount ?? 0,
    releasedCount: releasedPayouts._count,
    disputedFunds: disputedFunds._sum.amount ?? 0,
    disputedCount: disputedFunds._count,
    failedPayments,
    recentPayments: recentPayments.map((p) => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      escrowStatus: p.escrowStatus,
      paystackRef: p.paystackRef,
      createdAt: p.createdAt.toISOString(),
      bookingId: p.bookingId,
      listingTitle: p.booking.listing.title,
      customerName: p.booking.customer?.fullName ?? null,
    })),
    recentPayouts: recentPayouts.map((p) => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      reference: p.reference,
      vendorName: p.vendor.businessName,
      listingTitle: p.booking.listing.title,
      createdAt: p.createdAt.toISOString(),
    })),
  });
}

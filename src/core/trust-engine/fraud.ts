import { prisma } from "@/core/infrastructure/prisma";

export type FraudFlag = {
  id: string;
  type: string;
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  entityType: "vendor" | "customer" | "booking" | "payment";
  entityId: string;
  metadata?: Record<string, unknown>;
  detectedAt: string;
};

export async function detectFraudFlags(): Promise<FraudFlag[]> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const [
    highCancelVendors,
    highDisputeVendors,
    newVendorBigBookings,
    priceAnomalyBookings,
    repeatDisputeCustomers,
    failedPaymentGroups,
    heavyRewardRedeemers,
  ] = await Promise.all([
    prisma.vendorProfile.findMany({
      where: { cancellationRate: { gte: 30 } },
      select: { id: true, businessName: true, cancellationRate: true, verified: true },
      take: 10,
    }),
    prisma.vendorProfile.findMany({
      where: { disputeRate: { gte: 15 } },
      select: { id: true, businessName: true, disputeRate: true, verified: true },
      take: 10,
    }),
    prisma.booking.findMany({
      where: {
        totalAmount: { gte: 500_000 },
        createdAt: { gte: thirtyDaysAgo },
        vendor: { createdAt: { gte: thirtyDaysAgo } },
      },
      include: {
        vendor: { select: { id: true, businessName: true } },
        listing: { select: { title: true } },
        customer: { select: { fullName: true, email: true } },
      },
      take: 10,
      orderBy: { totalAmount: "desc" },
    }),
    prisma.booking.findMany({
      where: {
        createdAt: { gte: ninetyDaysAgo },
        status: { notIn: ["CANCELLED", "DECLINED", "EXPIRED"] },
      },
      include: {
        listing: { select: { title: true, priceMax: true } },
        vendor: { select: { businessName: true } },
      },
      take: 50,
      orderBy: { createdAt: "desc" },
    }),
    prisma.dispute.groupBy({
      by: ["raisedById"],
      where: { createdAt: { gte: ninetyDaysAgo } },
      _count: { id: true },
      having: { id: { _count: { gte: 3 } } },
    }),
    prisma.payment.groupBy({
      by: ["bookingId"],
      where: { status: "FAILED", createdAt: { gte: ninetyDaysAgo } },
      _count: { id: true },
    }),
    prisma.rewardTransaction.groupBy({
      by: ["walletId"],
      where: { type: "REDEEMED", createdAt: { gte: ninetyDaysAgo } },
      _sum: { amount: true },
      having: { amount: { _sum: { gte: 50_000 } } },
    }),
  ]);

  const flags: FraudFlag[] = [];

  for (const v of highCancelVendors) {
    flags.push({
      id: `cancel-${v.id}`,
      type: "HIGH_CANCELLATION",
      severity: (v.cancellationRate ?? 0) >= 50 ? "high" : "medium",
      title: "High cancellation rate",
      description: `${v.businessName} has ${v.cancellationRate ?? 0}% cancellations`,
      entityType: "vendor",
      entityId: v.id,
      metadata: { cancellationRate: v.cancellationRate, verified: v.verified },
      detectedAt: now.toISOString(),
    });
  }

  for (const v of highDisputeVendors) {
    if (flags.some((f) => f.entityId === v.id && f.entityType === "vendor")) continue;
    flags.push({
      id: `dispute-${v.id}`,
      type: "HIGH_DISPUTE_RATE",
      severity: (v.disputeRate ?? 0) >= 25 ? "high" : "medium",
      title: "Elevated dispute rate",
      description: `${v.businessName} has ${v.disputeRate ?? 0}% disputes`,
      entityType: "vendor",
      entityId: v.id,
      metadata: { disputeRate: v.disputeRate, verified: v.verified },
      detectedAt: now.toISOString(),
    });
  }

  for (const b of newVendorBigBookings) {
    flags.push({
      id: `new-vendor-booking-${b.id}`,
      type: "NEW_VENDOR_HIGH_VALUE",
      severity: b.totalAmount >= 1_000_000 ? "high" : "medium",
      title: "New vendor, high-value booking",
      description: `${b.vendor.businessName} — ${b.listing.title} at ₦${b.totalAmount.toLocaleString()}`,
      entityType: "booking",
      entityId: b.id,
      metadata: { vendorId: b.vendor.id, amount: b.totalAmount },
      detectedAt: b.createdAt.toISOString(),
    });
  }

  for (const b of priceAnomalyBookings) {
    const max = b.listing.priceMax;
    if (max > 0 && b.totalAmount > max * 2) {
      flags.push({
        id: `price-anomaly-${b.id}`,
        type: "PRICE_ANOMALY",
        severity: b.totalAmount > max * 3 ? "high" : "medium",
        title: "Booking exceeds listing price",
        description: `${b.listing.title} at ₦${b.totalAmount.toLocaleString()} (max ₦${max.toLocaleString()})`,
        entityType: "booking",
        entityId: b.id,
        metadata: { vendor: b.vendor.businessName, listedMax: max },
        detectedAt: b.createdAt.toISOString(),
      });
    }
  }

  if (repeatDisputeCustomers.length) {
    const users = await prisma.user.findMany({
      where: { id: { in: repeatDisputeCustomers.map((r) => r.raisedById) } },
      select: { id: true, fullName: true, email: true },
    });
    for (const row of repeatDisputeCustomers) {
      const u = users.find((x) => x.id === row.raisedById);
      flags.push({
        id: `repeat-disputes-${row.raisedById}`,
        type: "REPEAT_DISPUTES",
        severity: row._count.id >= 5 ? "high" : "medium",
        title: "Repeat dispute filer",
        description: `${u?.fullName ?? u?.email ?? "Customer"} — ${row._count.id} disputes in 90 days`,
        entityType: "customer",
        entityId: row.raisedById,
        metadata: { disputeCount: row._count.id },
        detectedAt: now.toISOString(),
      });
    }
  }

  if (failedPaymentGroups.length >= 3) {
    flags.push({
      id: "failed-payments-spike",
      type: "FAILED_PAYMENTS",
      severity: failedPaymentGroups.length >= 8 ? "high" : "medium",
      title: "Multiple failed payments",
      description: `${failedPaymentGroups.length} failed payment bookings in 90 days`,
      entityType: "payment",
      entityId: "platform",
      metadata: { count: failedPaymentGroups.length },
      detectedAt: now.toISOString(),
    });
  }

  if (heavyRewardRedeemers.length) {
    flags.push({
      id: "heavy-reward-redemption",
      type: "REWARD_ABUSE",
      severity: "medium",
      title: "Heavy rewards redemption",
      description: `${heavyRewardRedeemers.length} wallet(s) redeemed ₦50k+ in 90 days`,
      entityType: "customer",
      entityId: heavyRewardRedeemers[0].walletId,
      metadata: { walletCount: heavyRewardRedeemers.length },
      detectedAt: now.toISOString(),
    });
  }

  const severityOrder = { high: 0, medium: 1, low: 2 };
  return flags.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

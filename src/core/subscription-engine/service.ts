import "server-only";
import type { SubscriptionTier } from "@prisma/client";
import { prisma } from "@/core/infrastructure/prisma";
import {
  type PremiumFeature,
  PremiumRequiredError,
} from "@/core/subscription-engine/types";

export { PremiumRequiredError };
export type { PremiumFeature };
export { PREMIUM_FEATURE_LABELS, isPremiumFeature } from "@/core/subscription-engine/types";

export async function getVendorSubscriptionTier(vendorId: string): Promise<SubscriptionTier> {
  const vendor = await prisma.vendorProfile.findUnique({
    where: { id: vendorId },
    select: { subscriptionTier: true },
  });
  return vendor?.subscriptionTier ?? "FREE";
}

export function isPremiumTier(tier: SubscriptionTier): boolean {
  return tier === "PREMIUM";
}

export async function vendorHasPremium(vendorId: string): Promise<boolean> {
  const tier = await getVendorSubscriptionTier(vendorId);
  return isPremiumTier(tier);
}

/** Server-side gate — throws PremiumRequiredError when not PREMIUM. */
export async function requirePremium(vendorId: string, feature: PremiumFeature): Promise<void> {
  const tier = await getVendorSubscriptionTier(vendorId);
  if (!isPremiumTier(tier)) {
    throw new PremiumRequiredError(feature);
  }
}

export type SubscriptionCheckoutContext = {
  vendorId: string;
  userId: string;
};

/** Activate premium after successful Paystack payment (also used by admin/dev). */
export async function activatePremiumSubscription(
  vendorId: string,
  opts?: { paystackSubCode?: string; amount?: number; periodDays?: number }
) {
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setDate(periodEnd.getDate() + (opts?.periodDays ?? 30));

  await prisma.$transaction(async (tx) => {
    await tx.vendorProfile.update({
      where: { id: vendorId },
      data: { subscriptionTier: "PREMIUM" },
    });

    const pending = await tx.subscription.findFirst({
      where: { vendorId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });

    if (pending) {
      await tx.subscription.update({
        where: { id: pending.id },
        data: {
          tier: "PREMIUM",
          status: "ACTIVE",
          paystackSubCode: opts?.paystackSubCode ?? pending.paystackSubCode,
          amount: opts?.amount ?? pending.amount,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      });
      return;
    }

    await tx.subscription.create({
      data: {
        vendorId,
        tier: "PREMIUM",
        status: "ACTIVE",
        paystackSubCode: opts?.paystackSubCode,
        amount: opts?.amount ?? 500000,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });
  });
}

export async function getVendorSubscriptionSummary(vendorId: string) {
  const vendor = await prisma.vendorProfile.findUnique({
    where: { id: vendorId },
    select: {
      subscriptionTier: true,
      subscriptions: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!vendor) return null;
  const active = vendor.subscriptions[0];
  return {
    tier: vendor.subscriptionTier,
    isPremium: vendor.subscriptionTier === "PREMIUM",
    currentPeriodEnd: active?.currentPeriodEnd?.toISOString() ?? null,
    hasPremiumBadge: vendor.subscriptionTier === "PREMIUM",
    hasPriorityRanking: vendor.subscriptionTier === "PREMIUM",
  };
}

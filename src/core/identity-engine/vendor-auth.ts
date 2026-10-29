import { cache } from "react";
import { prisma } from "@/core/infrastructure/prisma";
import { requireAuth } from "./auth";
import { findByAuthenticatedUserId } from "./auth-utils";

export const getVendorByUserId = cache(async (userId: string) => {
  return findByAuthenticatedUserId(userId, (validUserId) =>
    prisma.vendorProfile.findUnique({
      where: { userId: validUserId },
      include: { verificationRequest: { select: { status: true } } },
    })
  );
});

export async function requireVendor() {
  const user = await requireAuth();
  if (!user) return null;

  const vendor = await getVendorByUserId(user.id);
  if (!vendor) return null;

  return { user, vendor };
}

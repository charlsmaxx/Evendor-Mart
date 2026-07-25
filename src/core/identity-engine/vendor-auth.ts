import { cache } from "react";
import { prisma } from "@/core/infrastructure/prisma";
import { requireAuth } from "./auth";

export const getVendorByUserId = cache(async (userId: string) => {
  return prisma.vendorProfile.findUnique({
    where: { userId },
    include: { verificationRequest: { select: { status: true } } },
  });
});

export async function requireVendor() {
  const user = await requireAuth();
  if (!user) return null;

  const vendor = await getVendorByUserId(user.id);
  if (!vendor) return null;

  return { user, vendor };
}

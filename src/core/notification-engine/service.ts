import { prisma } from "@/core/infrastructure/prisma";

type NotifyInput = {
  userId: string;
  title: string;
  body: string;
  link?: string;
};

/** Fire-and-forget in-app notification. Never throws. */
export async function notifyUser(input: NotifyInput) {
  try {
    await prisma.notification.create({ data: input });
  } catch {
    /* non-blocking */
  }
}

export async function notifyVendorByProfileId(
  vendorProfileId: string,
  input: Omit<NotifyInput, "userId">
) {
  const vendor = await prisma.vendorProfile.findUnique({
    where: { id: vendorProfileId },
    select: { userId: true },
  });
  if (!vendor) return;
  await notifyUser({ userId: vendor.userId, ...input });
}

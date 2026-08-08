import { prisma } from "@/core/infrastructure/prisma";

type NotifyInput = {
  userId: string;
  title: string;
  body: string;
  link?: string;
};

/** Fire-and-forget in-app notification (+ optional web push). Never throws. */
export async function notifyUser(input: NotifyInput) {
  try {
    await prisma.notification.create({ data: input });
  } catch {
    /* non-blocking */
    return;
  }

  // Lazy-load so this module stays safe for any accidental client import paths.
  void import("./web-push")
    .then(({ sendWebPushToUser }) => sendWebPushToUser(input))
    .catch((err) => {
      console.error("[notifyUser] web push failed:", err);
    });
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

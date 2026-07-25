import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

/** GDPR-style data export for the authenticated user. */
export async function GET() {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const [profile, bookings, favorites, notifications, rewards, messages] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          city: true,
          role: true,
          termsAcceptedAt: true,
          createdAt: true,
          updatedAt: true,
          vendorProfile: {
            select: {
              businessName: true,
              city: true,
              verified: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.booking.findMany({
        where: { customerId: user.id },
        select: {
          id: true,
          status: true,
          eventDate: true,
          totalAmount: true,
          depositAmount: true,
          createdAt: true,
          listing: { select: { title: true } },
          vendor: { select: { businessName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
      prisma.favorite.findMany({
        where: { userId: user.id },
        include: { listing: { select: { title: true, slug: true } } },
        take: 500,
      }),
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.rewardsWallet.findUnique({
        where: { userId: user.id },
        include: {
          transactions: { orderBy: { createdAt: "desc" }, take: 200 },
        },
      }),
      prisma.message.findMany({
        where: { senderId: user.id },
        select: {
          id: true,
          body: true,
          createdAt: true,
          conversationId: true,
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
    ]);

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      profile,
      bookings,
      favorites,
      notifications,
      rewards,
      messagesSent: messages,
    };

  return new Response(JSON.stringify(exportPayload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="evendor-export-${user.id.slice(0, 8)}.json"`,
    },
  });
}

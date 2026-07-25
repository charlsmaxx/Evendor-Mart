import { prisma } from "@/core/infrastructure/prisma";
import type { UserRole } from "@prisma/client";

/** Conversations with unread inbound messages (for vendors: from customers). */
export async function getVendorUnreadConversationCount(vendorUserId: string) {
  const vendor = await prisma.vendorProfile.findUnique({
    where: { userId: vendorUserId },
    select: { id: true },
  });
  if (!vendor) return 0;

  const groups = await prisma.message.groupBy({
    by: ["conversationId"],
    where: {
      readAt: null,
      senderId: { not: vendorUserId },
      conversation: { vendorId: vendor.id },
    },
  });

  return groups.length;
}

/** Conversations with unread inbound messages (for customers: from vendors). */
export async function getCustomerUnreadConversationCount(customerUserId: string) {
  const groups = await prisma.message.groupBy({
    by: ["conversationId"],
    where: {
      readAt: null,
      senderId: { not: customerUserId },
      conversation: { customerId: customerUserId },
    },
  });

  return groups.length;
}

/** Conversations with new activity since admin last opened the thread. */
export async function getAdminUnreadConversationCount(adminUserId: string) {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "Conversation" c
    INNER JOIN LATERAL (
      SELECT m."senderId", m."createdAt"
      FROM "Message" m
      WHERE m."conversationId" = c.id
      ORDER BY m."createdAt" DESC
      LIMIT 1
    ) last ON true
    WHERE last."senderId" <> ${adminUserId}
      AND last."createdAt" > COALESCE(c."adminLastReadAt", TIMESTAMP '1970-01-01')
  `;
  return Number(rows[0]?.count ?? 0);
}

export async function getUnreadConversationCount(userId: string, role: UserRole) {
  if (role === "ADMIN") return getAdminUnreadConversationCount(userId);

  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(DISTINCT m."conversationId")::bigint AS count
    FROM "Message" m
    INNER JOIN "Conversation" c ON c.id = m."conversationId"
    LEFT JOIN "VendorProfile" v ON v."userId" = ${userId}
    WHERE m."readAt" IS NULL
      AND m."senderId" <> ${userId}
      AND (
        c."customerId" = ${userId}
        OR (v.id IS NOT NULL AND c."vendorId" = v.id)
      )
  `;
  return Number(rows[0]?.count ?? 0);
}

export async function markConversationRead(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { vendor: true },
  });
  if (!conversation) return false;
  if (
    conversation.customerId !== userId &&
    conversation.vendor.userId !== userId
  ) {
    return false;
  }

  await prisma.message.updateMany({
    where: {
      conversationId,
      senderId: { not: userId },
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  return true;
}

export async function markAdminConversationRead(conversationId: string, adminUserId: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) return false;

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { adminLastReadAt: new Date() },
  });

  return true;
}

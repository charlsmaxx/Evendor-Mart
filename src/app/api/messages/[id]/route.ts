import { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";

import { requireAuth } from "@/lib/auth";

import { jsonOk, jsonError } from "@/lib/api-response";

import {

  canAccessConversation,

  getConversationPeerAvatar,

  getConversationPeerName,

  serializeMessage,

  MESSAGE_PAGE_SIZE,

} from "@/lib/messages-access";



export async function GET(

  req: NextRequest,

  { params }: { params: Promise<{ id: string }> }

) {

  const user = await requireAuth();

  if (!user) return jsonError("Unauthorized", 401);



  const { id } = await params;

  const limit = Math.min(

    Number(req.nextUrl.searchParams.get("limit") ?? MESSAGE_PAGE_SIZE),

    MESSAGE_PAGE_SIZE

  );

  const before = req.nextUrl.searchParams.get("before");



  const conversation = await prisma.conversation.findUnique({

    where: { id },

    include: {

      vendor: true,

      customer: { select: { fullName: true, email: true, avatarUrl: true } },

      listing: { select: { title: true, slug: true } },

    },

  });



  if (!conversation) return jsonError("Conversation not found", 404);

  if (!canAccessConversation(user, conversation)) return jsonError("Forbidden", 403);



  const cursorMessage = before
    ? await prisma.message.findFirst({
        where: { id: before, conversationId: id },
        select: { createdAt: true },
      })
    : null;

  if (before && !cursorMessage) return jsonError("Invalid cursor", 400);

  const [messages, totalMessages] = await Promise.all([
    prisma.message.findMany({
      where: {
        conversationId: id,
        ...(cursorMessage ? { createdAt: { lt: cursorMessage.createdAt } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        sender: { select: { fullName: true, role: true, avatarUrl: true } },
      },
    }),
    prisma.message.count({ where: { conversationId: id } }),
  ]);

  const serialized = messages.reverse().map(serializeMessage);
  const oldestId = serialized[0]?.id ?? null;

  return jsonOk({
    id: conversation.id,
    peerName: getConversationPeerName(user, conversation),
    peerAvatar: getConversationPeerAvatar(user, conversation),
    listing: conversation.listing,
    vendor: { businessName: conversation.vendor.businessName, slug: conversation.vendor.slug },
    customer: {
      fullName: conversation.customer.fullName,
      avatarUrl: conversation.customer.avatarUrl,
    },
    messages: serialized,
    hasMore: cursorMessage
      ? messages.length === limit
      : totalMessages > limit,
    nextCursor: oldestId,
    totalMessages,
  });
}



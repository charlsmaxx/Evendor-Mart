import { NextRequest } from "next/server";
import type { MessageType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiRoute } from "@/lib/api-response";
import { createMessageSchema, startConversationSchema } from "@/lib/validations/message";
import { messageLimiter, checkRateLimit } from "@/lib/rate-limit";
import {
  canAccessConversation,
  getConversationPeerAvatar,
  getConversationPeerName,
  isAdmin,
  serializeMessage,
  sortConversations,
} from "@/lib/messages-access";
import { emitDomainEvent } from "@/core/events";
import { buildPaginationMeta, parsePaginationParams } from "@/lib/pagination";

export async function GET(req: NextRequest) {
  return handleApiRoute(async () => {
    const user = await requireAuth();
    if (!user) return jsonError("Unauthorized", 401);

    const { page, limit } = parsePaginationParams(req.nextUrl.searchParams, { limit: 30 });

    const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } });

    // Dual-role users (vendor who also books) need both customer and vendor inboxes.
    const where = vendor
      ? { OR: [{ customerId: user.id }, { vendorId: vendor.id }] }
      : { customerId: user.id };

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
          vendor: { select: { businessName: true, slug: true, userId: true } },
          customer: { select: { fullName: true, email: true, avatarUrl: true } },
          listing: { select: { title: true, slug: true } },
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.conversation.count({ where }),
    ]);

    const items = sortConversations(
      conversations.map((c) => {
        const isVendorViewer = vendor?.id === c.vendorId;
        const pinnedAt = isVendorViewer ? c.vendorPinnedAt : c.customerPinnedAt;
        return {
          id: c.id,
          peerName: getConversationPeerName(user, c),
          peerAvatar: getConversationPeerAvatar(user, c),
          listing: c.listing,
          asVendor: isVendorViewer,
          updatedAt: c.updatedAt.toISOString(),
          pinnedAt: pinnedAt?.toISOString() ?? null,
          lastMessage: c.messages[0]
            ? {
                body: c.messages[0].body,
                type: c.messages[0].type,
                mediaUrl: c.messages[0].mediaUrl,
                createdAt: c.messages[0].createdAt.toISOString(),
              }
            : null,
        };
      })
    );

    return jsonOk(items, 200, buildPaginationMeta(page, limit, total));
  });
}

export async function POST(req: NextRequest) {
  return handleApiRoute(async () => {
    const user = await requireAuth();
    if (!user) return jsonError("Unauthorized", 401);

    const rate = await checkRateLimit(messageLimiter, user.id);
    if (!rate.success) return jsonError("Rate limit exceeded", 429);

    const body = await req.json();

    if (body.conversationId) {
      const parsed = createMessageSchema.safeParse(body);
      if (!parsed.success) return jsonError(parsed.error.message, 400);

      const conv = await prisma.conversation.findUnique({
        where: { id: parsed.data.conversationId },
        include: { vendor: true },
      });
      if (!conv) return jsonError("Conversation not found", 404);
      if (!canAccessConversation(user, conv)) return jsonError("Forbidden", 403);
      if (isAdmin(user) && conv.customerId === user.id) {
        return jsonError("Admins should use the admin messages panel to reply", 400);
      }

      const messageType = (
        parsed.data.mediaUrl
          ? parsed.data.messageType === "DOCUMENT"
            ? "DOCUMENT"
            : "IMAGE"
          : isAdmin(user)
            ? "ADMIN"
            : "TEXT"
      ) as MessageType;

      const message = await prisma.message.create({
        data: {
          conversationId: conv.id,
          senderId: user.id,
          body: parsed.data.body,
          type: messageType,
          mediaUrl: parsed.data.mediaUrl,
          mediaPublicId: parsed.data.mediaPublicId,
        },
        include: {
          sender: { select: { fullName: true, role: true, avatarUrl: true } },
        },
      });

      await prisma.conversation.update({
        where: { id: conv.id },
        data: { updatedAt: new Date() },
      });

      const recipientId = conv.customerId === user.id ? conv.vendor.userId : conv.customerId;
      const senderName = message.sender.fullName ?? "Someone";
      // Don't block the chat response on push/email delivery.
      void emitDomainEvent({
        type: "MessageReceived",
        payload: {
          recipientId,
          senderName,
          conversationId: conv.id,
          preview: parsed.data.body.slice(0, 120) || "You received a new message.",
        },
      });

      return jsonOk(serializeMessage(message), 201);
    }

    const start = startConversationSchema.safeParse(body);
    if (!start.success) return jsonError(start.error.message, 400);

    const vendorProfile = await prisma.vendorProfile.findUnique({
      where: { id: start.data.vendorId },
    });
    if (!vendorProfile) return jsonError("Vendor not found", 404);
    if (vendorProfile.userId === user.id) {
      return jsonError("You cannot message your own business", 400);
    }

    let conv = await prisma.conversation.findUnique({
      where: {
        customerId_vendorId: {
          customerId: user.id,
          vendorId: start.data.vendorId,
        },
      },
    });

    if (!conv) {
      conv = await prisma.conversation.create({
        data: {
          customerId: user.id,
          vendorId: start.data.vendorId,
          listingId: start.data.listingId,
        },
      });
    }

    if (start.data.body) {
      await prisma.message.create({
        data: {
          conversationId: conv.id,
          senderId: user.id,
          body: start.data.body,
          type: "TEXT",
        },
      });
    }

    return jsonOk(conv, 201);
  });
}

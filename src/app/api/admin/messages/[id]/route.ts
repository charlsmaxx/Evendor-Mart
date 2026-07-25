import { NextRequest } from "next/server";
import type { MessageType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { requireAdminSection } from "@/lib/rbac";
import { messageLimiter, checkRateLimit } from "@/lib/rate-limit";
import { adminMessageSchema } from "@/lib/validations/message";
import { serializeMessage, MESSAGE_PAGE_SIZE } from "@/lib/messages-access";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  try {
    await requireAdminSection(user, "messages");
  } catch {
    return jsonError("Forbidden", 403);
  }

  const { id } = await params;
  const limit = MESSAGE_PAGE_SIZE;
  const before = req.nextUrl.searchParams.get("before");

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      vendor: { select: { businessName: true, slug: true } },
      customer: { select: { fullName: true, email: true, avatarUrl: true } },
      listing: { select: { title: true, slug: true } },
    },
  });

  if (!conversation) return jsonError("Conversation not found", 404);

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

  return jsonOk({
    id: conversation.id,
    customerName: conversation.customer.fullName ?? conversation.customer.email.split("@")[0],
    vendorName: conversation.vendor.businessName,
    listing: conversation.listing,
    messages: serialized,
    hasMore: cursorMessage ? messages.length === limit : totalMessages > limit,
    nextCursor: serialized[0]?.id ?? null,
    totalMessages,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  try {
    await requireAdminSection(user, "messages");
  } catch {
    return jsonError("Forbidden", 403);
  }

  const rate = await checkRateLimit(messageLimiter, user.id);
  if (!rate.success) return jsonError("Rate limit exceeded", 429);

  const { id } = await params;
  const parsed = adminMessageSchema.safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) return jsonError("Conversation not found", 404);

  const message = await prisma.message.create({
    data: {
      conversationId: id,
      senderId: user.id,
      body: parsed.data.body,
      type: (
        parsed.data.mediaUrl
          ? parsed.data.messageType === "DOCUMENT"
            ? "DOCUMENT"
            : "IMAGE"
          : "ADMIN"
      ) as MessageType,
      mediaUrl: parsed.data.mediaUrl,
      mediaPublicId: parsed.data.mediaPublicId,
    },
    include: {
      sender: { select: { fullName: true, role: true, avatarUrl: true } },
    },
  });

  await prisma.conversation.update({
    where: { id },
    data: { updatedAt: new Date() },
  });

  return jsonOk(serializeMessage(message), 201);
}

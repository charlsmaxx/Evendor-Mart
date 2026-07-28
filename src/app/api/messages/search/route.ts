import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import {
  getConversationPeerName,
  serializeMessage,
} from "@/lib/messages-access";

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return jsonError("Search query must be at least 2 characters", 400);
  if (q.length > 100) return jsonError("Search query too long", 400);

  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } });

  const conversationFilter = vendor
    ? { OR: [{ customerId: user.id }, { vendorId: vendor.id }] }
    : { customerId: user.id };

  const messages = await prisma.message.findMany({
    where: {
      body: { contains: q, mode: "insensitive" },
      conversation: conversationFilter,
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      conversation: {
        include: {
          vendor: { select: { businessName: true, slug: true, userId: true } },
          customer: { select: { fullName: true, email: true, avatarUrl: true } },
          listing: { select: { title: true } },
        },
      },
      sender: { select: { fullName: true, role: true, avatarUrl: true } },
    },
  });

  return jsonOk(
    messages.map((m) => ({
      message: serializeMessage(m),
      conversationId: m.conversationId,
      peerName: getConversationPeerName(user, m.conversation),
      listingTitle: m.conversation.listing?.title ?? null,
    }))
  );
}

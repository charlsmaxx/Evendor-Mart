import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { requireAdminSection } from "@/lib/rbac";

export async function GET() {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  try {
    await requireAdminSection(user, "messages");
  } catch {
    return jsonError("Forbidden", 403);
  }

  const conversations = await prisma.conversation.findMany({
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      vendor: { select: { businessName: true, slug: true } },
      customer: { select: { fullName: true, email: true, avatarUrl: true } },
      listing: { select: { title: true, slug: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return jsonOk(
    conversations.map((c) => ({
      id: c.id,
      peerName: `${c.customer.fullName ?? c.customer.email.split("@")[0]} ↔ ${c.vendor.businessName}`,
      customerName: c.customer.fullName ?? c.customer.email.split("@")[0],
      vendorName: c.vendor.businessName,
      listing: c.listing,
      updatedAt: c.updatedAt.toISOString(),
      lastMessage: c.messages[0]
        ? {
            body: c.messages[0].body,
            type: c.messages[0].type,
            createdAt: c.messages[0].createdAt.toISOString(),
          }
        : null,
    }))
  );
}

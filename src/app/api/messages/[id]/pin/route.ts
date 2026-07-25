import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { z } from "zod";
import {
  canAccessConversation,
} from "@/lib/messages-access";

const pinSchema = z.object({ pinned: z.boolean() });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const parsed = pinSchema.safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: { vendor: true },
  });
  if (!conversation) return jsonError("Conversation not found", 404);
  if (!canAccessConversation(user, conversation)) return jsonError("Forbidden", 403);

  const isVendor = conversation.vendor.userId === user.id;
  const pinnedAt = parsed.data.pinned ? new Date() : null;

  const updated = await prisma.conversation.update({
    where: { id },
    data: isVendor ? { vendorPinnedAt: pinnedAt } : { customerPinnedAt: pinnedAt },
  });

  return jsonOk({
    id: updated.id,
    pinned: !!pinnedAt,
    pinnedAt: pinnedAt?.toISOString() ?? null,
  });
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { getUploadSignature, isCloudinaryConfigured } from "@/lib/cloudinary";
import { canAccessConversation } from "@/lib/messages-access";
import { chatUploadSignSchema } from "@/lib/validations/message";

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const parsed = chatUploadSignSchema.safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const conversation = await prisma.conversation.findUnique({
    where: { id: parsed.data.conversationId },
    include: { vendor: true },
  });
  if (!conversation) return jsonError("Conversation not found", 404);
  if (!canAccessConversation(user, conversation)) return jsonError("Forbidden", 403);

  if (!isCloudinaryConfigured()) {
    return jsonError(
      "Image uploads are not configured. Add Cloudinary credentials to .env.local.",
      503,
      "CLOUDINARY_NOT_CONFIGURED"
    );
  }

  const sig = getUploadSignature(`evendor/chat/${conversation.id}`);
  return jsonOk(sig);
}

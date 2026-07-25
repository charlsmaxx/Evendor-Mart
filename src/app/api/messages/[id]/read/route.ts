import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { markConversationRead } from "@/lib/message-unread";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const ok = await markConversationRead(id, user.id);
  if (!ok) return jsonError("Conversation not found", 404);

  return jsonOk({ read: true });
}

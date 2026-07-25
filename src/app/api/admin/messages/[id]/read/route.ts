import { requireAuth } from "@/lib/auth";
import { requireAdminSection } from "@/lib/rbac";
import { jsonOk, jsonError } from "@/lib/api-response";
import { markAdminConversationRead } from "@/lib/message-unread";

export async function POST(
  _req: Request,
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
  const ok = await markAdminConversationRead(id, user.id);
  if (!ok) return jsonError("Conversation not found", 404);

  return jsonOk({ read: true });
}

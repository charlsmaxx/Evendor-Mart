import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiRoute } from "@/lib/api-response";
import { getUnreadConversationCount } from "@/lib/message-unread";

export async function GET() {
  return handleApiRoute(async () => {
    const user = await requireAuth();
    if (!user) return jsonError("Unauthorized", 401);

    const count = await getUnreadConversationCount(user.id, user.role);
    return jsonOk({ count });
  });
}

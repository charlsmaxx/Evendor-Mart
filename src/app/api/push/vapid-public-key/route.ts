import { jsonOk, jsonError, handleApiRoute } from "@/lib/api-response";
import { getVapidPublicKey } from "@/core/notification-engine/web-push";

export async function GET() {
  return handleApiRoute(async () => {
    const publicKey = getVapidPublicKey();
    if (!publicKey) {
      return jsonError("Web Push is not configured on this server.", 503);
    }
    return jsonOk({ publicKey });
  }, { route: "GET /api/push/vapid-public-key" });
}

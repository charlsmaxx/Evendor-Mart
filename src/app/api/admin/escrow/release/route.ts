import { requireAuth } from "@/lib/auth";
import { requireAdminSection } from "@/lib/rbac";
import { jsonOk, jsonError } from "@/lib/api-response";
import { autoReleaseExpiredEscrows } from "@/lib/escrow";

export async function POST() {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);
  try { await requireAdminSection(user, "escrow"); } catch { return jsonError("Forbidden", 403); }

  const released = await autoReleaseExpiredEscrows();
  return jsonOk({ released, message: `${released} booking(s) auto-released.` });
}

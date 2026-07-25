import { requireAuth } from "@/lib/auth";
import { requireAdminSection } from "@/lib/rbac";
import { jsonOk, jsonError } from "@/lib/api-response";
import { expireStaleReservations } from "@/lib/booking-engine";

export async function POST() {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);
  try { await requireAdminSection(user, "bookings"); } catch { return jsonError("Forbidden", 403); }

  const expired = await expireStaleReservations();
  return jsonOk({ expired, message: `${expired} stale reservation(s) expired.` });
}

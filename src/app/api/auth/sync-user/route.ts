import { jsonOk, jsonError } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";

/** Ensures the authenticated Supabase user exists in Prisma (post sign-up). */
export async function POST() {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);
  return jsonOk(user);
}

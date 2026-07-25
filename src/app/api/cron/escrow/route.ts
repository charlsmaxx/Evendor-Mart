import { NextRequest } from "next/server";
import { jsonOk, jsonError, handleApiRoute } from "@/lib/api-response";
import { runEscrowMaintenance } from "@/lib/escrow";
import { authorizeCronRequest, isCronSecretConfigured } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cron: expire reservations, completion reminders, auto-release escrow. */
export async function GET(req: NextRequest) {
  return handleApiRoute(async () => {
    if (!isCronSecretConfigured()) {
      return jsonError("CRON_SECRET is not configured with a real secret.", 503);
    }
    if (!authorizeCronRequest(req)) return jsonError("Unauthorized", 401);

    const result = await runEscrowMaintenance();
    return jsonOk({
      ...result,
      message: `Expired ${result.expiredReservations} reservation(s); sent ${result.remindersSent} reminder(s); auto-released ${result.autoReleased} escrow(s).`,
    });
  }, { route: "GET /api/cron/escrow" });
}

export async function POST(req: NextRequest) {
  return GET(req);
}

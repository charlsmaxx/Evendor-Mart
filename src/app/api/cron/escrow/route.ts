import { NextRequest } from "next/server";
import { jsonOk, jsonError, handleApiRoute } from "@/lib/api-response";
import { runEscrowMaintenance } from "@/lib/escrow";

function authorizeCron(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/** Cron: expire reservations, completion reminders, auto-release escrow. */
export async function GET(req: NextRequest) {
  return handleApiRoute(async () => {
    if (!authorizeCron(req)) return jsonError("Unauthorized", 401);

    const result = await runEscrowMaintenance();
    return jsonOk({
      ...result,
      message: `Expired ${result.expiredReservations} reservation(s); sent ${result.remindersSent} reminder(s); auto-released ${result.autoReleased} escrow(s).`,
    });
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}

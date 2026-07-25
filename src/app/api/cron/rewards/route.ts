import { NextRequest } from "next/server";
import { jsonOk, jsonError, handleApiRoute } from "@/lib/api-response";
import { runRewardsMaintenance } from "@/lib/rewards";

function authorizeCron(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/** Daily cron: expire old rewards + warn users before expiry. */
export async function GET(req: NextRequest) {
  return handleApiRoute(async () => {
    if (!authorizeCron(req)) return jsonError("Unauthorized", 401);

    const result = await runRewardsMaintenance();
    return jsonOk({
      ...result,
      message: `Expired ${result.count} reward(s); sent ${result.expiryWarningsSent} expiry warning(s).`,
    });
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}

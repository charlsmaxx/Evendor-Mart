import { NextRequest } from "next/server";
import { jsonOk, jsonError, handleApiRoute } from "@/lib/api-response";
import { runRewardsMaintenance } from "@/lib/rewards";
import { authorizeCronRequest, isCronSecretConfigured } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Daily cron: expire old rewards + warn users before expiry. */
export async function GET(req: NextRequest) {
  return handleApiRoute(async () => {
    if (!isCronSecretConfigured()) {
      return jsonError("CRON_SECRET is not configured with a real secret.", 503);
    }
    if (!authorizeCronRequest(req)) return jsonError("Unauthorized", 401);

    const result = await runRewardsMaintenance();
    return jsonOk({
      ...result,
      message:
        `Expired ${result.count} reward(s); sent ${result.expiryWarningsSent} expiry warning(s); ` +
        `returned rewards on ${result.redemptionsReturned} unpaid booking(s).`,
    });
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}

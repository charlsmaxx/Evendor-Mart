import { NextRequest } from "next/server";
import { jsonOk, jsonError, handleApiRoute } from "@/lib/api-response";
import { authorizeCronRequest, isCronSecretConfigured } from "@/lib/cron-auth";
import { syncPendingWithdrawals } from "@/core/payment-engine/payout-service";
import { isPaystackConfigured } from "@/core/payment-engine/paystack";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron: reconcile withdrawals Paystack queued asynchronously. Transfer webhooks are
 * the primary settlement path; this catches the ones that never arrived.
 */
export async function GET(req: NextRequest) {
  return handleApiRoute(async () => {
    if (!isCronSecretConfigured()) {
      return jsonError("CRON_SECRET is not configured with a real secret.", 503);
    }
    if (!authorizeCronRequest(req)) return jsonError("Unauthorized", 401);
    if (!isPaystackConfigured()) {
      return jsonOk({ checked: 0, settled: 0, failed: 0, message: "Paystack not configured." });
    }

    const result = await syncPendingWithdrawals();
    return jsonOk({
      ...result,
      message: `Checked ${result.checked} withdrawal(s); ${result.settled} settled, ${result.failed} failed.`,
    });
  }, { route: "GET /api/cron/payouts" });
}

export async function POST(req: NextRequest) {
  return GET(req);
}

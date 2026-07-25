import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { requireAdminSection } from "@/lib/rbac";
import { jsonNoStore, jsonError, handleApiRoute } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/core/audit-engine";
import { computeVendorBalance } from "@/core/wallet-engine/ledger";
import { WithdrawalError, processWithdrawal } from "@/core/payment-engine/payout-service";

/**
 * Re-runs a failed transfer. The original Withdrawal row (and its reference) is reused,
 * so Paystack will reject a duplicate if the first attempt actually succeeded.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApiRoute(async () => {
    const user = await requireAuth();
    if (!user) return jsonError("Unauthorized", 401);
    try {
      await requireAdminSection(user, "escrow");
    } catch {
      return jsonError("Forbidden", 403);
    }

    const { id } = await params;
    const withdrawal = await prisma.withdrawal.findUnique({ where: { id } });
    if (!withdrawal) return jsonError("Withdrawal not found", 404);
    if (withdrawal.status !== "FAILED" && withdrawal.status !== "REVERSED") {
      return jsonError("Only failed withdrawals can be retried.", 409);
    }

    // A failed withdrawal released its hold on the balance; confirm the vendor can
    // still cover it before trying again.
    const balance = await computeVendorBalance(withdrawal.vendorId);
    if (withdrawal.amount > balance.availableBalance) {
      return jsonError(
        `Vendor balance is now ₦${balance.availableBalance.toLocaleString()}, less than the ₦${withdrawal.amount.toLocaleString()} requested.`,
        409
      );
    }

    await writeAuditLog({
      actorId: user.id,
      action: "WITHDRAWAL_RETRIED",
      entityType: "Withdrawal",
      entityId: id,
      metadata: { amount: withdrawal.amount, attempts: withdrawal.attempts },
    });

    try {
      const result = await processWithdrawal(id);
      return jsonNoStore({
        id: result.id,
        status: result.status,
        failureReason: result.failureReason,
      });
    } catch (err) {
      if (err instanceof WithdrawalError) return jsonError(err.message, err.status);
      throw err;
    }
  }, { route: "POST /api/admin/withdrawals/[id]/retry" });
}

import { NextRequest } from "next/server";
import type { ReconciliationStatus } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { requireAdminSection } from "@/lib/rbac";
import { jsonOk, jsonError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { fetchTransfer, isPaystackConfigured, verifyTransaction } from "@/lib/paystack";

function mapPayoutStatusToExpected(status: string) {
  if (status === "PAID") return ["success"];
  if (status === "PROCESSING") return ["pending", "otp", "processing"];
  if (status === "FAILED") return ["failed", "reversed"];
  return ["pending"];
}

export async function GET() {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);
  try {
    await requireAdminSection(user, "reconciliation");
  } catch {
    return jsonError("Forbidden", 403);
  }

  const payouts = await prisma.payout.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      vendor: { select: { businessName: true } },
      booking: {
        select: {
          id: true,
          listing: { select: { title: true } },
          payments: { select: { paystackRef: true, amount: true, status: true } },
        },
      },
    },
  });

  const summary = {
    total: payouts.length,
    matched: payouts.filter((p) => p.reconciliationStatus === "MATCHED").length,
    mismatch: payouts.filter((p) => p.reconciliationStatus === "MISMATCH").length,
    pending: payouts.filter((p) => p.reconciliationStatus === "PENDING").length,
    unverifiable: payouts.filter((p) => p.reconciliationStatus === "UNVERIFIABLE").length,
    paystackConfigured: isPaystackConfigured(),
  };

  return jsonOk({ payouts, summary });
}

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);
  try {
    await requireAdminSection(user, "reconciliation");
  } catch {
    return jsonError("Forbidden", 403);
  }

  if (!isPaystackConfigured()) {
    return jsonError("Paystack is not configured. Add PAYSTACK_SECRET_KEY to run reconciliation.", 503);
  }

  const body = (await req.json().catch(() => ({}))) as { payoutId?: string };
  const payouts = body.payoutId
    ? await prisma.payout.findMany({
        where: { id: body.payoutId },
        include: {
          booking: { include: { payments: { select: { paystackRef: true, amount: true, status: true } } } },
        },
      })
    : await prisma.payout.findMany({
        where: { reconciliationStatus: { in: ["PENDING", "MISMATCH"] } },
        include: {
          booking: { include: { payments: { select: { paystackRef: true, amount: true, status: true } } } },
        },
        take: 25,
        orderBy: { createdAt: "desc" },
      });

  const results: { payoutId: string; status: ReconciliationStatus; note: string }[] = [];

  for (const payout of payouts) {
    let status: ReconciliationStatus = "UNVERIFIABLE";
    let note = "No Paystack reference available";

    try {
      if (payout.paystackTransferCode) {
        const transfer = await fetchTransfer(payout.paystackTransferCode);
        const expected = mapPayoutStatusToExpected(payout.status);
        const amountMatch = transfer.amount === payout.amount;
        const statusMatch = expected.includes(transfer.status);
        if (amountMatch && statusMatch) {
          status = "MATCHED";
          note = `Transfer ${transfer.transfer_code} verified (${transfer.status})`;
        } else {
          status = "MISMATCH";
          note = `Expected ${payout.status}/₦${payout.amount}, Paystack ${transfer.status}/₦${transfer.amount}`;
        }
      } else {
        const payment = payout.booking.payments.find((p) => p.paystackRef);
        if (payment?.paystackRef) {
          const tx = await verifyTransaction(payment.paystackRef);
          const paid = tx.status === "success";
          if (payout.status === "PAID" && paid && tx.amount >= payout.amount) {
            status = "MATCHED";
            note = `Inbound payment ${payment.paystackRef} verified`;
          } else if (payout.status === "PENDING" && paid) {
            status = "MISMATCH";
            note = "Payment received but payout still pending locally";
          } else {
            status = "MISMATCH";
            note = `Payment status ${tx.status} vs payout ${payout.status}`;
          }
        }
      }
    } catch (err) {
      status = "UNVERIFIABLE";
      note = err instanceof Error ? err.message : "Paystack lookup failed";
    }

    await prisma.payout.update({
      where: { id: payout.id },
      data: {
        reconciliationStatus: status,
        reconciledAt: new Date(),
        reconciliationNote: note,
      },
    });

    results.push({ payoutId: payout.id, status, note });
  }

  return jsonOk({ reconciled: results.length, results });
}

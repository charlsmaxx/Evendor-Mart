import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { getVendorWalletStats } from "@/lib/vendor-wallet";
import { writeAuditLog } from "@/core/audit-engine";
import { emitDomainEvent } from "@/core/events";
import { z } from "zod";

export async function GET() {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } });
  if (!vendor) return jsonError("Vendor not found", 404);

  const wallet = await getVendorWalletStats(vendor.id);
  return jsonOk(wallet);
}

const withdrawSchema = z.object({
  amount: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } });
  if (!vendor) return jsonError("Vendor not found", 404);

  const parsed = withdrawSchema.safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const wallet = await getVendorWalletStats(vendor.id);
  if (parsed.data.amount > wallet.availableBalance) {
    return jsonError("Insufficient available balance", 400);
  }

  await writeAuditLog({
    actorId: user.id,
    action: "WITHDRAWAL_REQUESTED",
    entityType: "VendorProfile",
    entityId: vendor.id,
    metadata: { amount: parsed.data.amount },
  });

  await emitDomainEvent({
    type: "WithdrawalRequested",
    payload: { userId: user.id, amount: parsed.data.amount },
  });

  return jsonOk({
    message: "Withdrawal request submitted. Funds will arrive within 1–3 business days.",
    amount: parsed.data.amount,
  });
}

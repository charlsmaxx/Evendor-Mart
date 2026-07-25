import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonNoStore, jsonError, handleApiRoute } from "@/lib/api-response";
import { payoutLimiter, checkRateLimit } from "@/lib/rate-limit";
import { writeAuditLog } from "@/core/audit-engine";
import { isPaystackConfigured, resolveBankAccount } from "@/core/payment-engine/paystack";
import { readVendorBankAccount } from "@/core/payment-engine/payout-service";

const schema = z.object({
  bankCode: z.string().min(2).max(10),
  bankName: z.string().min(2).max(120),
  accountNumber: z.string().regex(/^\d{10}$/, "Account number must be 10 digits"),
});

/** Never return the full account number — only enough for the vendor to recognise it. */
function maskAccount(accountNumber: string) {
  return `••••${accountNumber.slice(-4)}`;
}

export async function GET() {
  return handleApiRoute(async () => {
    const user = await requireAuth();
    if (!user) return jsonError("Unauthorized", 401);

    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: user.id },
      select: { metadata: true },
    });
    if (!vendor) return jsonError("Vendor not found", 404);

    const bank = readVendorBankAccount(vendor.metadata);
    return jsonNoStore(
      bank
        ? {
            bankName: bank.bankName,
            accountName: bank.accountName,
            accountNumberMasked: maskAccount(bank.accountNumber),
            verified: bank.verified ?? false,
          }
        : null
    );
  }, { route: "GET /api/vendor/bank-account" });
}

export async function PUT(req: NextRequest) {
  return handleApiRoute(async () => {
    const user = await requireAuth();
    if (!user) return jsonError("Unauthorized", 401);

    const rate = await checkRateLimit(payoutLimiter, `bank-account:${user.id}`);
    if (!rate.success) return jsonError("Too many attempts. Try again later.", 429);

    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, metadata: true },
    });
    if (!vendor) return jsonError("Vendor not found", 404);

    if (!isPaystackConfigured()) {
      return jsonError("Bank verification is unavailable right now.", 503);
    }

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid bank details", 400);
    }

    // Changing the destination while money is in flight would make the audit trail lie
    // about where funds went.
    const inFlight = await prisma.withdrawal.count({
      where: { vendorId: vendor.id, status: { in: ["PENDING", "PROCESSING"] } },
    });
    if (inFlight > 0) {
      return jsonError(
        "You have a withdrawal in progress. Wait for it to settle before changing your payout account.",
        409
      );
    }

    let accountName: string;
    try {
      const resolved = await resolveBankAccount(
        parsed.data.accountNumber,
        parsed.data.bankCode
      );
      accountName = resolved.account_name;
    } catch (e) {
      return jsonError(
        e instanceof Error ? e.message : "Could not verify that account",
        400
      );
    }

    const metadata =
      vendor.metadata && typeof vendor.metadata === "object"
        ? (vendor.metadata as Record<string, unknown>)
        : {};

    await prisma.vendorProfile.update({
      where: { id: vendor.id },
      data: {
        metadata: {
          ...metadata,
          bankAccount: {
            bankCode: parsed.data.bankCode,
            bankName: parsed.data.bankName,
            accountNumber: parsed.data.accountNumber,
            accountName,
            verified: true,
            verifiedAt: new Date().toISOString(),
          },
          // Force a fresh Paystack recipient for the new destination.
          paystackRecipient: undefined,
        } as Prisma.InputJsonValue,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "PAYOUT_ACCOUNT_UPDATED",
      entityType: "VendorProfile",
      entityId: vendor.id,
      metadata: {
        bankName: parsed.data.bankName,
        accountNumberLast4: parsed.data.accountNumber.slice(-4),
      },
    });

    return jsonNoStore({
      bankName: parsed.data.bankName,
      accountName,
      accountNumberMasked: maskAccount(parsed.data.accountNumber),
      verified: true,
    });
  }, { route: "PUT /api/vendor/bank-account" });
}

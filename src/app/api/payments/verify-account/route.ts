import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { jsonNoStore, jsonError } from "@/lib/api-response";
import { isPaystackConfigured, resolveBankAccount } from "@/lib/paystack";
import { z } from "zod";

const verifySchema = z.object({
  accountNumber: z.string().regex(/^\d{10}$/, "Account number must be 10 digits"),
  bankCode: z.string().min(2),
});

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  if (!isPaystackConfigured()) {
    return jsonError("Bank verification is not configured. Add PAYSTACK_SECRET_KEY.", 503);
  }

  const parsed = verifySchema.safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  try {
    const result = await resolveBankAccount(parsed.data.accountNumber, parsed.data.bankCode);
    return jsonNoStore({
      accountNumber: result.account_number,
      accountName: result.account_name,
      verified: true,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not verify account";
    return jsonError(message, 400);
  }
}

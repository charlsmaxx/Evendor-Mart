const PAYSTACK_BASE = "https://api.paystack.co";
const REQUEST_TIMEOUT_MS = 20_000;

/** Carries the upstream HTTP status so callers can distinguish retryable failures. */
export class PaystackError extends Error {
  readonly httpStatus: number;
  readonly paystackCode?: string;

  constructor(message: string, httpStatus: number, paystackCode?: string) {
    super(message);
    this.name = "PaystackError";
    this.httpStatus = httpStatus;
    this.paystackCode = paystackCode;
  }

  /** Network/5xx failures may succeed on retry; 4xx are terminal. */
  get retryable(): boolean {
    return this.httpStatus === 0 || this.httpStatus === 429 || this.httpStatus >= 500;
  }
}

export async function paystackRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new PaystackError("PAYSTACK_SECRET_KEY not configured", 0);

  let res: Response;
  try {
    res = await fetch(`${PAYSTACK_BASE}${path}`, {
      ...options,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "network error";
    throw new PaystackError(`Could not reach Paystack (${reason})`, 0);
  }

  const json = (await res.json().catch(() => null)) as
    | { status?: boolean; message?: string; code?: string; data?: unknown }
    | null;

  if (!res.ok || !json?.status) {
    throw new PaystackError(
      json?.message || "Paystack request failed",
      res.status,
      json?.code
    );
  }
  return json.data as T;
}

export async function initializeTransaction(params: {
  email: string;
  amount: number;
  reference: string;
  callback_url?: string;
  metadata?: Record<string, unknown>;
}) {
  return paystackRequest<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: params.email,
      amount: params.amount,
      reference: params.reference,
      callback_url: params.callback_url,
      metadata: params.metadata,
      currency: "NGN",
    }),
  });
}

import crypto from "crypto";

export function verifyPaystackSignature(body: string, signature: string | null) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!signature || !secret) return false;

  const expected = crypto.createHmac("sha512", secret).update(body).digest("hex");
  const received = signature.trim().toLowerCase();
  if (received.length !== expected.length || !/^[0-9a-f]+$/.test(received)) return false;

  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
}

export function isPaystackConfigured() {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim();
  return !!key && key.startsWith("sk_");
}

/** True when the configured secret key moves real money. */
export function isPaystackLiveMode() {
  return !!process.env.PAYSTACK_SECRET_KEY?.trim().startsWith("sk_live_");
}

export async function verifyTransaction(reference: string) {
  return paystackRequest<{
    status: string;
    amount: number;
    currency: string;
    reference: string;
    paid_at?: string;
  }>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

export type PaystackTransferStatus =
  | "success"
  | "pending"
  | "processing"
  | "otp"
  | "failed"
  | "reversed"
  | "abandoned";

export type PaystackTransfer = {
  status: PaystackTransferStatus | string;
  amount: number;
  currency: string;
  transfer_code: string;
  reference: string;
  recipient?: { recipient_code: string };
  failures?: unknown;
};

/**
 * Registers a bank account as a transfer destination. Recipient codes are stable,
 * so callers should cache them on the vendor rather than re-creating per payout.
 */
export async function createTransferRecipient(params: {
  name: string;
  accountNumber: string;
  bankCode: string;
}) {
  return paystackRequest<{ recipient_code: string; details: { account_name: string } }>(
    "/transferrecipient",
    {
      method: "POST",
      body: JSON.stringify({
        type: "nuban",
        name: params.name,
        account_number: params.accountNumber,
        bank_code: params.bankCode,
        currency: "NGN",
      }),
    }
  );
}

/**
 * Sends money to a recipient. `reference` must be caller-generated and unique —
 * Paystack rejects duplicates, which is what makes retries safe from double-paying.
 * Amount is in kobo (NGN × 100).
 */
export async function initiateTransfer(params: {
  amount: number;
  recipient: string;
  reference: string;
  reason?: string;
}) {
  return paystackRequest<PaystackTransfer>("/transfer", {
    method: "POST",
    body: JSON.stringify({
      source: "balance",
      amount: params.amount,
      recipient: params.recipient,
      reference: params.reference,
      reason: params.reason,
      currency: "NGN",
    }),
  });
}

/** Looks a transfer up by our own reference — needed when the create call timed out. */
export async function fetchTransferByReference(reference: string) {
  return paystackRequest<PaystackTransfer>(
    `/transfer/verify/${encodeURIComponent(reference)}`
  );
}

export async function createSubaccount(params: {
  businessName: string;
  bankCode: string;
  accountNumber: string;
  percentageCharge: number;
}) {
  return paystackRequest<{ subaccount_code: string; account_name: string }>("/subaccount", {
    method: "POST",
    body: JSON.stringify({
      business_name: params.businessName,
      settlement_bank: params.bankCode,
      account_number: params.accountNumber,
      percentage_charge: params.percentageCharge,
    }),
  });
}

export async function fetchTransfer(transferCode: string) {
  return paystackRequest<{
    status: string;
    amount: number;
    currency: string;
    transfer_code: string;
    reference: string;
  }>(`/transfer/${encodeURIComponent(transferCode)}`);
}

export type PaystackBank = {
  name: string;
  slug: string;
  code: string;
  active: boolean;
};

export async function listNigerianBanks() {
  return paystackRequest<PaystackBank[]>("/bank?country=nigeria&perPage=100");
}

export async function resolveBankAccount(accountNumber: string, bankCode: string) {
  const params = new URLSearchParams({
    account_number: accountNumber,
    bank_code: bankCode,
  });
  return paystackRequest<{ account_number: string; account_name: string; bank_id: number }>(
    `/bank/resolve?${params.toString()}`
  );
}

/** Amount in kobo (NGN × 100). Omit amount for full refund. */
export async function createRefund(params: {
  transaction: string;
  amount?: number;
  currency?: string;
  customer_note?: string;
  merchant_note?: string;
}) {
  return paystackRequest<{
    status: string;
    transaction: { reference: string; id: number };
    amount: number;
  }>("/refund", {
    method: "POST",
    body: JSON.stringify({
      transaction: params.transaction,
      ...(params.amount != null ? { amount: params.amount } : {}),
      currency: params.currency ?? "NGN",
      customer_note: params.customer_note,
      merchant_note: params.merchant_note,
    }),
  });
}

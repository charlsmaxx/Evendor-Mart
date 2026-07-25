const PAYSTACK_BASE = "https://api.paystack.co";

export async function paystackRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error("PAYSTACK_SECRET_KEY not configured");

  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const json = await res.json();
  if (!res.ok || !json.status) {
    throw new Error(json.message || "Paystack request failed");
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
  if (!signature || !process.env.PAYSTACK_SECRET_KEY) return false;
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(body)
    .digest("hex");
  return hash === signature;
}

export function isPaystackConfigured() {
  return !!process.env.PAYSTACK_SECRET_KEY?.trim();
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

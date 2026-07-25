import { NextRequest } from "next/server";
import { verifyPaystackSignature } from "@/lib/paystack";
import { jsonOk, jsonError } from "@/lib/api-response";
import { handlePaystackWebhookEvent } from "@/core/payment-engine/webhook-handlers";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!verifyPaystackSignature(body, signature)) {
    return jsonError("Invalid signature", 401);
  }

  const event = JSON.parse(body) as Parameters<typeof handlePaystackWebhookEvent>[0];
  const result = await handlePaystackWebhookEvent(event);
  return jsonOk(result);
}

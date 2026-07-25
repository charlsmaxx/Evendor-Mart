import { NextRequest } from "next/server";
import { verifyPaystackSignature } from "@/lib/paystack";
import { jsonOk, jsonError } from "@/lib/api-response";
import {
  handlePaystackWebhookEvent,
  type PaystackWebhookEvent,
} from "@/core/payment-engine/webhook-handlers";
import { logStructuredWarn } from "@/lib/observability";

/** HMAC verification needs Node crypto, and money handling must never run at the edge. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Paystack payloads are small; anything larger is not from Paystack. */
const MAX_BODY_BYTES = 64 * 1024;

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-paystack-signature");
  if (!signature) return jsonError("Missing signature", 401);

  const body = await req.text();
  if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
    return jsonError("Payload too large", 413);
  }

  if (!verifyPaystackSignature(body, signature)) {
    logStructuredWarn("paystack_webhook_bad_signature", { bytes: body.length });
    return jsonError("Invalid signature", 401);
  }

  let event: PaystackWebhookEvent;
  try {
    event = JSON.parse(body) as PaystackWebhookEvent;
  } catch {
    return jsonError("Malformed payload", 400);
  }
  if (typeof event?.event !== "string" || typeof event.data !== "object") {
    return jsonError("Malformed payload", 400);
  }

  try {
    const result = await handlePaystackWebhookEvent(event);
    return jsonOk(result);
  } catch (error) {
    // Returning 500 makes Paystack retry, which is what we want for transient
    // database failures. Handlers are idempotent so retries are safe.
    logStructuredWarn("paystack_webhook_error", {
      event: event.event,
      message: error instanceof Error ? error.message : "unknown",
    });
    return jsonError("Webhook processing failed", 500);
  }
}

import "server-only";

import crypto from "crypto";

const MAX_SKEW_SECONDS = 5 * 60;

function timingSafeEqualString(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    crypto.timingSafeEqual(left, left);
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

export function parseStandardWebhookSecret(raw: string) {
  const trimmed = raw.trim();
  const withoutVersion = trimmed.startsWith("v1,") ? trimmed.slice(3) : trimmed;
  const encoded = withoutVersion.startsWith("whsec_")
    ? withoutVersion.slice("whsec_".length)
    : withoutVersion;
  return Buffer.from(encoded, "base64");
}

export function isSendEmailHookSecretConfigured() {
  const secret = process.env.SEND_EMAIL_HOOK_SECRET?.trim();
  return !!secret && secret.length >= 16 && !secret.toLowerCase().includes("your-");
}

/** Verifies a Standard Webhooks payload (used by Supabase Auth HTTP hooks). */
export function verifyStandardWebhook(payload: string, headers: Headers, secretRaw: string) {
  const msgId = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signatureHeader = headers.get("webhook-signature");
  if (!msgId || !timestamp || !signatureHeader) {
    throw new Error("Missing webhook signature headers");
  }

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) throw new Error("Invalid webhook timestamp");
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > MAX_SKEW_SECONDS) {
    throw new Error("Webhook timestamp too old");
  }

  const secret = parseStandardWebhookSecret(secretRaw);
  const toSign = `${msgId}.${timestamp}.${payload}`;
  const expected = crypto.createHmac("sha256", secret).update(toSign).digest("base64");

  const passed = signatureHeader.split(" ").filter(Boolean);
  let matched = false;
  for (const versioned of passed) {
    const comma = versioned.indexOf(",");
    if (comma < 0) continue;
    const version = versioned.slice(0, comma);
    const signature = versioned.slice(comma + 1);
    if (version !== "v1") continue;
    if (timingSafeEqualString(signature, expected)) matched = true;
  }
  if (!matched) throw new Error("Invalid webhook signature");
}

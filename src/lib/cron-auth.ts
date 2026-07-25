import crypto from "crypto";
import type { NextRequest } from "next/server";

/** Placeholders shipped in example env files must never authorise a real cron run. */
const PLACEHOLDER_SECRETS = new Set([
  "your-long-random-secret",
  "your-cron-secret",
  "changeme",
  "secret",
]);

const MIN_SECRET_LENGTH = 16;

function timingSafeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function isCronSecretConfigured(): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  return (
    !!secret &&
    secret.length >= MIN_SECRET_LENGTH &&
    !PLACEHOLDER_SECRETS.has(secret.toLowerCase())
  );
}

/**
 * Cron endpoints trigger money movement, so they authenticate on a shared secret
 * rather than a user session. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`
 * automatically; `x-cron-secret` covers external schedulers.
 */
export function authorizeCronRequest(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!isCronSecretConfigured() || !secret) return false;

  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (bearer && timingSafeEquals(bearer, secret)) return true;

  const header = req.headers.get("x-cron-secret")?.trim();
  return !!header && timingSafeEquals(header, secret);
}

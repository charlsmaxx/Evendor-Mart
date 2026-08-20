/**
 * Vendor withdrawal authentication — password (hashed) plus optional WebAuthn
 * platform biometrics. The hash never leaves the server. The frontend only
 * learns whether a password / credential is set.
 */
import "server-only";
import { promisify } from "util";
import { randomBytes, scrypt as scryptCb, timingSafeEqual, createPublicKey, verify as cryptoVerify, createHash } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/core/infrastructure/prisma";

const scrypt = promisify(scryptCb);

export const PAYOUT_PASSWORD_MIN = 6;
export const PAYOUT_PASSWORD_MAX = 32;
const SCRYPT_KEYLEN = 64;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const CHALLENGE_TTL_MS = 2 * 60 * 1000;

export class PayoutAuthError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status = 400, code = "PAYOUT_AUTH_ERROR") {
    super(message);
    this.name = "PayoutAuthError";
    this.status = status;
    this.code = code;
  }
}

export type PayoutWebauthnCredential = {
  credentialId: string;
  publicKeyDer: string;
  registeredAt: string;
};

type PayoutChallenge = {
  value: string;
  purpose: "register" | "assert";
  expiresAt: string;
};

export type PayoutAuthRecord = {
  passwordHash?: string;
  passwordSetAt?: string;
  failedAttempts?: number;
  lockedUntil?: string;
  /** Legacy single-device credential. Prefer `webauthnCredentials`. */
  webauthn?: PayoutWebauthnCredential;
  webauthnCredentials?: PayoutWebauthnCredential[];
  challenge?: PayoutChallenge;
};

type VendorMetadata = Record<string, unknown> & {
  payoutAuth?: PayoutAuthRecord;
};

export type PayoutAuthStatus = {
  passwordSet: boolean;
  webauthnEnabled: boolean;
  locked: boolean;
};

function readMetadata(metadata: unknown): VendorMetadata {
  return metadata && typeof metadata === "object" ? (metadata as VendorMetadata) : {};
}

export function readPayoutAuth(metadata: unknown): PayoutAuthRecord {
  const auth = readMetadata(metadata).payoutAuth;
  return auth && typeof auth === "object" ? auth : {};
}

export function getPayoutAuthStatus(metadata: unknown): PayoutAuthStatus {
  const auth = readPayoutAuth(metadata);
  const lockedUntil = auth.lockedUntil ? Date.parse(auth.lockedUntil) : 0;
  return {
    passwordSet: typeof auth.passwordHash === "string" && auth.passwordHash.includes(":"),
    webauthnEnabled: listWebauthnCredentials(auth).length > 0,
    locked: Number.isFinite(lockedUntil) && lockedUntil > Date.now(),
  };
}

const MAX_WEBAUTHN_CREDENTIALS = 8;

export function listWebauthnCredentials(auth: PayoutAuthRecord): PayoutWebauthnCredential[] {
  const fromList = Array.isArray(auth.webauthnCredentials) ? auth.webauthnCredentials : [];
  const legacy =
    auth.webauthn?.credentialId && auth.webauthn.publicKeyDer ? [auth.webauthn] : [];
  const seen = new Set<string>();
  const out: PayoutWebauthnCredential[] = [];
  for (const cred of [...fromList, ...legacy]) {
    if (!cred?.credentialId || !cred.publicKeyDer || seen.has(cred.credentialId)) continue;
    seen.add(cred.credentialId);
    out.push(cred);
  }
  return out;
}

export function normalizePayoutPassword(value: unknown): string {
  if (typeof value !== "string") {
    throw new PayoutAuthError("Enter your withdrawal password.", 400, "PAYOUT_PASSWORD_REQUIRED");
  }
  const password = value.normalize("NFKC").trim();
  if (password.length < PAYOUT_PASSWORD_MIN || password.length > PAYOUT_PASSWORD_MAX) {
    throw new PayoutAuthError(
      `Withdrawal password must be ${PAYOUT_PASSWORD_MIN}–${PAYOUT_PASSWORD_MAX} characters.`,
      400,
      "PAYOUT_PASSWORD_INVALID"
    );
  }
  return password;
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = (await scrypt(password, salt, SCRYPT_KEYLEN)) as Buffer;
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

async function passwordsMatch(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  if (salt.length === 0 || expected.length === 0) return false;
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

async function savePayoutAuth(
  vendorId: string,
  metadata: unknown,
  payoutAuth: PayoutAuthRecord
) {
  const current = readMetadata(metadata);
  await prisma.vendorProfile.update({
    where: { id: vendorId },
    data: {
      metadata: {
        ...current,
        payoutAuth,
      } as Prisma.InputJsonValue,
    },
  });
}

function assertNotLocked(auth: PayoutAuthRecord) {
  const lockedUntil = auth.lockedUntil ? Date.parse(auth.lockedUntil) : 0;
  if (Number.isFinite(lockedUntil) && lockedUntil > Date.now()) {
    const minutes = Math.max(1, Math.ceil((lockedUntil - Date.now()) / 60000));
    throw new PayoutAuthError(
      `Too many incorrect attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      429,
      "PAYOUT_AUTH_LOCKED"
    );
  }
}

async function recordFailure(
  vendorId: string,
  metadata: unknown,
  auth: PayoutAuthRecord,
  message = "Incorrect withdrawal password.",
  code = "PAYOUT_PASSWORD_INVALID"
) {
  const failedAttempts = (auth.failedAttempts ?? 0) + 1;
  const lockedUntil =
    failedAttempts >= MAX_FAILED_ATTEMPTS
      ? new Date(Date.now() + LOCKOUT_MS).toISOString()
      : undefined;
  await savePayoutAuth(vendorId, metadata, {
    ...auth,
    failedAttempts,
    lockedUntil,
    challenge: undefined,
  });
  if (lockedUntil) {
    throw new PayoutAuthError(
      "Too many incorrect attempts. Withdrawals are locked for 15 minutes.",
      429,
      "PAYOUT_AUTH_LOCKED"
    );
  }
  throw new PayoutAuthError(message, 401, code);
}

export async function setPayoutPassword(params: {
  vendorId: string;
  metadata: unknown;
  password: string;
  confirmPassword: string;
  currentPassword?: string;
  /** Set only after the server verified this vendor's Evendor login password. */
  accountVerified?: boolean;
}) {
  const password = normalizePayoutPassword(params.password);
  const confirm = normalizePayoutPassword(params.confirmPassword);
  if (password !== confirm) {
    throw new PayoutAuthError("Passwords do not match.", 400, "PAYOUT_PASSWORD_MISMATCH");
  }

  const auth = readPayoutAuth(params.metadata);
  const alreadySet =
    typeof auth.passwordHash === "string" && auth.passwordHash.includes(":");

  if (alreadySet && !params.accountVerified) {
    assertNotLocked(auth);
    const current = params.currentPassword?.trim()
      ? normalizePayoutPassword(params.currentPassword)
      : password;
    const matchesCurrent = await passwordsMatch(current, auth.passwordHash!);
    const matchesNew = current === password ? matchesCurrent : await passwordsMatch(password, auth.passwordHash!);

    // Retrying "set password" after it already saved: same value is a no-op, not a change.
    if (!params.currentPassword?.trim() && matchesNew) {
      return { changed: false };
    }

    if (!params.currentPassword?.trim()) {
      throw new PayoutAuthError(
        "A withdrawal password is already set. Enter it to confirm this payout.",
        400,
        "PAYOUT_PASSWORD_ALREADY_SET"
      );
    }

    if (!matchesCurrent) {
      await recordFailure(params.vendorId, params.metadata, auth);
    }

    if (password === current) {
      return { changed: false };
    }
  }

  const passwordHash = await hashPassword(password);
  await savePayoutAuth(params.vendorId, params.metadata, {
    ...auth,
    passwordHash,
    passwordSetAt: new Date().toISOString(),
    failedAttempts: 0,
    lockedUntil: undefined,
    challenge: undefined,
  });

  return { changed: alreadySet };
}

export async function verifyPayoutPassword(params: {
  vendorId: string;
  metadata: unknown;
  password: unknown;
}): Promise<void> {
  const auth = readPayoutAuth(params.metadata);
  if (!auth.passwordHash) {
    throw new PayoutAuthError(
      "Set a withdrawal password before sending funds to your bank.",
      403,
      "PAYOUT_PASSWORD_NOT_SET"
    );
  }
  assertNotLocked(auth);
  const password = normalizePayoutPassword(params.password);
  const ok = await passwordsMatch(password, auth.passwordHash);
  if (!ok) {
    await recordFailure(params.vendorId, params.metadata, auth);
  }
  if (auth.failedAttempts || auth.lockedUntil) {
    await savePayoutAuth(params.vendorId, params.metadata, {
      ...auth,
      failedAttempts: 0,
      lockedUntil: undefined,
      challenge: undefined,
    });
  }
}

export function createWebauthnChallenge(): string {
  return randomBytes(32).toString("base64url");
}

export async function storeWebauthnChallenge(params: {
  vendorId: string;
  metadata: unknown;
  purpose: "register" | "assert";
}) {
  const vendor = await prisma.vendorProfile.findUnique({
    where: { id: params.vendorId },
    select: { metadata: true },
  });
  const metadata = vendor?.metadata ?? params.metadata;
  const auth = readPayoutAuth(metadata);
  if (!auth.passwordHash) {
    throw new PayoutAuthError(
      "Set a withdrawal password before enabling biometrics.",
      403,
      "PAYOUT_PASSWORD_NOT_SET"
    );
  }
  if (params.purpose === "assert" && listWebauthnCredentials(auth).length === 0) {
    throw new PayoutAuthError(
      "Biometrics are not enabled yet. Confirm with your withdrawal password.",
      400,
      "PAYOUT_WEBAUTHN_NOT_SET"
    );
  }
  assertNotLocked(auth);
  const value = createWebauthnChallenge();
  await savePayoutAuth(params.vendorId, metadata, {
    ...auth,
    challenge: {
      value,
      purpose: params.purpose,
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
    },
  });
  return {
    challenge: value,
    credentialId: listWebauthnCredentials(auth)[0]?.credentialId ?? null,
    credentialIds: listWebauthnCredentials(auth).map((c) => c.credentialId),
  };
}

function parseClientData(clientDataJSON: string, expected: { type: string; challenge: string; origin: string }) {
  let parsed: { type?: string; challenge?: string; origin?: string };
  try {
    parsed = JSON.parse(Buffer.from(clientDataJSON, "base64url").toString("utf8")) as {
      type?: string;
      challenge?: string;
      origin?: string;
    };
  } catch {
    throw new PayoutAuthError("Biometric verification failed.", 401, "PAYOUT_WEBAUTHN_INVALID");
  }
  if (parsed.type !== expected.type) {
    throw new PayoutAuthError("Biometric verification failed.", 401, "PAYOUT_WEBAUTHN_INVALID");
  }
  if (parsed.challenge !== expected.challenge) {
    throw new PayoutAuthError("Biometric verification expired. Try again.", 401, "PAYOUT_WEBAUTHN_INVALID");
  }
  if (parsed.origin !== expected.origin) {
    throw new PayoutAuthError("Biometric verification failed.", 401, "PAYOUT_WEBAUTHN_INVALID");
  }
}

function takeChallenge(auth: PayoutAuthRecord, purpose: "register" | "assert"): string {
  const challenge = auth.challenge;
  if (!challenge?.value || challenge.purpose !== purpose) {
    throw new PayoutAuthError("Start biometric verification again.", 400, "PAYOUT_WEBAUTHN_INVALID");
  }
  if (Date.parse(challenge.expiresAt) <= Date.now()) {
    throw new PayoutAuthError("Biometric verification expired. Try again.", 401, "PAYOUT_WEBAUTHN_INVALID");
  }
  return challenge.value;
}

export async function registerWebauthnCredential(params: {
  vendorId: string;
  metadata: unknown;
  origin: string;
  rpId: string;
  credentialId: string;
  publicKeyDer: string;
  clientDataJSON: string;
  authenticatorData: string;
}) {
  const auth = readPayoutAuth(params.metadata);
  if (!auth.passwordHash) {
    throw new PayoutAuthError(
      "Set a withdrawal password before enabling biometrics.",
      403,
      "PAYOUT_PASSWORD_NOT_SET"
    );
  }
  const challenge = takeChallenge(auth, "register");
  parseClientData(params.clientDataJSON, {
    type: "webauthn.create",
    challenge,
    origin: params.origin,
  });
  verifyAuthenticatorData(params.authenticatorData, params.rpId, { requireUserVerified: true });

  if (!/^[A-Za-z0-9_-]{16,256}$/.test(params.credentialId)) {
    throw new PayoutAuthError("Could not save biometric credential.", 400, "PAYOUT_WEBAUTHN_INVALID");
  }
  try {
    createPublicKey({
      key: Buffer.from(params.publicKeyDer, "base64url"),
      format: "der",
      type: "spki",
    });
  } catch {
    throw new PayoutAuthError("Could not save biometric credential.", 400, "PAYOUT_WEBAUTHN_INVALID");
  }

  const nextCred: PayoutWebauthnCredential = {
    credentialId: params.credentialId,
    publicKeyDer: params.publicKeyDer,
    registeredAt: new Date().toISOString(),
  };
  const existing = listWebauthnCredentials(auth).filter((c) => c.credentialId !== nextCred.credentialId);
  const webauthnCredentials = [...existing, nextCred].slice(-MAX_WEBAUTHN_CREDENTIALS);

  await savePayoutAuth(params.vendorId, params.metadata, {
    ...auth,
    challenge: undefined,
    failedAttempts: 0,
    lockedUntil: undefined,
    webauthn: nextCred,
    webauthnCredentials,
  });
}

export type WebauthnAssertion = {
  credentialId: string;
  authenticatorData: string;
  clientDataJSON: string;
  signature: string;
};

export async function verifyWebauthnAssertion(params: {
  vendorId: string;
  metadata: unknown;
  origin: string;
  rpId: string;
  assertion: WebauthnAssertion;
}): Promise<void> {
  const auth = readPayoutAuth(params.metadata);
  const credentials = listWebauthnCredentials(auth);
  const matched = credentials.find((c) => c.credentialId === params.assertion.credentialId);
  if (!matched) {
    throw new PayoutAuthError(
      "Biometrics are not enabled on this device yet. Enable fingerprint / Face ID here, or use your withdrawal password.",
      400,
      "PAYOUT_WEBAUTHN_NOT_SET"
    );
  }
  assertNotLocked(auth);
  const challenge = takeChallenge(auth, "assert");

  parseClientData(params.assertion.clientDataJSON, {
    type: "webauthn.get",
    challenge,
    origin: params.origin,
  });
  const authenticatorData = verifyAuthenticatorData(
    params.assertion.authenticatorData,
    params.rpId,
    { requireUserVerified: true }
  );

  const clientDataHash = createHash("sha256")
    .update(Buffer.from(params.assertion.clientDataJSON, "base64url"))
    .digest();
  const signed = Buffer.concat([authenticatorData, clientDataHash]);

  let ok = false;
  try {
    const key = createPublicKey({
      key: Buffer.from(matched.publicKeyDer, "base64url"),
      format: "der",
      type: "spki",
    });
    ok = cryptoVerify(
      "sha256",
      signed,
      key,
      Buffer.from(params.assertion.signature, "base64url")
    );
  } catch {
    ok = false;
  }

  if (!ok) {
    await recordFailure(
      params.vendorId,
      params.metadata,
      auth,
      "Biometric verification failed.",
      "PAYOUT_WEBAUTHN_INVALID"
    );
  }

  await savePayoutAuth(params.vendorId, params.metadata, {
    ...auth,
    failedAttempts: 0,
    lockedUntil: undefined,
    challenge: undefined,
  });
}

function verifyAuthenticatorData(
  authenticatorDataB64: string,
  rpId: string,
  options: { requireUserVerified: boolean }
): Buffer {
  const data = Buffer.from(authenticatorDataB64, "base64url");
  if (data.length < 37) {
    throw new PayoutAuthError("Biometric verification failed.", 401, "PAYOUT_WEBAUTHN_INVALID");
  }
  const expectedRpHash = createHash("sha256").update(rpId).digest();
  if (!timingSafeEqual(data.subarray(0, 32), expectedRpHash)) {
    throw new PayoutAuthError("Biometric verification failed.", 401, "PAYOUT_WEBAUTHN_INVALID");
  }
  const flags = data[32];
  const userPresent = (flags & 0x01) !== 0;
  const userVerified = (flags & 0x04) !== 0;
  if (!userPresent || (options.requireUserVerified && !userVerified)) {
    throw new PayoutAuthError("Biometric verification failed.", 401, "PAYOUT_WEBAUTHN_INVALID");
  }
  return data;
}

export function webauthnRpFromRequest(req: { headers: Headers }): { origin: string; rpId: string } {
  const host =
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    req.headers.get("host") ||
    "localhost:3000";
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = forwardedProto || (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  const hostname = host.split(":")[0] ?? "localhost";
  return { origin: `${proto}://${host}`, rpId: hostname };
}

import type { NextResponse } from "next/server";

/** Current required document versions. Bump these when the live legal text materially changes. */
export const TERMS_VERSION = "1.0";
export const PRIVACY_VERSION = "1.0";

export const TERMS_EFFECTIVE_DATE = "20 August 2026";
export const PRIVACY_EFFECTIVE_DATE = "20 August 2026";

export const LEGAL_COOKIE_NAME = "evendor_legal";

export const LEGAL_ACCEPTANCE_METHODS = [
  "email",
  "google",
  "otp",
  "reconsent",
] as const;

export type LegalAcceptanceMethod = (typeof LEGAL_ACCEPTANCE_METHODS)[number];

export const LEGAL_SIGNUP_ERROR_MESSAGE =
  "We couldn't complete your registration right now. Please try again.";

export function isLegalAcceptanceMethod(value: unknown): value is LegalAcceptanceMethod {
  return (
    typeof value === "string" &&
    (LEGAL_ACCEPTANCE_METHODS as readonly string[]).includes(value)
  );
}

export function currentLegalCookieValue() {
  return `${TERMS_VERSION}|${PRIVACY_VERSION}`;
}

export function isCurrentLegalCookie(value: string | undefined | null) {
  return value === currentLegalCookieValue();
}

export function applyLegalAcceptanceCookie(response: NextResponse) {
  response.cookies.set(LEGAL_COOKIE_NAME, currentLegalCookieValue(), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearLegalAcceptanceCookie(response: NextResponse) {
  response.cookies.set(LEGAL_COOKIE_NAME, "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    httpOnly: true,
  });
}

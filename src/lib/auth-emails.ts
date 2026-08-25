import "server-only";

import { renderEvendorEmail } from "@/lib/email";

export type AuthEmailAction =
  | "signup"
  | "invite"
  | "magiclink"
  | "recovery"
  | "email_change"
  | "email_change_new"
  | "reauthentication"
  | "email";

const ACTION_ALIASES: Record<string, AuthEmailAction> = {
  signup: "signup",
  invite: "invite",
  magiclink: "magiclink",
  magic_link: "magiclink",
  recovery: "recovery",
  email_change: "email_change",
  email_change_new: "email_change_new",
  reauthentication: "reauthentication",
  email: "email",
};

export function normalizeAuthEmailAction(value: string): AuthEmailAction | null {
  return ACTION_ALIASES[value] ?? null;
}

export function otpTypeForCallback(action: AuthEmailAction) {
  if (action === "email_change_new") return "email_change";
  if (action === "email") return "email";
  return action;
}

function appOrigin() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

function safeNextPath(raw: string | undefined) {
  if (!raw) return "/";
  try {
    if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
    const url = new URL(raw);
    const app = new URL(appOrigin());
    if (url.origin === app.origin) {
      return `${url.pathname}${url.search}` || "/";
    }
  } catch {
    /* ignore malformed redirect */
  }
  return "/";
}

export function buildAuthActionUrl(input: {
  action: AuthEmailAction;
  tokenHash: string;
  redirectTo?: string;
}) {
  if (!input.tokenHash) return "";
  const callback = new URL("/api/auth/callback", `${appOrigin()}/`);
  callback.searchParams.set("token_hash", input.tokenHash);
  callback.searchParams.set("type", otpTypeForCallback(input.action));
  if (input.action === "recovery") {
    callback.searchParams.set("next", "/reset-password");
    callback.searchParams.set("flow", "recovery");
  } else {
    callback.searchParams.set("next", safeNextPath(input.redirectTo));
  }
  return callback.toString();
}

export function buildAuthEmail(input: {
  action: AuthEmailAction;
  token?: string;
  tokenHash?: string;
  redirectTo?: string;
}) {
  const actionUrl = buildAuthActionUrl({
    action: input.action,
    tokenHash: input.tokenHash ?? "",
    redirectTo: input.redirectTo,
  });
  const code = input.token?.trim() || undefined;

  switch (input.action) {
    case "signup":
    case "email":
      return {
        subject: "Confirm your Evendor account",
        ...renderEvendorEmail({
          heading: "Confirm your email",
          paragraphs: [
            "Welcome to Evendor. Confirm this email so you can book vendors, manage events, and keep your account secure.",
          ],
          ctaLabel: actionUrl ? "Confirm email" : undefined,
          ctaUrl: actionUrl || undefined,
          code,
        }),
      };
    case "invite":
      return {
        subject: "You’re invited to Evendor",
        ...renderEvendorEmail({
          heading: "You’ve been invited",
          paragraphs: ["Create your Evendor account with the button below. The link expires shortly."],
          ctaLabel: actionUrl ? "Accept invitation" : undefined,
          ctaUrl: actionUrl || undefined,
          code,
        }),
      };
    case "magiclink":
      return {
        subject: "Your Evendor sign-in link",
        ...renderEvendorEmail({
          heading: "Sign in to Evendor",
          paragraphs: ["Use this one-time link to sign in. It expires shortly and can only be used once."],
          ctaLabel: actionUrl ? "Sign in" : undefined,
          ctaUrl: actionUrl || undefined,
          code,
        }),
      };
    case "recovery":
      return {
        subject: "Reset your Evendor password",
        ...renderEvendorEmail({
          heading: "Reset your password",
          paragraphs: [
            "We received a request to reset the password for your Evendor account. Choose a new password with the button below.",
          ],
          ctaLabel: actionUrl ? "Choose a new password" : undefined,
          ctaUrl: actionUrl || undefined,
          code,
        }),
      };
    case "email_change":
    case "email_change_new":
      return {
        subject: "Confirm your new Evendor email",
        ...renderEvendorEmail({
          heading: "Confirm your new email",
          paragraphs: ["Confirm this address to finish updating the email on your Evendor account."],
          ctaLabel: actionUrl ? "Confirm new email" : undefined,
          ctaUrl: actionUrl || undefined,
          code,
        }),
      };
    case "reauthentication":
      return {
        subject: `${code ?? "Your code"} is your Evendor verification code`,
        ...renderEvendorEmail({
          heading: "Your verification code",
          paragraphs: ["Use this code to verify it’s you. It expires shortly."],
          code,
        }),
      };
  }
}

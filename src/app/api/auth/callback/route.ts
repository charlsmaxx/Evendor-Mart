import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getOrCreateDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HTTP_CACHE } from "@/lib/cache-policy";
import { getSupabaseEnv } from "@/lib/supabase/env";

const RECOVERY_COOKIE = "evendor_pw_recovery";
const RECOVERY_MAX_AGE = 60 * 30; // 30 minutes

function safeNextPath(raw: string | null) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

function isRecoveryRequest(searchParams: URLSearchParams) {
  const type = searchParams.get("type");
  const flow = searchParams.get("flow");
  const next = searchParams.get("next");
  return (
    type === "recovery" ||
    flow === "recovery" ||
    next === "/reset-password" ||
    next?.startsWith("/reset-password?") === true
  );
}

function redirectWithCookies(
  url: string,
  cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[],
  extraCookies?: { name: string; value: string; options?: Record<string, unknown> }[]
) {
  const response = NextResponse.redirect(url, { headers: HTTP_CACHE.privateNoStore });
  for (const { name, value, options } of cookiesToSet) {
    response.cookies.set(name, value, options);
  }
  for (const { name, value, options } of extraCookies ?? []) {
    response.cookies.set(name, value, options);
  }
  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType = searchParams.get("type") as EmailOtpType | null;
  const acceptTerms = searchParams.get("terms") === "1";
  const recovery = isRecoveryRequest(searchParams);
  const next = recovery ? "/reset-password" : safeNextPath(searchParams.get("next"));

  const env = getSupabaseEnv();
  if (!env) {
    return NextResponse.redirect(`${origin}/login?error=auth`, {
      headers: HTTP_CACHE.privateNoStore,
    });
  }

  const cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[] = [];

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookies: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookies.forEach(({ name, value, options }) => {
          cookiesToSet.push({ name, value, options });
        });
      },
    },
  });

  let userId: string | undefined;
  let userEmail: string | undefined;
  let authError: string | null = null;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) {
      authError = error?.message ?? "auth";
    } else {
      userId = data.user.id;
      userEmail = data.user.email ?? undefined;
    }
  } else if (tokenHash && otpType) {
    const { data, error } = await supabase.auth.verifyOtp({
      type: otpType,
      token_hash: tokenHash,
    });
    if (error || !data.user) {
      authError = error?.message ?? "auth";
    } else {
      userId = data.user.id;
      userEmail = data.user.email ?? undefined;
    }
  } else {
    authError = "missing_code";
  }

  if (authError || !userId) {
    // Never send recovery failures to /login — middleware would bounce an existing
    // session straight to the dashboard and skip the password form.
    const failPath = recovery
      ? `/forgot-password?error=link`
      : `/login?error=auth`;
    return redirectWithCookies(`${origin}${failPath}`, cookiesToSet);
  }

  const user = await getOrCreateDbUser(userId, userEmail);
  if (acceptTerms && !user.termsAcceptedAt) {
    await prisma.user.update({
      where: { id: user.id },
      data: { termsAcceptedAt: new Date() },
    });
  }

  const extra = recovery
    ? [
        {
          name: RECOVERY_COOKIE,
          value: "1",
          options: {
            path: "/",
            maxAge: RECOVERY_MAX_AGE,
            sameSite: "lax" as const,
            httpOnly: false,
          },
        },
      ]
    : undefined;

  return redirectWithCookies(`${origin}${next}`, cookiesToSet, extra);
}

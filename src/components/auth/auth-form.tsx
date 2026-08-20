"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseEnv, logAuthError } from "@/lib/supabase/env";
import { reportClientError } from "@/lib/client-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LegalNotice } from "@/components/auth/legal-notice";
import { LEGAL_SIGNUP_ERROR_MESSAGE } from "@/lib/legal";

type Mode = "login" | "register" | "otp";

const GOOGLE_LABEL = "Continue with Google";
const EMAIL_REGISTER_LABEL = "Continue with Email";
const EMAIL_LOGIN_LABEL = "Sign in";
const OTP_LABEL = "Send magic link";

function GoogleIcon() {
  return (
    <svg aria-hidden className="h-4 w-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const redirect =
    searchParams.get("redirect") ?? (mode === "register" ? "/" : "/dashboard");
  const role = searchParams.get("role");
  const authError = searchParams.get("error");
  /** After signup, customers land on the homepage; vendors continue business onboarding. */
  const postRegisterPath =
    role === "vendor" ? (searchParams.get("redirect") ?? "/list-your-business") : "/";

  async function refreshAuthState() {
    await queryClient.invalidateQueries({ queryKey: ["me"] });
  }

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [confirmEmailSent, setConfirmEmailSent] = useState(false);

  useEffect(() => {
    if (!getSupabaseEnv()) {
      reportClientError(
        "auth",
        "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then restart npm run dev."
      );
    }
  }, []);

  useEffect(() => {
    if (authError === "registration") {
      reportClientError("auth", LEGAL_SIGNUP_ERROR_MESSAGE);
    }
  }, [authError]);

  async function syncDbUser() {
    const res = await fetch("/api/auth/sync-user", { method: "POST", credentials: "same-origin" });
    if (!res.ok) throw new Error(LEGAL_SIGNUP_ERROR_MESSAGE);
  }

  async function recordAcceptance(method: "email" | "google" | "otp") {
    const res = await fetch("/api/auth/accept-terms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ method }),
    });
    if (!res.ok) throw new Error(LEGAL_SIGNUP_ERROR_MESSAGE);
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!getSupabaseEnv()) return;

    setLoading(true);
    setConfirmEmailSent(false);

    try {
      const supabase = createClient();

      if (mode === "register") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(postRegisterPath)}`,
          },
        });

        if (signUpError) {
          logAuthError(signUpError.message, signUpError);
          return;
        }

        if (data.session) {
          try {
            await syncDbUser();
            await recordAcceptance("email");
          } catch {
            reportClientError("auth", LEGAL_SIGNUP_ERROR_MESSAGE);
            return;
          }
          await refreshAuthState();
          router.push(postRegisterPath);
          router.refresh();
          return;
        }

        setConfirmEmailSent(true);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          logAuthError(signInError.message, signInError);
          return;
        }
        await syncDbUser();
        await refreshAuthState();
        router.push(redirect);
        router.refresh();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      logAuthError(message, err);
    } finally {
      setLoading(false);
    }
  }

  async function handleOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!getSupabaseEnv()) return;

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(redirect)}`,
        },
      });
      if (otpError) logAuthError(otpError.message, otpError);
      else setOtpSent(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      logAuthError(message, err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    if (!getSupabaseEnv()) {
      reportClientError(
        "auth",
        "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local."
      );
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const afterAuthPath = mode === "register" ? postRegisterPath : redirect;

      const callback = new URL("/api/auth/callback", window.location.origin);
      callback.searchParams.set("next", afterAuthPath);

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callback.toString(),
          queryParams: {
            prompt: "select_account",
            access_type: "online",
          },
        },
      });

      if (oauthError) {
        logAuthError(oauthError.message, oauthError);
        reportClientError("auth", oauthError.message || "Google sign-in failed. Try again.");
        return;
      }

      if (data?.url) {
        window.location.assign(data.url);
        return;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      logAuthError(message, err);
      reportClientError("auth", message);
    } finally {
      setLoading(false);
    }
  }

  if (confirmEmailSent && mode === "register") {
    return (
      <div className="glass w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-lg font-semibold">Check your email</p>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then sign in to continue.
        </p>
        <Button variant="gradient" className="mt-6 w-full" asChild>
          <Link href="/login">Go to sign in</Link>
        </Button>
      </div>
    );
  }

  if (otpSent && mode === "otp") {
    return (
      <div className="glass w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-lg font-semibold">Check your email</p>
        <p className="mt-2 text-sm text-muted-foreground">We sent a magic link to {email}</p>
      </div>
    );
  }

  const emailFields = (
    <>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1"
        />
      </div>
      {mode !== "otp" && (
        <div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password">Password</Label>
            {mode === "login" && (
              <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                Forgot password?
              </Link>
            )}
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="mt-1"
          />
        </div>
      )}
    </>
  );

  return (
    <div className="glass w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
      <h1 className="font-display text-2xl font-bold">
        {mode === "login"
          ? "Welcome back"
          : mode === "register"
            ? "Create your Evendor account"
            : "Sign in with OTP"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {mode === "register" && role === "vendor"
          ? "Start listing your event business on Evendor."
          : "Africa's premium event marketplace."}
      </p>

      {mode === "register" ? (
        <>
          <div className="mt-6">
            <LegalNotice googleLabel={GOOGLE_LABEL} emailLabel={EMAIL_REGISTER_LABEL} />
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-4 w-full gap-2"
            onClick={handleGoogle}
            disabled={loading || !getSupabaseEnv()}
          >
            <GoogleIcon />
            {loading ? "Redirecting…" : GOOGLE_LABEL}
          </Button>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <span className="relative mx-auto block w-fit bg-card px-2 text-xs text-muted-foreground">OR</span>
          </div>
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {emailFields}
            <Button type="submit" variant="gradient" className="w-full" disabled={loading || !getSupabaseEnv()}>
              {loading ? "Please wait..." : EMAIL_REGISTER_LABEL}
            </Button>
          </form>
        </>
      ) : (
        <>
          {mode === "otp" && (
            <div className="mt-6">
              <LegalNotice googleLabel={GOOGLE_LABEL} emailLabel={OTP_LABEL} />
            </div>
          )}
          <form onSubmit={mode === "otp" ? handleOtp : handleEmailAuth} className={mode === "otp" ? "mt-4 space-y-4" : "mt-6 space-y-4"}>
            {emailFields}
            <Button type="submit" variant="gradient" className="w-full" disabled={loading || !getSupabaseEnv()}>
              {loading ? "Please wait..." : mode === "otp" ? OTP_LABEL : EMAIL_LOGIN_LABEL}
            </Button>
          </form>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <span className="relative mx-auto block w-fit bg-card px-2 text-xs text-muted-foreground">OR</span>
          </div>
          {mode === "login" && (
            <div className="mb-4">
              <LegalNotice googleLabel={GOOGLE_LABEL} />
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={handleGoogle}
            disabled={loading || !getSupabaseEnv()}
          >
            <GoogleIcon />
            {loading ? "Redirecting…" : GOOGLE_LABEL}
          </Button>
        </>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {mode === "login" ? (
          <>
            No account?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Sign up
            </Link>
          </>
        ) : mode === "register" ? (
          <>
            Have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Log in
            </Link>
          </>
        ) : (
          <Link href="/login" className="text-primary hover:underline">
            Back to password login
          </Link>
        )}
        {" · "}
        <Link href="/otp" className="text-primary hover:underline">
          OTP login
        </Link>
        {" · "}
        <Link href="/terms" className="text-primary hover:underline">
          Terms
        </Link>
        {" · "}
        <Link href="/privacy" className="text-primary hover:underline">
          Privacy
        </Link>
      </p>
    </div>
  );
}

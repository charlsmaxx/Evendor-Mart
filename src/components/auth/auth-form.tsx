"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseEnv, logAuthError } from "@/lib/supabase/env";
import { reportClientError } from "@/lib/client-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "login" | "register" | "otp";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const role = searchParams.get("role");
  const postAuthRedirect =
    role === "vendor" ? (searchParams.get("redirect") ?? "/list-your-business") : redirect;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
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

  async function syncDbUser() {
    await fetch("/api/auth/sync-user", { method: "POST", credentials: "same-origin" });
  }

  async function acceptTermsIfNeeded() {
    if (mode !== "register") return;
    await fetch("/api/auth/accept-terms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acceptTerms: true }),
    });
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!getSupabaseEnv()) return;
    if (mode === "register" && !acceptedTerms) {
      reportClientError("auth", "Please accept the Terms of Service and Privacy Policy.");
      return;
    }

    setLoading(true);
    setConfirmEmailSent(false);

    try {
      const supabase = createClient();

      if (mode === "register") {
        const onboardingPath =
          role === "vendor" ? postAuthRedirect : "/onboarding/customer";

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(onboardingPath)}`,
          },
        });

        if (signUpError) {
          logAuthError(signUpError.message, signUpError);
          return;
        }

        if (data.session) {
          await syncDbUser();
          await acceptTermsIfNeeded();
          router.push(onboardingPath);
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
    if (!getSupabaseEnv()) return;

    setLoading(true);

    try {
      const supabase = createClient();
      const onboardingPath =
        mode === "register" && role === "vendor"
          ? "/list-your-business"
          : mode === "register"
            ? "/onboarding/customer"
            : redirect;

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(onboardingPath)}`,
        },
      });
      if (oauthError) logAuthError(oauthError.message, oauthError);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      logAuthError(message, err);
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

  return (
    <div className="glass w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
      <h1 className="font-display text-2xl font-bold">
        {mode === "login" ? "Welcome back" : mode === "register" ? "Create account" : "Sign in with OTP"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {mode === "register" && role === "vendor"
          ? "Start listing your event business on Evendor."
          : "Africa's premium event marketplace."}
      </p>

      <form onSubmit={mode === "otp" ? handleOtp : handleEmailAuth} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1" />
        </div>
        {mode !== "otp" && (
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="mt-1" />
          </div>
        )}
        {mode === "register" && (
          <label className="flex items-start gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="mt-1"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              required
            />
            <span>
              I agree to the{" "}
              <Link href="/terms" className="text-primary hover:underline" target="_blank">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-primary hover:underline" target="_blank">
                Privacy Policy
              </Link>
            </span>
          </label>
        )}
        <Button type="submit" variant="gradient" className="w-full" disabled={loading || !getSupabaseEnv() || (mode === "register" && !acceptedTerms)}>
          {loading ? "Please wait..." : mode === "login" ? "Sign in" : mode === "register" ? "Sign up" : "Send magic link"}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
        <span className="relative mx-auto block w-fit bg-card px-2 text-xs text-muted-foreground">or</span>
      </div>

      <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={loading || !getSupabaseEnv()}>
        Continue with Google
      </Button>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {mode === "login" ? (
          <>No account? <Link href="/register" className="text-primary hover:underline">Sign up</Link></>
        ) : mode === "register" ? (
          <>Have an account? <Link href="/login" className="text-primary hover:underline">Log in</Link></>
        ) : (
          <Link href="/login" className="text-primary hover:underline">Back to password login</Link>
        )}
        {" · "}
        <Link href="/otp" className="text-primary hover:underline">OTP login</Link>
      </p>
    </div>
  );
}

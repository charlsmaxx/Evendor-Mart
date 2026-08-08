"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseEnv, logAuthError } from "@/lib/supabase/env";
import { reportClientError } from "@/lib/client-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [sessionMissing, setSessionMissing] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!getSupabaseEnv()) return;
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else setSessionMissing(true);
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!getSupabaseEnv()) return;

    if (password.length < 8) {
      reportClientError("auth", "Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      reportClientError("auth", "Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        logAuthError(error.message, error);
        return;
      }
      await supabase.auth.signOut();
      setDone(true);
      setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      logAuthError(message, err);
    } finally {
      setLoading(false);
    }
  }

  if (sessionMissing) {
    return (
      <div className="glass w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-lg font-semibold">Reset link expired</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Request a new password reset email and open the latest link.
        </p>
        <Button variant="gradient" className="mt-6 w-full" asChild>
          <Link href="/forgot-password">Request new link</Link>
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="glass w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-lg font-semibold">Password updated</p>
        <p className="mt-2 text-sm text-muted-foreground">Redirecting you to sign in…</p>
      </div>
    );
  }

  return (
    <div className="glass w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
      <h1 className="font-display text-2xl font-bold">Set a new password</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Choose a new password for your Evendor account.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="mt-1"
            autoComplete="new-password"
            disabled={!ready}
          />
        </div>
        <div>
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            className="mt-1"
            autoComplete="new-password"
            disabled={!ready}
          />
        </div>
        <Button
          type="submit"
          variant="gradient"
          className="w-full"
          disabled={loading || !ready || !getSupabaseEnv()}
        >
          {loading ? "Saving…" : "Update password"}
        </Button>
      </form>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { reportClientError } from "@/lib/client-error";
import { LEGAL_ACCEPT_ERROR_MESSAGE } from "@/lib/legal";

function safeNextPath(raw: string | null) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export function LegalReconsentForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAgree() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/accept-terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ method: "reconsent" }),
      });
      if (res.status === 401) {
        router.replace(`/login?redirect=${encodeURIComponent(`/legal/accept?next=${encodeURIComponent(next)}`)}`);
        return;
      }
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        const message =
          json?.error?.message || LEGAL_ACCEPT_ERROR_MESSAGE;
        setError(message);
        reportClientError("auth", message);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      router.push(next);
      router.refresh();
    } catch {
      setError(LEGAL_ACCEPT_ERROR_MESSAGE);
      reportClientError("auth", LEGAL_ACCEPT_ERROR_MESSAGE);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
      <h1 className="font-display text-2xl font-bold">We&apos;ve updated Evendor&apos;s Terms and Privacy Policy</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Before continuing, please review and accept the latest Terms of Service and Privacy Policy.
      </p>
      <ul className="mt-5 space-y-2 text-sm">
        <li>
          <Link
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Terms of Service
          </Link>
        </li>
        <li>
          <Link
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Privacy Policy
          </Link>
        </li>
      </ul>
      {error ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        variant="gradient"
        className="mt-6 w-full"
        onClick={onAgree}
        disabled={loading}
      >
        {loading ? "Please wait..." : "I Agree & Continue"}
      </Button>
    </div>
  );
}

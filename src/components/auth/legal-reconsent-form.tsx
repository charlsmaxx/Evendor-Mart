"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { reportClientError } from "@/lib/client-error";
import { LEGAL_SIGNUP_ERROR_MESSAGE } from "@/lib/legal";

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

  async function onAgree() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/accept-terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ method: "reconsent" }),
      });
      if (!res.ok) {
        reportClientError("auth", LEGAL_SIGNUP_ERROR_MESSAGE);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      router.push(next);
      router.refresh();
    } catch {
      reportClientError("auth", LEGAL_SIGNUP_ERROR_MESSAGE);
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

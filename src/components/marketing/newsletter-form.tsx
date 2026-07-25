"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMessage(json?.error?.message ?? "Could not subscribe. Please try again.");
        return;
      }
      setStatus("success");
      setMessage("You're on the list — thanks for joining.");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Could not subscribe. Please try again.");
    }
  }

  return (
    <div className="mt-4 space-y-2">
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm"
          required
          disabled={status === "loading"}
          autoComplete="email"
        />
        <Button type="submit" size="sm" className="rounded-lg px-4" disabled={status === "loading"}>
          {status === "loading" ? "…" : "Join"}
        </Button>
      </form>
      {message && (
        <p
          className={`text-xs ${status === "success" ? "text-emerald-700" : "text-destructive"}`}
          role="status"
        >
          {message}
        </p>
      )}
    </div>
  );
}

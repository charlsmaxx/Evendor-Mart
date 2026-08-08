"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { reportClientError } from "@/lib/client-error";

export function CustomerOnboardingForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/onboarding/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fd.get("fullName"),
          city: fd.get("city"),
          preferences: { interests: String(fd.get("interests")).split(",").map((s) => s.trim()) },
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        reportClientError("onboarding-customer", json?.error?.message ?? "Could not save profile");
        return;
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      reportClientError("onboarding-customer", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="glass max-w-lg space-y-4 rounded-2xl p-8">
      <h1 className="font-display text-2xl font-bold">Welcome to Evendor</h1>
      <div>
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" required className="mt-1" />
      </div>
      <div>
        <Label htmlFor="city">City</Label>
        <Input id="city" name="city" placeholder="Lagos" required className="mt-1" />
      </div>
      <div>
        <Label htmlFor="interests">Event interests (comma-separated)</Label>
        <Input id="interests" name="interests" placeholder="Wedding, Corporate" className="mt-1" />
      </div>
      <Button type="submit" variant="gradient" disabled={loading} className="w-full">
        {loading ? "Saving..." : "Continue"}
      </Button>
    </form>
  );
}

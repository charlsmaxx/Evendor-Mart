"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { reportClientError } from "@/lib/client-error";
import { Textarea } from "@/components/ui/textarea";
import { ALL_VENDOR_CATEGORY_OPTIONS } from "@/lib/categories";

export function VendorOnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/onboarding/vendor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: fd.get("businessName"),
          category: fd.get("category"),
          city: fd.get("city"),
          bio: fd.get("bio"),
          listingTitle: fd.get("listingTitle") || undefined,
          listingDescription: fd.get("listingDescription") || undefined,
          priceMin: fd.get("priceMin") ? Number(fd.get("priceMin")) : undefined,
          priceMax: fd.get("priceMax") ? Number(fd.get("priceMax")) : undefined,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        reportClientError("onboarding-vendor", json?.error?.message ?? "Could not save profile");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      reportClientError("onboarding-vendor", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-8 flex gap-2">
        {[
          { n: 1, label: "Business profile" },
          { n: 2, label: "First listing" },
        ].map((s) => (
          <button
            key={s.n}
            type="button"
            onClick={() => setStep(s.n)}
            className={`flex-1 rounded-lg border px-3 py-2 text-left text-sm transition ${
              step === s.n
                ? "border-primary bg-primary/5 text-foreground"
                : "border-border text-muted-foreground hover:border-primary/30"
            }`}
          >
            <span className="font-semibold">Step {s.n}</span>
            <span className="mt-0.5 block text-xs">{s.label}</span>
          </button>
        ))}
      </div>

      <div className={step === 1 ? "space-y-4" : "hidden"}>
        <div>
          <Label htmlFor="businessName">Business name *</Label>
          <Input id="businessName" name="businessName" required placeholder="e.g. Lagos Grand Events" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="category">What do you offer? *</Label>
          <select
            id="category"
            name="category"
            required
            className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
          >
            {ALL_VENDOR_CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="city">Primary city *</Label>
          <Input id="city" name="city" required placeholder="Lagos" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="bio">About your business</Label>
          <Textarea
            id="bio"
            name="bio"
            rows={4}
            placeholder="Describe your services, experience, and what makes you stand out…"
            className="mt-1"
          />
        </div>
        <Button type="button" variant="gradient" className="w-full" onClick={() => setStep(2)}>
          Continue to listing
        </Button>
      </div>

      <div className={step === 2 ? "space-y-4" : "hidden"}>
        <p className="text-sm text-muted-foreground">
          Add pricing details to appear in the marketplace (optional — we can use your business name if you skip).
        </p>
        <div>
          <Label htmlFor="listingTitle">Listing title</Label>
          <Input id="listingTitle" name="listingTitle" placeholder="Premium wedding photography package" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="listingDescription">Description</Label>
          <Textarea
            id="listingDescription"
            name="listingDescription"
            rows={3}
            placeholder="What customers get when they book you…"
            className="mt-1"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="priceMin">Min price (NGN)</Label>
            <Input id="priceMin" name="priceMin" type="number" placeholder="150000" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="priceMax">Max price (NGN)</Label>
            <Input id="priceMax" name="priceMax" type="number" placeholder="500000" className="mt-1" />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
            Back
          </Button>
          <Button type="submit" variant="gradient" className="flex-1" disabled={loading}>
            {loading ? "Saving…" : "Save & open dashboard"}
          </Button>
        </div>
        <Button type="submit" variant="ghost" className="w-full text-muted-foreground" disabled={loading}>
          Skip listing for now
        </Button>
      </div>

    </form>
  );
}

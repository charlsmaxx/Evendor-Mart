"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Crown, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVendorSubscription, PREMIUM_BENEFITS } from "@/hooks/use-vendor-subscription";
import { useQueryClient } from "@tanstack/react-query";
import { reportClientError } from "@/lib/client-error";

export function VendorSubscriptionContent() {
  const [loading, setLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data: sub, refetch } = useVendorSubscription();

  useEffect(() => {
    if (searchParams.get("success") !== "1") return;
    void fetch("/api/subscriptions/confirm", { method: "POST", credentials: "same-origin" })
      .then((res) => res.json())
      .then(() => {
        void refetch();
        void queryClient.invalidateQueries({ queryKey: ["vendor-overview"] });
      })
      .catch((err) => reportClientError("subscription-confirm", err));
  }, [searchParams, refetch, queryClient]);

  async function subscribe() {
    setLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/subscriptions", { method: "POST", credentials: "same-origin" });
      const json = await res.json();
      if (json.data?.authorization_url) {
        window.location.href = json.data.authorization_url;
        return;
      }
      setCheckoutError(json.error?.message ?? "Checkout failed. Please try again.");
    } catch {
      setCheckoutError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const isPremium = sub?.isPremium ?? false;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Premium — Business OS</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          One platform for marketplace bookings and day-to-day business management.
        </p>
      </div>

      {isPremium ? (
        <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-5 py-4">
          <Crown className="h-8 w-8 text-primary" />
          <div>
            <p className="font-semibold">You&apos;re on Premium</p>
            <p className="text-sm text-muted-foreground">
              Manual bookings, CRM, staff, analytics, and exports are unlocked.
            </p>
          </div>
        </div>
      ) : (
        <div className="glass max-w-lg rounded-2xl border border-border p-8">
          <p className="text-3xl font-bold">
            ₦5,000
            <span className="text-base font-normal text-muted-foreground">/month</span>
          </p>
          <ul className="mt-6 space-y-3">
            {PREMIUM_BENEFITS.map((b) => (
              <li key={b.title} className="flex gap-2 text-sm">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <strong>{b.title}</strong> — {b.desc}
                </span>
              </li>
            ))}
          </ul>
          <Button className="mt-8 w-full gap-2" variant="gradient" onClick={subscribe} disabled={loading}>
            <Crown className="h-4 w-4" />
            {loading ? "Redirecting…" : "Upgrade to Premium"}
          </Button>
          {checkoutError && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{checkoutError}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/vendor/manual-booking" className="text-primary hover:underline">
          Manual bookings →
        </Link>
        <Link href="/vendor/crm" className="text-primary hover:underline">
          Customer CRM →
        </Link>
        <Link href="/vendor/analytics" className="text-primary hover:underline">
          Analytics →
        </Link>
      </div>
    </div>
  );
}

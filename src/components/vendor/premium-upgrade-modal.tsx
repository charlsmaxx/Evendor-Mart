"use client";

import Link from "next/link";
import { Crown, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PREMIUM_BENEFITS, FEATURE_HEADLINES } from "@/hooks/use-vendor-subscription";
import type { PremiumFeature } from "@/core/subscription-engine/types";

type PremiumUpgradeModalProps = {
  open: boolean;
  onClose: () => void;
  feature?: PremiumFeature;
};

export function PremiumUpgradeModal({ open, onClose, feature }: PremiumUpgradeModalProps) {
  if (!open) return null;

  const headline = feature ? FEATURE_HEADLINES[feature] ?? "Upgrade to Premium" : "Upgrade to Premium";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-2xl">
        <div className="bg-gradient-to-br from-primary/15 via-card to-card px-6 pb-2 pt-6">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15">
            <Crown className="h-6 w-6 text-primary" />
          </div>
          <h2 className="font-display text-2xl font-bold">{headline}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Run your entire event business on Evendor — not just marketplace bookings. Premium
            unlocks your Business Operating System.
          </p>
        </div>
        <div className="space-y-3 px-6 py-5">
          {PREMIUM_BENEFITS.map((b) => (
            <div key={b.title} className="flex gap-3 rounded-xl border border-border/60 px-3 py-2.5">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold">{b.title}</p>
                <p className="text-xs text-muted-foreground">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 border-t border-border px-6 py-4 sm:flex-row">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Maybe later
          </Button>
          <Button variant="gradient" className="flex-1 gap-2" asChild>
            <Link href="/vendor/subscription">
              <Crown className="h-4 w-4" />
              Upgrade — ₦5,000/mo
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

type PremiumGateButtonProps = {
  feature: PremiumFeature;
  isPremium: boolean;
  onUpgrade: () => void;
  children: React.ReactNode;
  className?: string;
};

/** Shows upgrade modal for free users; renders children as-is for Premium. */
export function PremiumGateButton({
  feature,
  isPremium,
  onUpgrade,
  children,
  className,
}: PremiumGateButtonProps) {
  if (isPremium) {
    return <>{children}</>;
  }

  return (
    <button type="button" className={className} onClick={onUpgrade}>
      {children}
    </button>
  );
}

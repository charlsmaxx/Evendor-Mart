"use client";

import { calculateBusinessHealth } from "@/lib/vendor-onboarding/completion";
import { ONBOARDING_TOTAL_STEPS } from "@/lib/vendor-onboarding/types";
import type { VendorOnboardingDraft } from "@/lib/vendor-onboarding/types";
import { CheckCircle2, Circle } from "lucide-react";

const STEP_LABELS = [
  "Business",
  "Location",
  "Services",
  "Portfolio",
  "Details",
  "Availability",
  "Preferences",
  "Payouts",
];

export function OnboardingProgress({
  step,
  draft,
  saving,
}: {
  step: number;
  draft: VendorOnboardingDraft;
  saving?: boolean;
}) {
  const health = calculateBusinessHealth(draft);
  const overall = Math.round(
    ((step - 1) / ONBOARDING_TOTAL_STEPS) * 40 + (health.score / 100) * 60
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          Step {step} of {ONBOARDING_TOTAL_STEPS}
        </span>
        <span className="text-muted-foreground">{saving ? "Saving…" : "Autosaved"}</span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${overall}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{overall}% complete</p>

      <div className="rounded-2xl border border-border bg-card/80 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Business Health</p>
          <p className="text-lg font-bold text-primary">{health.score}%</p>
        </div>
        <p className="text-xs text-muted-foreground">{health.label}</p>
        <ul className="mt-3 max-h-40 space-y-1.5 overflow-y-auto text-xs">
          {health.items
            .filter((i) => !i.done)
            .slice(0, 5)
            .map((item) => (
              <li key={item.id} className="flex items-start gap-2 text-muted-foreground">
                <Circle className="mt-0.5 h-3 w-3 shrink-0" />
                {item.label}
              </li>
            ))}
          {health.items.filter((i) => i.done).length > 0 && (
            <li className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-3 w-3" />
              {health.items.filter((i) => i.done).length} items completed
            </li>
          )}
        </ul>
      </div>

      <div className="hidden gap-1 sm:grid sm:grid-cols-4 lg:grid-cols-8">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const active = n === step;
          const done = n < step;
          return (
            <div
              key={label}
              className={`rounded-lg px-1 py-2 text-center text-[10px] ${
                active
                  ? "bg-primary/10 font-semibold text-primary"
                  : done
                    ? "text-emerald-600"
                    : "text-muted-foreground"
              }`}
            >
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

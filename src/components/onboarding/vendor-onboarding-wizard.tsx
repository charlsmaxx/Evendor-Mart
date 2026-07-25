"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { reportClientError } from "@/lib/client-error";
import {
  defaultDraft,
  mergeDraft,
  ONBOARDING_TOTAL_STEPS,
  type BusinessKind,
  type VendorOnboardingDraft,
} from "@/lib/vendor-onboarding/types";
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { OnboardingStepLoader } from "@/components/onboarding/onboarding-step-loader";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";

export function VendorOnboardingWizard({ businessKind }: { businessKind: BusinessKind }) {
  const router = useRouter();
  const isVenue = businessKind === "VENUE";
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<VendorOnboardingDraft>(() => defaultDraft(businessKind));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [stepHint, setStepHint] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydrated = useRef(false);

  const persist = useCallback(
    async (next: VendorOnboardingDraft, opts?: { silent?: boolean }) => {
      if (!opts?.silent) setSaving(true);
      try {
        const res = await fetch("/api/onboarding/vendor/draft", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...next, businessKind, currentStep: next.currentStep }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message ?? "Save failed");
        if (json.data?.draft) setDraft(json.data.draft);
      } catch (e) {
        if (!opts?.silent) reportClientError("onboarding-save", e);
      } finally {
        if (!opts?.silent) setSaving(false);
      }
    },
    [businessKind]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/onboarding/vendor/draft?businessKind=${businessKind}`);
        const json = await res.json();
        if (!cancelled && res.ok && json.data?.draft) {
          const loaded = json.data.draft as VendorOnboardingDraft;
          setDraft(loaded);
          setStep(Math.min(Math.max(loaded.currentStep || 1, 1), ONBOARDING_TOTAL_STEPS));
        }
      } catch {
        /* fresh start */
      } finally {
        if (!cancelled) {
          hydrated.current = true;
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [businessKind]);

  const update = useCallback(
    (patch: Partial<VendorOnboardingDraft>) => {
      setStepHint(null);
      setDraft((prev) => {
        const next = mergeDraft(prev, { ...patch, currentStep: step });
        if (hydrated.current) {
          if (saveTimer.current) clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => void persist(next, { silent: true }), 1200);
        }
        return next;
      });
    },
    [persist, step]
  );

  async function goTo(nextStep: number) {
    setStepHint(null);
    const next = mergeDraft(draft, { currentStep: nextStep });
    setDraft(next);
    await persist(next);
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validateStep(): string | null {
    if (step === 1 && !draft.step1.businessName.trim()) {
      return "Please fill in your business name to continue.";
    }
    if (step === 2 && (!draft.step2.city.trim() || !draft.step2.address.trim())) {
      return "Please fill in your city and business address to continue.";
    }
    if (step === 8 && !draft.step8.accountName) {
      return "Please verify your bank account before publishing.";
    }
    return null;
  }

  async function handleContinue() {
    const hint = validateStep();
    if (hint) {
      setStepHint(hint);
      return;
    }
    setStepHint(null);
    if (step < ONBOARDING_TOTAL_STEPS) {
      await goTo(step + 1);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/onboarding/vendor/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessKind }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Could not publish");
      router.push(json.data?.redirectTo ?? (isVenue ? "/vendor/listings" : "/dashboard"));
      router.refresh();
    } catch (e) {
      reportClientError("onboarding", e);
    } finally {
      setSubmitting(false);
    }
  }

  async function resumeLater() {
    await persist(mergeDraft(draft, { currentStep: step }));
    router.push("/dashboard");
  }

  if (loading) {
    return <p className="text-center text-muted-foreground py-12">Loading your progress…</p>;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <OnboardingProgress step={step} draft={draft} saving={saving} />
      </aside>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <OnboardingStepLoader step={step} draft={draft} update={update} isVenue={isVenue} />

        {stepHint && (
          <p
            role="status"
            className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            {stepHint}
          </p>
        )}

        <div className="mt-8 flex flex-wrap gap-3 border-t border-border pt-6">
          {step > 1 && (
            <Button type="button" variant="outline" className="gap-1" onClick={() => void goTo(step - 1)}>
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={() => void resumeLater()}>
            <Save className="mr-1 h-4 w-4" /> Resume later
          </Button>
          <Button
            type="button"
            variant="gradient"
            className="ml-auto gap-1"
            disabled={saving || submitting}
            onClick={() => void handleContinue()}
          >
            {step === ONBOARDING_TOTAL_STEPS
              ? submitting
                ? "Publishing…"
                : "Publish profile"
              : "Save & continue"}
            {step < ONBOARDING_TOTAL_STEPS && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

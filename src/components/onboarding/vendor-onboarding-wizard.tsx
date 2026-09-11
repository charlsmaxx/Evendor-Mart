"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { reportClientError } from "@/lib/client-error";
import { apiErrorMessage, readApiJson, userFacingRequestError } from "@/lib/api-client";
import {
  defaultDraft,
  mergeDraft,
  ONBOARDING_TOTAL_STEPS,
  type BusinessKind,
  type DraftUpdater,
  type VendorOnboardingDraft,
} from "@/lib/vendor-onboarding/types";
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { OnboardingStepLoader } from "@/components/onboarding/onboarding-step-loader";
import { BrandLoader } from "@/components/loading/brand-loader";
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
  const draftRef = useRef(draft);
  const saveSeq = useRef(0);
  const stepRef = useRef(step);
  draftRef.current = draft;
  stepRef.current = step;

  const persist = useCallback(
    async (opts?: { silent?: boolean; snapshot?: VendorOnboardingDraft }) => {
      const payload = opts?.snapshot ?? draftRef.current;
      const seq = ++saveSeq.current;
      const showSaving = !opts?.silent;
      if (showSaving) setSaving(true);
      try {
        const res = await fetch("/api/onboarding/vendor/draft", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, businessKind, currentStep: payload.currentStep }),
        });
        const { ok, json } = await readApiJson<{
          error?: { message?: string };
          data?: { draft?: VendorOnboardingDraft };
        }>(res);
        if (!ok) throw new Error(apiErrorMessage(json, "Save failed"));
        if (seq !== saveSeq.current) return;
        const serverSlug = json?.data?.draft?.step1?.slug;
        if (serverSlug && !draftRef.current.step1.slug) {
          setDraft((prev) => {
            if (prev.step1.slug) return prev;
            const next = mergeDraft(prev, {
              step1: {
                ...prev.step1,
                slug: serverSlug,
              },
            });
            draftRef.current = next;
            return next;
          });
        }
      } catch (e) {
        if (showSaving) {
          reportClientError("onboarding-save", e);
          throw e;
        }
      } finally {
        if (showSaving) setSaving(false);
      }
    },
    [businessKind]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/onboarding/vendor/draft?businessKind=${businessKind}`);
        const { ok, json } = await readApiJson<{ data?: { draft?: VendorOnboardingDraft } }>(res);
        if (!cancelled && ok && json?.data?.draft) {
          const loaded = json.data.draft;
          draftRef.current = loaded;
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

  const update = useCallback<DraftUpdater>((patch) => {
    setStepHint(null);
    setDraft((prev) => {
      const resolved = typeof patch === "function" ? patch(prev) : patch;
      const next = mergeDraft(prev, { ...resolved, currentStep: stepRef.current });
      draftRef.current = next;
      return next;
    });
    if (!hydrated.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void persist({ silent: true, snapshot: draftRef.current });
    }, 1500);
  }, [persist]);

  async function goTo(nextStep: number) {
    setStepHint(null);
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const next = mergeDraft(draftRef.current, { currentStep: nextStep });
    draftRef.current = next;
    setDraft(next);
    try {
      await persist({ snapshot: next });
    } catch (e) {
      setStepHint(userFacingRequestError(e, "Could not save your progress. Please try again."));
      return;
    }
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validateStep(): string | null {
    const current = draftRef.current;
    if (step === 1 && !current.step1.businessName.trim()) {
      return "Please fill in your business name to continue.";
    }
    if (step === 2 && (!current.step2.city.trim() || !current.step2.address.trim())) {
      return "Please fill in your city and business address to continue.";
    }
    if (step === 8 && !current.step8.accountName) {
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

    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }

    setSubmitting(true);
    try {
      const snapshot = mergeDraft(draftRef.current, { currentStep: step });
      draftRef.current = snapshot;
      await persist({ snapshot, silent: true });

      const res = await fetch("/api/onboarding/vendor/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessKind, draft: snapshot }),
      });
      const { ok, json } = await readApiJson<{
        error?: { message?: string };
        data?: { redirectTo?: string };
      }>(res);
      if (!ok) throw new Error(apiErrorMessage(json, "Could not publish"));
      router.push(json?.data?.redirectTo ?? `/marketplace`);
      router.refresh();
    } catch (e) {
      reportClientError("onboarding", e);
      setStepHint(userFacingRequestError(e, "Could not publish your listing. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  async function resumeLater() {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    try {
      await persist({ snapshot: mergeDraft(draftRef.current, { currentStep: step }) });
      router.push("/dashboard");
    } catch (e) {
      setStepHint(userFacingRequestError(e, "Could not save your progress. Please try again."));
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <BrandLoader size="lg" label="Loading your progress" />
        <p className="mt-4 text-center text-sm text-muted-foreground">Loading your progress…</p>
      </div>
    );
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
            <Button type="button" variant="outline" className="gap-1" disabled={submitting} onClick={() => void goTo(step - 1)}>
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
          )}
          <Button type="button" variant="ghost" disabled={submitting} onClick={() => void resumeLater()}>
            <Save className="mr-1 h-4 w-4" /> Resume later
          </Button>
          <Button
            type="button"
            variant="gradient"
            className="ml-auto gap-1"
            disabled={submitting}
            onClick={() => void handleContinue()}
          >
            {step === ONBOARDING_TOTAL_STEPS
              ? submitting
                ? "Publishing…"
                : "Publish profile"
              : saving
                ? "Saving…"
                : "Save & continue"}
            {step < ONBOARDING_TOTAL_STEPS && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

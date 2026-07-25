"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ensureSessionStart,
  isIosSafari,
  isStandaloneDisplay,
  markInstallDismissed,
  markInstalled,
  meetsEngagementGate,
  trackPageView,
  trackVisit,
  wasInstallDismissedRecently,
  wasInstalledFlag,
} from "@/lib/pwa";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

/**
 * Non-intrusive install modal. Never shows on first paint; waits for engagement
 * signals, respects dismissal, and stays hidden once installed / standalone.
 */
export function InstallPrompt() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [readyToAsk, setReadyToAsk] = useState(false);
  const visitsRef = useRef(0);
  const sessionStartRef = useRef(Date.now());

  useEffect(() => {
    if (isStandaloneDisplay() || wasInstalledFlag() || wasInstallDismissedRecently()) {
      return;
    }

    visitsRef.current = trackVisit();
    sessionStartRef.current = ensureSessionStart();

    const evaluate = () => {
      if (isStandaloneDisplay() || wasInstalledFlag() || wasInstallDismissedRecently()) return;
      const pages = trackPageView(pathname || "/");
      if (
        meetsEngagementGate({
          visits: visitsRef.current,
          pages,
          sessionStart: sessionStartRef.current,
        })
      ) {
        setReadyToAsk(true);
      }
    };

    evaluate();
    const timer = window.setTimeout(evaluate, 30_000);

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      markInstalled();
      setOpen(false);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
    // Mount-only for event listeners + visit tracking; pages re-evaluated below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isStandaloneDisplay() || wasInstalledFlag() || wasInstallDismissedRecently()) return;
    const pages = trackPageView(pathname || "/");
    if (
      meetsEngagementGate({
        visits: visitsRef.current || trackVisit(),
        pages,
        sessionStart: sessionStartRef.current || ensureSessionStart(),
      })
    ) {
      setReadyToAsk(true);
    }
  }, [pathname]);

  useEffect(() => {
    if (!readyToAsk) return;
    if (isStandaloneDisplay() || wasInstalledFlag() || wasInstallDismissedRecently()) return;

    if (deferred) {
      setOpen(true);
      setIosHint(false);
      return;
    }

    if (isIosSafari()) {
      setIosHint(true);
      setOpen(true);
    }
  }, [readyToAsk, deferred]);

  async function handleInstall() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      markInstalled();
    } else {
      markInstallDismissed();
    }
    setDeferred(null);
    setOpen(false);
  }

  function handleDismiss() {
    markInstallDismissed();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : handleDismiss())}>
      <DialogContent className="max-w-md border-[#A12A4A]/15">
        <DialogHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#A12A4A]/10 text-[#A12A4A]">
            <Download className="h-6 w-6" aria-hidden />
          </div>
          <DialogTitle className="font-display text-xl text-[#7A2E3D]">
            Install Evendor
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Install Evendor for a faster, smoother experience. Access vendors instantly, receive
          updates, and launch Evendor directly from your home screen.
        </p>
        {iosHint && (
          <p className="rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            On iPhone: tap the Share button, then{" "}
            <span className="font-semibold">Add to Home Screen</span>.
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleDismiss}>
            Maybe Later
          </Button>
          {!iosHint && (
            <Button
              type="button"
              variant="gradient"
              className="bg-[#A12A4A] hover:bg-[#7A2E3D]"
              onClick={handleInstall}
              disabled={!deferred}
            >
              Install
            </Button>
          )}
          {iosHint && (
            <Button
              type="button"
              variant="gradient"
              className="bg-[#A12A4A] hover:bg-[#7A2E3D]"
              onClick={handleDismiss}
            >
              Got it
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

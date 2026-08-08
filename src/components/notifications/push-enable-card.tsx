"use client";

import { useEffect, useState } from "react";
import { BellRing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getPushPermission,
  isWebPushSupported,
  subscribeToWebPush,
  unsubscribeFromWebPush,
} from "@/lib/web-push-client";
import { reportClientError } from "@/lib/client-error";

export function PushEnableCard() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "default"
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setSupported(isWebPushSupported());
    void getPushPermission().then(setPermission);
  }, []);

  if (!supported) return null;

  async function enable() {
    setLoading(true);
    setMessage(null);
    try {
      const result = await subscribeToWebPush();
      if (result.ok) {
        setPermission("granted");
        setMessage("Push alerts enabled. You’ll get notified even when the app is closed.");
      } else {
        setMessage(result.reason);
      }
      setPermission(await getPushPermission());
    } catch (err) {
      reportClientError("web-push", err);
      setMessage("Could not enable push alerts. Try again from an installed app or supported browser.");
    } finally {
      setLoading(false);
    }
  }

  async function disable() {
    setLoading(true);
    setMessage(null);
    try {
      await unsubscribeFromWebPush();
      setPermission(await getPushPermission());
      setMessage("Push alerts turned off on this device.");
    } catch (err) {
      reportClientError("web-push", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <BellRing className="h-5 w-5" />
          </span>
          <div>
            <p className="font-medium">Alerts when the app is closed</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Allow notifications so Evendor can alert you about bookings and payouts on this device.
            </p>
          </div>
        </div>
        {permission === "granted" ? (
          <Button variant="outline" size="sm" disabled={loading} onClick={disable}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Turn off"}
          </Button>
        ) : (
          <Button size="sm" disabled={loading || permission === "denied"} onClick={enable}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enable alerts"}
          </Button>
        )}
      </div>
      {permission === "denied" && (
        <p className="mt-3 text-xs text-amber-700">
          Notifications are blocked in your browser settings. Enable them for this site to receive
          closed-app alerts.
        </p>
      )}
      {message && <p className="mt-3 text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}

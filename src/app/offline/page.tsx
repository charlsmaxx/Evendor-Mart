import { WifiOff } from "lucide-react";
import { OfflineRetryButton } from "@/components/pwa/offline-retry-button";

export const metadata = {
  title: "You're Offline",
  robots: { index: false, follow: false },
};

/**
 * Precached offline fallback. Shown by the service worker when a navigation
 * request fails (no network). Purely presentational — no business logic.
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-gradient-to-b from-[#A12A4A]/8 via-white to-white px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#A12A4A]/10 text-[#A12A4A]">
        <WifiOff className="h-8 w-8" aria-hidden />
      </div>
      <h1 className="mt-6 font-display text-3xl font-bold tracking-tight text-[#7A2E3D]">
        You&apos;re Offline
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        Please reconnect to continue exploring trusted event vendors.
      </p>
      <div className="mt-8">
        <OfflineRetryButton />
      </div>
    </main>
  );
}

import { AppNav } from "@/components/app/app-nav";
import { CompareDrawerLazy } from "@/components/app/compare-drawer-lazy";
import { LegalAcceptanceGate } from "@/components/legal/legal-acceptance-gate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <LegalAcceptanceGate>
      <div className="min-h-screen">
        <AppNav />
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
        <CompareDrawerLazy />
      </div>
    </LegalAcceptanceGate>
  );
}

import { formatCurrency } from "@/lib/utils";
import type { VendorPackage } from "@/lib/vendor-packages";
import { Check } from "lucide-react";

const TIER_STYLES: Record<VendorPackage["tier"], string> = {
  BASIC: "border-border bg-card",
  PREMIUM: "border-primary/30 bg-primary/5",
  LUXURY: "border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20",
};

export function VendorPackagesSection({ packages }: { packages: VendorPackage[] }) {
  if (packages.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-semibold">Packages</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Compare tiers and choose what fits your event.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {packages.map((pkg) => (
          <div
            key={pkg.tier}
            className={`rounded-2xl border p-5 ${TIER_STYLES[pkg.tier]}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {pkg.tier}
            </p>
            <p className="mt-1 font-display text-lg font-bold">{pkg.name}</p>
            <p className="mt-2 text-2xl font-bold text-primary">{formatCurrency(pkg.price)}</p>
            {pkg.description && (
              <p className="mt-3 text-sm text-muted-foreground">{pkg.description}</p>
            )}
            {pkg.features.length > 0 && (
              <ul className="mt-4 space-y-2 text-sm">
                {pkg.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

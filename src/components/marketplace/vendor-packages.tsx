import { formatCurrency } from "@/lib/utils";
import {
  PACKAGE_BADGE_LABELS,
  packageBasePrice,
  type VendorPackage,
} from "@/lib/vendor-packages";
import { Check } from "lucide-react";

export function VendorPackagesSection({ packages }: { packages: VendorPackage[] }) {
  if (packages.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-semibold">Packages</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Compare packages and choose what fits your event. Add-ons are selected at booking.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {pkg.tier ?? "Package"}
              </p>
              {pkg.badge && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {PACKAGE_BADGE_LABELS[pkg.badge]}
                </span>
              )}
            </div>
            <p className="mt-1 font-display text-lg font-bold">{pkg.name}</p>
            <p className="mt-2 text-2xl font-bold text-primary">
              {formatCurrency(packageBasePrice(pkg))}
            </p>
            {(pkg.shortDescription || pkg.description) && (
              <p className="mt-3 text-sm text-muted-foreground">
                {pkg.shortDescription || pkg.description}
              </p>
            )}
            {pkg.estimatedDuration && (
              <p className="mt-2 text-xs text-muted-foreground">
                Est. duration: {pkg.estimatedDuration}
              </p>
            )}
            {pkg.features.length > 0 && (
              <ul className="mt-4 space-y-2 text-sm">
                {pkg.features.filter(Boolean).map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            )}
            {pkg.addOns.some((a) => a.active) && (
              <p className="mt-4 text-xs text-muted-foreground">
                {pkg.addOns.filter((a) => a.active).length} optional add-on
                {pkg.addOns.filter((a) => a.active).length === 1 ? "" : "s"} available at booking
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

import { formatCurrency } from "@/lib/utils";
import {
  PACKAGE_BADGE_LABELS,
  packageBasePrice,
  type VendorPackage,
} from "@/lib/vendor-packages";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function VendorPackagesSection({ packages }: { packages: VendorPackage[] }) {
  if (packages.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-semibold">Packages</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Compare packages and choose what fits your event. Add-ons are selected at booking.
      </p>
      <div
        className={cn(
          "mt-4 grid gap-4",
          packages.length === 1 && "md:grid-cols-1 md:max-w-md",
          packages.length === 2 && "md:grid-cols-2",
          packages.length >= 3 && "md:grid-cols-3"
        )}
      >
        {packages.map((pkg) => {
          const popular = pkg.badge === "POPULAR";
          return (
            <div
              key={pkg.id}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-card p-5 shadow-sm transition hover:shadow-md",
                popular ? "border-primary ring-1 ring-primary/25" : "border-border"
              )}
            >
              {pkg.badge && (
                <span className="absolute -top-2.5 right-4 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                  {PACKAGE_BADGE_LABELS[pkg.badge]}
                </span>
              )}
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {pkg.tier ?? "Package"}
              </p>
              <p className="mt-1 font-display text-lg font-bold">{pkg.name}</p>
              <p className="mt-2 font-display text-2xl font-bold text-primary">
                {formatCurrency(packageBasePrice(pkg))}
              </p>
              {(pkg.shortDescription || pkg.description) && (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {pkg.shortDescription || pkg.description}
                </p>
              )}
              {pkg.estimatedDuration && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Est. duration: {pkg.estimatedDuration}
                </p>
              )}
              {pkg.features.length > 0 && (
                <ul className="mt-4 flex-1 space-y-2 text-sm">
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
          );
        })}
      </div>
    </section>
  );
}

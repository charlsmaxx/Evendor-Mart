"use client";

import { formatCurrency } from "@/lib/utils";
import {
  PACKAGE_BADGE_LABELS,
  formatCancellationPolicyLines,
  packageBasePrice,
  type VendorPackage,
} from "@/lib/vendor-packages";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
          "-mx-4 mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:overflow-visible md:px-0 md:pb-0",
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
                "relative flex h-[300px] w-[82vw] shrink-0 snap-start flex-col rounded-2xl border bg-card p-4 shadow-sm transition hover:shadow-md md:w-auto",
                popular ? "border-primary ring-1 ring-primary/25" : "border-border"
              )}
            >
              {pkg.badge && (
                <span className="absolute right-4 top-3 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                  {PACKAGE_BADGE_LABELS[pkg.badge]}
                </span>
              )}
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {pkg.tier ?? "Package"}
              </p>
              <p className="mt-1 truncate font-display text-lg font-bold">{pkg.name}</p>
              <p className="mt-1 font-display text-2xl font-bold text-primary">
                {formatCurrency(packageBasePrice(pkg))}
              </p>
              {(pkg.shortDescription || pkg.description) && (
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {pkg.shortDescription || pkg.description}
                </p>
              )}
              {pkg.estimatedDuration && (
                <p className="mt-2 truncate text-xs text-muted-foreground">
                  Est. duration: {pkg.estimatedDuration}
                </p>
              )}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="mt-auto w-full">
                    View details
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="font-display text-2xl">{pkg.name}</DialogTitle>
                    <p className="font-display text-xl font-bold text-primary">
                      {formatCurrency(packageBasePrice(pkg))}
                    </p>
                  </DialogHeader>
                  {pkg.description && (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {pkg.description}
                    </p>
                  )}
                  {pkg.estimatedDuration && (
                    <p className="text-sm text-muted-foreground">
                      Estimated duration: {pkg.estimatedDuration}
                    </p>
                  )}
                  {pkg.features.filter(Boolean).length > 0 && (
                    <div>
                      <h3 className="font-semibold">What&apos;s included</h3>
                      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                        {pkg.features.filter(Boolean).map((feature) => (
                          <li key={feature} className="flex items-start gap-2">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {pkg.addOns.some((addOn) => addOn.active) && (
                    <div>
                      <h3 className="font-semibold">Optional add-ons</h3>
                      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                        {pkg.addOns.filter((addOn) => addOn.active).map((addOn) => (
                          <li key={addOn.id}>
                            <span className="font-medium text-foreground">{addOn.name}</span>
                            {addOn.description ? ` — ${addOn.description}` : ""}
                            {addOn.price > 0 ? ` (${formatCurrency(addOn.price)})` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {formatCancellationPolicyLines(pkg.cancellationPolicy).length > 0 && (
                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                      <h3 className="font-semibold">Package cancellation policy</h3>
                      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                        {formatCancellationPolicyLines(pkg.cancellationPolicy).map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                      {pkg.cancellationPolicy.notes && (
                        <p className="mt-3 text-sm text-foreground">{pkg.cancellationPolicy.notes}</p>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Select this package when booking to continue with Evendor&apos;s standard booking flow.
                  </p>
                </DialogContent>
              </Dialog>
            </div>
          );
        })}
      </div>
    </section>
  );
}

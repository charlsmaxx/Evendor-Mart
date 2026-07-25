"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { normalizePackages, type VendorPackage } from "@/lib/vendor-packages";

export type { VendorPackage };
export { normalizePackages };

type PackageEditorProps = {
  value: VendorPackage[];
  onChange: (packages: VendorPackage[]) => void;
};

const TIER_LABELS: Record<VendorPackage["tier"], string> = {
  BASIC: "Basic",
  PREMIUM: "Premium",
  LUXURY: "Luxury",
};

export function PackageEditor({ value, onChange }: PackageEditorProps) {
  const packages = value.length ? value : normalizePackages([]);

  function update(tier: VendorPackage["tier"], patch: Partial<VendorPackage>) {
    onChange(packages.map((p) => (p.tier === tier ? { ...p, ...patch } : p)));
  }

  return (
    <div className="space-y-4">
      {packages.map((pkg) => (
        <div
          key={pkg.tier}
          className="space-y-3 rounded-xl border border-border/80 bg-background/40 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">{TIER_LABELS[pkg.tier]}</p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={pkg.enabled}
                onChange={(e) => update(pkg.tier, { enabled: e.target.checked })}
              />
              Show on public profile
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Package name</Label>
              <Input
                value={pkg.name}
                onChange={(e) => update(pkg.tier, { name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Price (NGN)</Label>
              <Input
                type="number"
                min={0}
                value={pkg.price > 0 ? pkg.price : ""}
                onChange={(e) => update(pkg.tier, { price: Number(e.target.value) || 0 })}
              />
              {pkg.price > 0 && (
                <p className="text-xs text-muted-foreground">{formatCurrency(pkg.price)}</p>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={pkg.description}
              onChange={(e) => update(pkg.tier, { description: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Features (one per line)</Label>
            <Textarea
              rows={3}
              value={pkg.features.join("\n")}
              onChange={(e) =>
                update(pkg.tier, {
                  features: e.target.value.split("\n"),
                })
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
}

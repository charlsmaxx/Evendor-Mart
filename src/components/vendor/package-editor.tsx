"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
  emptyPackage,
  formatCancellationPolicyLines,
  normalizePackages,
  policyForPreset,
  type CancellationPolicyPreset,
  type PackageAddOn,
  type PackageBadge,
  type VendorPackage,
} from "@/lib/vendor-packages";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

export type { VendorPackage };
export { normalizePackages };

type PackageEditorProps = {
  value: VendorPackage[];
  onChange: (packages: VendorPackage[]) => void;
};

const BADGE_OPTIONS: { value: PackageBadge | ""; label: string }[] = [
  { value: "", label: "No badge" },
  { value: "POPULAR", label: "Popular" },
  { value: "BEST_VALUE", label: "Best Value" },
  { value: "PREMIUM", label: "Premium" },
  { value: "NEW", label: "New" },
];

const POLICY_OPTIONS: { value: CancellationPolicyPreset; label: string }[] = [
  { value: "FLEXIBLE", label: "Flexible" },
  { value: "MODERATE", label: "Moderate (recommended)" },
  { value: "STRICT", label: "Strict" },
  { value: "CUSTOM", label: "Custom windows" },
];

export function PackageEditor({ value, onChange }: PackageEditorProps) {
  const packages = value.length ? value : normalizePackages([]);

  function update(id: string, patch: Partial<VendorPackage>) {
    onChange(packages.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function addPackage() {
    onChange([...packages, emptyPackage({ name: `Package ${packages.length + 1}`, enabled: true })]);
  }

  function removePackage(id: string) {
    onChange(packages.filter((p) => p.id !== id));
  }

  function movePackage(id: string, direction: "up" | "down") {
    const idx = packages.findIndex((p) => p.id === id);
    if (idx < 0) return;
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= packages.length) return;
    const next = [...packages];
    [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
    onChange(next);
  }

  function updateAddOn(pkgId: string, addOnId: string, patch: Partial<PackageAddOn>) {
    onChange(
      packages.map((p) =>
        p.id !== pkgId
          ? p
          : {
              ...p,
              addOns: p.addOns.map((a) => (a.id === addOnId ? { ...a, ...patch } : a)),
            }
      )
    );
  }

  function addAddOn(pkgId: string) {
    const addOn: PackageAddOn = {
      id: `addon_${Math.random().toString(36).slice(2, 9)}`,
      name: "",
      description: "",
      price: 0,
      quantityAllowed: false,
      maxQuantity: 1,
      active: true,
    };
    onChange(
      packages.map((p) => (p.id === pkgId ? { ...p, addOns: [...p.addOns, addOn] } : p))
    );
  }

  function removeAddOn(pkgId: string, addOnId: string) {
    onChange(
      packages.map((p) =>
        p.id === pkgId ? { ...p, addOns: p.addOns.filter((a) => a.id !== addOnId) } : p
      )
    );
  }

  return (
    <div className="space-y-4">
      {packages.map((pkg) => (
        <div
          key={pkg.id}
          className="space-y-3 rounded-xl border border-border/80 bg-background/40 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">{pkg.name || pkg.tier || "Package"}</p>
            <div className="flex items-center gap-1 sm:gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => movePackage(pkg.id, "up")}
                aria-label="Move package up"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => movePackage(pkg.id, "down")}
                aria-label="Move package down"
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={pkg.enabled}
                  onChange={(e) => update(pkg.id, { enabled: e.target.checked })}
                />
                Active
              </label>
              {!pkg.tier && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removePackage(pkg.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Package name</Label>
              <Input
                value={pkg.name}
                onChange={(e) => update(pkg.id, { name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Badge</Label>
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={pkg.badge ?? ""}
                onChange={(e) =>
                  update(pkg.id, {
                    badge: (e.target.value || null) as PackageBadge | null,
                  })
                }
              >
                {BADGE_OPTIONS.map((o) => (
                  <option key={o.value || "none"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Starting price (NGN)</Label>
              <Input
                type="number"
                min={0}
                value={pkg.price > 0 ? pkg.price : ""}
                onChange={(e) => update(pkg.id, { price: Number(e.target.value) || 0 })}
              />
              {pkg.price > 0 && (
                <p className="text-xs text-muted-foreground">{formatCurrency(pkg.price)}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Fixed price (optional)</Label>
              <Input
                type="number"
                min={0}
                value={pkg.fixedPrice ?? ""}
                onChange={(e) =>
                  update(pkg.id, {
                    fixedPrice: e.target.value === "" ? null : Number(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Max price cap (optional)</Label>
              <Input
                type="number"
                min={0}
                value={pkg.maxPrice ?? ""}
                onChange={(e) =>
                  update(pkg.id, {
                    maxPrice: e.target.value === "" ? null : Number(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Estimated duration</Label>
              <Input
                value={pkg.estimatedDuration ?? ""}
                placeholder="e.g. 6 hours"
                onChange={(e) => update(pkg.id, { estimatedDuration: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Short description</Label>
            <Input
              value={pkg.shortDescription}
              onChange={(e) => update(pkg.id, { shortDescription: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Full description</Label>
            <Textarea
              rows={2}
              value={pkg.description}
              onChange={(e) => update(pkg.id, { description: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Included features (one per line)</Label>
            <Textarea
              rows={3}
              value={pkg.features.join("\n")}
              onChange={(e) =>
                update(pkg.id, {
                  features: e.target.value.split("\n"),
                })
              }
            />
          </div>

          <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
            <div className="flex items-center justify-between">
              <Label>Optional add-ons</Label>
              <Button type="button" size="sm" variant="outline" onClick={() => addAddOn(pkg.id)}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add-on
              </Button>
            </div>
            {pkg.addOns.length === 0 && (
              <p className="text-xs text-muted-foreground">No add-ons yet.</p>
            )}
            {pkg.addOns.map((addOn) => (
              <div key={addOn.id} className="grid gap-2 rounded-lg border border-border/60 p-2 sm:grid-cols-2">
                <Input
                  placeholder="Name"
                  value={addOn.name}
                  onChange={(e) => updateAddOn(pkg.id, addOn.id, { name: e.target.value })}
                />
                <Input
                  type="number"
                  min={0}
                  placeholder="Price"
                  value={addOn.price || ""}
                  onChange={(e) =>
                    updateAddOn(pkg.id, addOn.id, { price: Number(e.target.value) || 0 })
                  }
                />
                <Input
                  className="sm:col-span-2"
                  placeholder="Description"
                  value={addOn.description}
                  onChange={(e) =>
                    updateAddOn(pkg.id, addOn.id, { description: e.target.value })
                  }
                />
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={addOn.quantityAllowed}
                    onChange={(e) =>
                      updateAddOn(pkg.id, addOn.id, { quantityAllowed: e.target.checked })
                    }
                  />
                  Allow quantity
                </label>
                {addOn.quantityAllowed && (
                  <Input
                    type="number"
                    min={1}
                    placeholder="Max qty"
                    value={addOn.maxQuantity}
                    onChange={(e) =>
                      updateAddOn(pkg.id, addOn.id, {
                        maxQuantity: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                  />
                )}
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={addOn.active}
                    onChange={(e) => updateAddOn(pkg.id, addOn.id, { active: e.target.checked })}
                  />
                  Active
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeAddOn(pkg.id, addOn.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-2 rounded-lg border border-border/70 p-3">
            <Label>Cancellation policy</Label>
            <select
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={pkg.cancellationPolicy.preset}
              onChange={(e) => {
                const preset = e.target.value as CancellationPolicyPreset;
                update(pkg.id, { cancellationPolicy: policyForPreset(preset) });
              }}
            >
              {POLICY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
              {formatCancellationPolicyLines(pkg.cancellationPolicy).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            {pkg.cancellationPolicy.preset === "CUSTOM" && (
              <div className="space-y-2">
                {pkg.cancellationPolicy.windows.map((win, idx) => (
                  <div key={win.id} className="grid gap-2 rounded border border-border/50 p-2 sm:grid-cols-4">
                    <Input
                      type="number"
                      placeholder="More than (hours)"
                      value={win.moreThanHoursBefore ?? ""}
                      onChange={(e) => {
                        const windows = [...pkg.cancellationPolicy.windows];
                        windows[idx] = {
                          ...win,
                          moreThanHoursBefore:
                            e.target.value === "" ? null : Number(e.target.value),
                        };
                        update(pkg.id, {
                          cancellationPolicy: { ...pkg.cancellationPolicy, windows },
                        });
                      }}
                    />
                    <Input
                      type="number"
                      placeholder="Within (hours)"
                      value={win.lessThanOrEqualHoursBefore}
                      onChange={(e) => {
                        const windows = [...pkg.cancellationPolicy.windows];
                        windows[idx] = {
                          ...win,
                          lessThanOrEqualHoursBefore: Number(e.target.value) || 0,
                        };
                        update(pkg.id, {
                          cancellationPolicy: { ...pkg.cancellationPolicy, windows },
                        });
                      }}
                    />
                    <Input
                      type="number"
                      placeholder="Refund %"
                      min={0}
                      max={100}
                      value={win.refundPercent}
                      onChange={(e) => {
                        const windows = [...pkg.cancellationPolicy.windows];
                        windows[idx] = {
                          ...win,
                          refundPercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                        };
                        update(pkg.id, {
                          cancellationPolicy: { ...pkg.cancellationPolicy, windows },
                        });
                      }}
                    />
                    <Input
                      type="number"
                      placeholder="Fee (NGN)"
                      value={win.feeAmount || ""}
                      onChange={(e) => {
                        const windows = [...pkg.cancellationPolicy.windows];
                        windows[idx] = {
                          ...win,
                          feeAmount: Number(e.target.value) || 0,
                        };
                        update(pkg.id, {
                          cancellationPolicy: { ...pkg.cancellationPolicy, windows },
                        });
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" onClick={addPackage} className="w-full gap-2">
        <Plus className="h-4 w-4" /> Add another package
      </Button>
    </div>
  );
}

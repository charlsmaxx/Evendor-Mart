"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { MARKETPLACE_CATEGORIES } from "@/lib/categories";

const TYPE_TABS = [
  { value: "", label: "All" },
  { value: "VENUE", label: "Venues" },
  { value: "SERVICE", label: "Service vendors" },
] as const;

const FILTER_DEBOUNCE_MS = 350;

export function MarketplaceFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const activeType = params.get("type") ?? "";

  const [q, setQ] = useState(() => params.get("q") ?? "");
  const [city, setCity] = useState(() => params.get("city") ?? "");
  const [maxBudget, setMaxBudget] = useState(() => params.get("maxBudget") ?? "");

  useEffect(() => {
    setQ(params.get("q") ?? "");
    setCity(params.get("city") ?? "");
    setMaxBudget(params.get("maxBudget") ?? "");
  }, [params]);

  const pushParams = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(params.toString());
      mutate(next);
      next.delete("page");
      const qs = next.toString();
      router.push(qs ? `/marketplace?${qs}` : "/marketplace");
    },
    [params, router]
  );

  const debouncedPushParams = useDebouncedCallback(pushParams, FILTER_DEBOUNCE_MS);

  function updateImmediate(key: string, value: string) {
    pushParams((next) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
  }

  function updateDebounced(key: "q" | "city" | "maxBudget", value: string) {
    if (key === "q") setQ(value);
    else if (key === "city") setCity(value);
    else setMaxBudget(value);

    debouncedPushParams((next) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
  }

  function setType(type: string) {
    pushParams((next) => {
      if (type) next.set("type", type);
      else next.delete("type");
      if (type === "VENUE") next.delete("category");
    });
  }

  const serviceCategories = MARKETPLACE_CATEGORIES.filter((c) => c.slug !== "venues");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.value || "all"}
            type="button"
            onClick={() => setType(tab.value)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition",
              activeType === tab.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="glass flex flex-wrap gap-4 rounded-2xl p-4">
        <Input
          placeholder={
            activeType === "VENUE"
              ? "Search venues…"
              : activeType === "SERVICE"
                ? "Search vendors…"
                : "Search venues & vendors…"
          }
          value={q}
          onChange={(e) => updateDebounced("q", e.target.value)}
          className="min-w-[200px] flex-1"
        />
        <Input
          placeholder="City"
          value={city}
          onChange={(e) => updateDebounced("city", e.target.value)}
          className="w-32"
        />
        <select
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
          value={params.get("category") ?? ""}
          onChange={(e) => updateImmediate("category", e.target.value)}
        >
          <option value="">
            {activeType === "VENUE"
              ? "All venue types"
              : activeType === "SERVICE"
                ? "All service categories"
                : "All categories"}
          </option>
          {(activeType === "VENUE"
            ? MARKETPLACE_CATEGORIES.filter((c) => c.slug === "venues")
            : activeType === "SERVICE"
              ? serviceCategories
              : MARKETPLACE_CATEGORIES
          ).map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.label}
            </option>
          ))}
        </select>
        <Input
          type="number"
          placeholder="Max budget"
          value={maxBudget}
          onChange={(e) => updateDebounced("maxBudget", e.target.value)}
          className="w-28"
        />
        <Button
          variant={params.get("verified") === "true" ? "default" : "outline"}
          size="sm"
          onClick={() =>
            updateImmediate("verified", params.get("verified") === "true" ? "" : "true")
          }
        >
          Verified only
        </Button>
      </div>
    </div>
  );
}

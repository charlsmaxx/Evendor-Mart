"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { MARKETPLACE_CATEGORIES } from "@/lib/categories";
import { getCategoryIcon } from "@/lib/category-icons";
import { cn } from "@/lib/utils";

function categoryHref(slug: string) {
  return `/marketplace?category=${slug}`;
}

/** Desktop hover dropdown with category icons. */
export function CategoriesDesktopDropdown({
  label = "Categories",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn("relative", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        type="button"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        aria-expanded={open}
        aria-haspopup="true"
      >
        {label}
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
        />
      </button>

      <div
        className={cn(
          "absolute left-1/2 top-full z-50 w-[min(92vw,640px)] -translate-x-1/2 pt-3 transition",
          open
            ? "pointer-events-auto visible opacity-100"
            : "pointer-events-none invisible opacity-0"
        )}
      >
        <div className="rounded-2xl border border-border bg-card p-3 shadow-lg">
          <div className="grid max-h-[70vh] grid-cols-2 gap-1 overflow-y-auto sm:grid-cols-3">
            {MARKETPLACE_CATEGORIES.map((cat) => {
              const Icon = getCategoryIcon(cat.value);
              return (
                <Link
                  key={cat.slug}
                  href={categoryHref(cat.slug)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-foreground transition hover:bg-muted"
                  onClick={() => setOpen(false)}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="leading-tight">{cat.label}</span>
                </Link>
              );
            })}
          </div>
          <div className="mt-2 border-t border-border pt-2">
            <Link
              href="/marketplace"
              className="block rounded-xl px-3 py-2 text-center text-sm font-semibold text-primary hover:bg-primary/5"
              onClick={() => setOpen(false)}
            >
              View all on Marketplace
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Mobile accordion list for the red sidebar drawer. */
export function CategoriesMobileAccordion({
  label = "Categories",
  onNavigate,
  variant = "dark",
}: {
  label?: string;
  onNavigate?: () => void;
  variant?: "dark" | "light";
}) {
  const [open, setOpen] = useState(false);
  const dark = variant === "dark";

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between rounded-xl px-3 py-3.5 text-left text-sm font-medium",
          dark ? "text-white hover:bg-white/10" : "text-foreground hover:bg-muted"
        )}
        aria-expanded={open}
      >
        {label}
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          className={cn(
            "mb-1 ml-2 max-h-[45vh] space-y-0.5 overflow-y-auto border-l pl-2",
            dark ? "border-white/20" : "border-border"
          )}
        >
          {MARKETPLACE_CATEGORIES.map((cat) => {
            const Icon = getCategoryIcon(cat.value);
            return (
              <Link
                key={cat.slug}
                href={categoryHref(cat.slug)}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm",
                  dark
                    ? "text-white/90 hover:bg-white/10"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-90" />
                <span>{cat.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProfileFaq } from "@/lib/vendor-profile-content";

export function ProfileFaqSection({ faqs }: { faqs: ProfileFaq[] }) {
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.id ?? null);

  if (faqs.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl font-semibold">Frequently asked questions</h2>
      <div className="mt-4 divide-y divide-border">
        {faqs.map((faq) => {
          const open = openId === faq.id;
          return (
            <div key={faq.id}>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : faq.id)}
                className="flex w-full items-center justify-between gap-3 py-4 text-left"
                aria-expanded={open}
              >
                <span className="font-medium text-foreground">{faq.question}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                    open && "rotate-180"
                  )}
                />
              </button>
              {open && (
                <p className="pb-4 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {faq.answer}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

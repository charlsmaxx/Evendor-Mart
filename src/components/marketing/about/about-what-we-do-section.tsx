"use client";

import { motion } from "framer-motion";
import { Compass, GitCompareArrows, CalendarCheck, ShieldCheck, PartyPopper } from "lucide-react";
import { SectionShell } from "@/components/shared/section-shell";

const features = [
  {
    icon: Compass,
    title: "Discover",
    desc: "Find verified event halls and professional vendors with portfolios you can actually evaluate.",
  },
  {
    icon: GitCompareArrows,
    title: "Compare",
    desc: "Review pricing, packages, portfolios, and feedback before you commit.",
  },
  {
    icon: CalendarCheck,
    title: "Book",
    desc: "Reserve your date through one clear booking experience—no chasing across chats.",
  },
  {
    icon: ShieldCheck,
    title: "Pay securely",
    desc: "Checkout through Evendor's secure payment flow, designed to protect both sides.",
  },
  {
    icon: PartyPopper,
    title: "Celebrate",
    desc: "Spend less time coordinating logistics and more time enjoying your event.",
  },
];

export function AboutWhatWeDoSection() {
  return (
    <SectionShell id="what-we-do" className="border-y border-border bg-secondary/40">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">What we do</p>
        <h2 className="font-display mt-3 text-3xl font-bold tracking-tight md:text-4xl">
          From first search to celebration day
        </h2>
        <p className="mt-4 text-muted-foreground md:text-lg">
          Evendor connects discovery, comparison, booking, and payment into one modern flow.
        </p>
      </div>

      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-5">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.article
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="glass rounded-2xl p-6 lg:p-5"
            >
              <span className="text-xs font-bold text-primary">
                {String(i + 1).padStart(2, "0")}
              </span>
              <Icon className="mt-4 h-8 w-8 text-primary" aria-hidden />
              <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </motion.article>
          );
        })}
      </div>
    </SectionShell>
  );
}

"use client";

import { motion } from "framer-motion";
import { SectionShell } from "@/components/shared/section-shell";
import { Search, GitCompare, CalendarCheck } from "lucide-react";

const steps = [
  { icon: Search, step: "01", title: "Discover", desc: "Browse verified vendors and luxury venues across African cities." },
  { icon: GitCompare, step: "02", title: "Compare", desc: "Compare ratings, pricing, and portfolios — then request quotes in-app." },
  { icon: CalendarCheck, step: "03", title: "Book", desc: "Secure your date with a Paystack payment held in escrow, and track everything in one dashboard." },
];

export function HowItWorksSection() {
  return (
    <SectionShell id="how-it-works">
      <div className="text-center">
        <h2 className="font-display text-3xl font-bold md:text-4xl">How Evendor works</h2>
      </div>
      <div className="relative mt-16">
        <div className="absolute left-0 right-0 top-1/2 hidden h-px bg-border md:block" />
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="glass relative rounded-2xl p-8 text-center"
            >
              <span className="text-xs font-bold text-primary">{s.step}</span>
              <s.icon className="mx-auto mt-4 h-10 w-10 text-primary" />
              <h3 className="mt-4 font-display text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

"use client";

import { motion } from "framer-motion";
import { Handshake, Sparkles, Lightbulb, HeartHandshake } from "lucide-react";
import { SectionShell } from "@/components/shared/section-shell";

const values = [
  {
    icon: Handshake,
    title: "Trust",
    desc: "We believe every booking should be reliable and transparent—from discovery to celebration day.",
  },
  {
    icon: Sparkles,
    title: "Quality",
    desc: "We encourage professionalism and excellence across venues, vendors, and every guest experience.",
  },
  {
    icon: Lightbulb,
    title: "Innovation",
    desc: "Technology should simplify event planning, not add another layer of complexity.",
  },
  {
    icon: HeartHandshake,
    title: "Community",
    desc: "We help customers and event businesses succeed together—because celebrations thrive on connection.",
  },
];

export function AboutValuesSection() {
  return (
    <SectionShell id="values">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Our values</p>
        <h2 className="font-display mt-3 text-3xl font-bold tracking-tight md:text-4xl">
          What guides every decision we make
        </h2>
      </div>

      <div className="mt-14 grid gap-5 sm:grid-cols-2">
        {values.map((v, i) => {
          const Icon = v.icon;
          return (
            <motion.article
              key={v.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="glass rounded-3xl p-8 md:p-10"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                <Icon className="h-5 w-5 text-primary" aria-hidden />
              </div>
              <h3 className="font-display mt-5 text-xl font-semibold md:text-2xl">{v.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                {v.desc}
              </p>
            </motion.article>
          );
        })}
      </div>
    </SectionShell>
  );
}

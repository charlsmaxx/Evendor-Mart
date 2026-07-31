"use client";

import { motion } from "framer-motion";
import {
  BadgeCheck,
  Images,
  Tags,
  Lock,
  Star,
  Building2,
  Store,
  MapPinned,
  Headphones,
  Users,
} from "lucide-react";
import { SectionShell } from "@/components/shared/section-shell";

const highlights = [
  { icon: BadgeCheck, title: "Verified businesses", desc: "Profiles built for professionalism and accountability." },
  { icon: Images, title: "Professional portfolios", desc: "See real work before you shortlist anyone." },
  { icon: Tags, title: "Transparent pricing", desc: "Compare packages and pricing with clearer expectations." },
  { icon: Lock, title: "Secure online booking", desc: "Book and pay through a structured platform flow." },
  { icon: Star, title: "Verified customer reviews", desc: "Feedback grounded in real events and experiences." },
  { icon: Building2, title: "Event hall marketplace", desc: "Discover venues designed for every celebration size." },
  { icon: Store, title: "Vendor marketplace", desc: "Hire planners, creatives, and event specialists in one place." },
  { icon: MapPinned, title: "Nationwide discovery", desc: "Explore talent and venues beyond your immediate network." },
  { icon: Headphones, title: "Reliable support", desc: "Help when coordination gets complicated." },
  { icon: Users, title: "Growing community", desc: "Customers and event businesses succeeding together." },
];

export function AboutWhyChooseSection() {
  return (
    <SectionShell id="why-choose">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">
          Why people choose Evendor
        </p>
        <h2 className="font-display mt-3 text-3xl font-bold tracking-tight md:text-4xl">
          Built for confidence at every step
        </h2>
        <p className="mt-4 text-muted-foreground md:text-lg">
          The details that make booking feel modern, transparent, and trustworthy.
        </p>
      </div>

      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {highlights.map((h, i) => {
          const Icon = h.icon;
          return (
            <motion.article
              key={h.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: (i % 5) * 0.05 }}
              className="rounded-2xl border border-border bg-card p-5 transition hover:shadow-[0_8px_30px_rgba(31,27,24,0.08)]"
            >
              <Icon className="h-5 w-5 text-primary" aria-hidden />
              <h3 className="mt-3 text-sm font-semibold text-foreground">{h.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{h.desc}</p>
            </motion.article>
          );
        })}
      </div>
    </SectionShell>
  );
}

"use client";

import { motion } from "framer-motion";
import {
  Search,
  ShieldAlert,
  CircleDollarSign,
  CalendarX2,
  UserX,
  MessagesSquare,
} from "lucide-react";
import { SectionShell } from "@/components/shared/section-shell";

const challenges = [
  {
    icon: Search,
    title: "Endless searching",
    desc: "Hours spent scrolling Instagram, WhatsApp, and Facebook for recommendations.",
  },
  {
    icon: ShieldAlert,
    title: "Unclear trust",
    desc: "Hard to know who is professional, verified, or simply well-marketed.",
  },
  {
    icon: CircleDollarSign,
    title: "Inconsistent pricing",
    desc: "Quotes shift, fees appear late, and comparing options feels impossible.",
  },
  {
    icon: CalendarX2,
    title: "Last-minute chaos",
    desc: "Double bookings and sudden cancellations leave hosts stranded.",
  },
  {
    icon: UserX,
    title: "Fake or unreliable vendors",
    desc: "Beautiful photos online do not always match the experience on the day.",
  },
  {
    icon: MessagesSquare,
    title: "Scattered communication",
    desc: "Details get lost across chats, calls, and referrals with no single record.",
  },
];

export function AboutWhyExistSection() {
  return (
    <SectionShell id="why-we-exist" className="bg-secondary/40 border-y border-border">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Why we exist</p>
        <h2 className="font-display mt-3 text-3xl font-bold tracking-tight md:text-4xl">
          Event planning shouldn&apos;t feel like a second job.
        </h2>
        <p className="mt-4 text-muted-foreground md:text-lg">
          Across Africa, celebrating is joyful—but finding the right hall and vendors is still
          fragmented, stressful, and full of uncertainty.
        </p>
      </div>

      <div className="relative mt-14 md:mt-16">
        <div
          className="absolute left-4 top-0 bottom-0 w-px bg-border md:left-1/2 md:-translate-x-px"
          aria-hidden
        />

        <ol className="space-y-8 md:space-y-10">
          {challenges.map((item, i) => {
            const Icon = item.icon;
            const isLeft = i % 2 === 0;
            return (
              <motion.li
                key={item.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: i * 0.05 }}
                className={`relative flex md:items-center ${
                  isLeft ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                <div className={`w-full pl-12 md:w-1/2 md:pl-0 ${isLeft ? "md:pr-12" : "md:pl-12"}`}>
                  <article className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
                    <Icon className="h-5 w-5 text-primary" aria-hidden />
                    <h3 className="mt-3 font-display text-lg font-semibold">{item.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {item.desc}
                    </p>
                  </article>
                </div>

                <span
                  className="absolute left-4 top-6 flex h-3 w-3 -translate-x-1/2 rounded-full border-2 border-primary bg-background md:left-1/2 md:top-1/2 md:-translate-y-1/2"
                  aria-hidden
                />
              </motion.li>
            );
          })}
        </ol>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mx-auto mt-16 max-w-2xl text-center"
      >
        <p className="font-display text-2xl font-medium leading-snug text-foreground md:text-3xl">
          Evendor was built to replace the chaos with clarity—one trusted place to discover,
          compare, and book.
        </p>
      </motion.div>
    </SectionShell>
  );
}

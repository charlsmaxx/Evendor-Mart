"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { SectionShell } from "@/components/shared/section-shell";

const pillars = [
  { label: "One trusted platform" },
  { label: "One booking experience" },
  { label: "One place to discover, compare & book" },
];

export function AboutStorySection() {
  return (
    <SectionShell id="our-story">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="relative aspect-[4/5] overflow-hidden rounded-3xl md:aspect-[5/4] lg:aspect-[4/5]"
        >
          <Image
            src="/images/wedding-couple.png"
            alt="A couple celebrating their wedding day"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, transparent 50%, rgba(31,27,24,0.45) 100%)",
            }}
            aria-hidden
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.1 }}
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Our story</p>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Talent is everywhere. Trust and simplicity are not.
          </h2>

          <div className="mt-6 space-y-4 text-muted-foreground leading-relaxed md:text-lg">
            <p>
              The African event industry is full of talented professionals—yet finding and booking
              them remains fragmented.
            </p>
            <p>
              Customers jump between WhatsApp, Instagram, Facebook, phone calls, and referrals.
              Important details get lost. Prices are inconsistent. Trust is difficult to earn and
              easy to lose.
            </p>
            <p className="text-foreground font-medium">
              Evendor was created to simplify everything.
            </p>
          </div>

          <ul className="mt-8 space-y-3">
            {pillars.map((p) => (
              <li
                key={p.label}
                className="flex items-center gap-3 border-l-2 border-primary pl-4 text-sm font-semibold text-foreground md:text-base"
              >
                {p.label}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </SectionShell>
  );
}

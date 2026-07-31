"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { SectionShell } from "@/components/shared/section-shell";

const audiences = [
  {
    title: "Customers",
    subtitle: "Plan with clarity",
    image: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=900&q=80",
    imageAlt: "Elegant event hall ready for a celebration",
    href: "/marketplace",
    cta: "Start exploring",
    benefits: [
      "Discover trusted professionals",
      "Save time on endless searching",
      "Compare options side by side",
      "Book with clearer confidence",
      "Manage bookings in one place",
    ],
  },
  {
    title: "Vendors & event halls",
    subtitle: "Grow with better tools",
    image: "/images/venues.png",
    imageAlt: "Professional venue space for events",
    href: "/list-your-business",
    cta: "List your business",
    benefits: [
      "Reach more customers",
      "Showcase your portfolio",
      "Receive bookings online",
      "Manage availability with ease",
      "Grow a sustainable event business",
    ],
  },
];

export function AboutBuiltForSection() {
  return (
    <SectionShell id="built-for" className="border-y border-border bg-secondary/40">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">
          Built for everyone
        </p>
        <h2 className="font-display mt-3 text-3xl font-bold tracking-tight md:text-4xl">
          One platform. Two powerful sides.
        </h2>
        <p className="mt-4 text-muted-foreground md:text-lg">
          Whether you&apos;re hosting a celebration or running an event business, Evendor is designed
          around how you work.
        </p>
      </div>

      <div className="mt-14 grid gap-8 lg:grid-cols-2">
        {audiences.map((a, i) => (
          <motion.article
            key={a.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: i * 0.1 }}
            className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
          >
            <div className="relative aspect-[16/10]">
              <Image
                src={a.image}
                alt={a.imageAlt}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <div className="p-7 md:p-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                {a.subtitle}
              </p>
              <h3 className="font-display mt-2 text-2xl font-bold">{a.title}</h3>
              <ul className="mt-6 space-y-3">
                {a.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <Link href={a.href} className="link-arrow mt-8 inline-flex text-sm">
                {a.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.article>
        ))}
      </div>
    </SectionShell>
  );
}

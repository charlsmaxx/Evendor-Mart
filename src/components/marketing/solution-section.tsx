"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Search, GitCompare, Shield, Star, FileText } from "lucide-react";

const ROTATE_MS = 4500;

const features = [
  {
    id: "search",
    icon: Search,
    tab: "Smart search",
    title: "Smart search",
    desc: "Filter by city, budget, ratings, and availability in seconds.",
    bullets: [
      "Filter by city, budget, ratings, and availability in seconds.",
      "Evendor dynamically adapts to how you plan your events.",
      "Find verified vendors without endless WhatsApp lists.",
    ],
  },
  {
    id: "compare",
    icon: GitCompare,
    tab: "Compare",
    title: "Vendor comparison",
    desc: "Compare up to 3 vendors side by side before you commit.",
    bullets: [
      "Compare up to 3 vendors side by side before you commit.",
      "See pricing ranges, ratings, and locations at a glance.",
      "Make confident decisions without switching between apps.",
    ],
  },
  {
    id: "book",
    icon: Shield,
    tab: "Secure booking",
    title: "Secure booking",
    desc: "Pay in full into escrow with booking status tracking.",
    bullets: [
      "Pay in full into escrow with booking status tracking.",
      "Escrow-ready architecture protects both parties.",
      "Track every booking from request to completion.",
    ],
  },
  {
    id: "reviews",
    icon: Star,
    tab: "Trusted reviews",
    title: "Trusted reviews",
    desc: "Verified reviews from real events across Africa.",
    bullets: [
      "Verified reviews from real events across Africa.",
      "Moderated feedback you can trust before you book.",
      "Build confidence with transparent vendor ratings.",
    ],
  },
  {
    id: "quotes",
    icon: FileText,
    tab: "Instant quotes",
    title: "Instant quotes",
    desc: "Request quotes without sharing your phone number.",
    bullets: [
      "Request quotes without sharing your phone number.",
      "Keep communication in-app until you're ready to book.",
      "Get responses from vendors on your timeline.",
    ],
  },
];

export function SolutionSection() {
  return (
    <section id="solution" className="border-y border-border bg-secondary/30 py-20 md:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
          <video
            className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-label="Evendor platform preview"
          >
            <source src="/videos/one-platform.mp4" type="video/mp4" />
          </video>
          {/* Static fallback when reduced motion is preferred */}
          <div
            className="absolute inset-0 hidden bg-secondary motion-reduce:block"
            aria-hidden
          />
        </div>
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            One platform. Zero chaos.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Evendor brings discovery, comparison, booking, and communication into a single
            luxurious experience — ask questions, request quotes, and book vendors in seconds.
          </p>
          <Link href="/marketplace" className="link-arrow mt-8 inline-flex">
            Learn more
          </Link>
        </div>
      </div>
    </section>
  );
}

export function StayAheadSection() {
  const [active, setActive] = useState(features[0].id);
  const [paused, setPaused] = useState(false);
  const current = features.find((f) => f.id === active)!;

  const goToNext = useCallback(() => {
    setActive((prev) => {
      const idx = features.findIndex((f) => f.id === prev);
      return features[(idx + 1) % features.length].id;
    });
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(goToNext, ROTATE_MS);
    return () => clearInterval(timer);
  }, [paused, goToNext]);

  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Stay organized, stay informed and stay ahead
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Automate manual tasks and free up your team to focus on creating great events.
          </p>
        </div>

        <div
          className="mt-10 flex flex-wrap justify-center gap-2"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {features.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActive(f.id)}
              className={`tab-pill transition-all ${active === f.id ? "tab-pill-active" : ""}`}
            >
              {f.tab}
            </button>
          ))}
        </div>

        <div
          className="mx-auto mt-12 max-w-3xl overflow-hidden rounded-2xl border border-border bg-card p-8 md:p-12"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
            >
              <current.icon className="mb-6 h-10 w-10 text-primary" />
              <h3 className="font-display text-2xl font-semibold text-foreground">{current.title}</h3>
              <p className="mt-3 text-muted-foreground">{current.desc}</p>
              <ul className="mt-8 space-y-4">
                {current.bullets.map((b) => (
                  <li key={b} className="flex gap-3 text-foreground/90">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span className="leading-relaxed">{b}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-12 text-center">
          <Link href="/register">
            <button
              type="button"
              className="rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Get started
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { SectionShell } from "@/components/shared/section-shell";
import { MARKETPLACE_CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";

const ROTATE_MS = 4500;
/** ~85% of luxury venue grid card width; 4:3 like ProblemSection venue cards */
const CARD_W = 256;
const CARD_H = 192;
const GAP = 28;

function getCircularOffset(index: number, active: number, length: number) {
  let diff = index - active;
  while (diff > length / 2) diff -= length;
  while (diff < -length / 2) diff += length;
  return diff;
}

export function CategoryShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const current = MARKETPLACE_CATEGORIES[activeIndex];
  const count = MARKETPLACE_CATEGORIES.length;

  const goToNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % count);
  }, [count]);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(goToNext, ROTATE_MS);
    return () => clearInterval(timer);
  }, [paused, goToNext]);

  const shift = (CARD_W + GAP) * 0.68;

  return (
    <SectionShell id="categories" className="bg-secondary/30">
      <div
        className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="order-2 lg:order-1">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Event marketplace
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl lg:text-[2.75rem] lg:leading-tight">
            Explore every category
          </h2>
          <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted-foreground">
            From intimate weddings to corporate galas — browse verified vendors across every
            event discipline.
          </p>

          <AnimatePresence mode="wait">
            <motion.div
              key={current.slug}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
              className="mt-8"
            >
              <p className="max-w-md leading-relaxed text-muted-foreground">{current.description}</p>
              <Link
                href={`/marketplace?category=${current.slug}`}
                className="link-arrow mt-5 inline-flex"
              >
                Explore {current.label.toLowerCase()}
              </Link>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center gap-2">
            {MARKETPLACE_CATEGORIES.map((cat, index) => (
              <button
                key={cat.slug}
                type="button"
                aria-label={`Show ${cat.label}`}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  index === activeIndex ? "w-8 bg-primary" : "w-1.5 bg-border hover:bg-primary/40"
                )}
              />
            ))}
          </div>
        </div>

        <div className="order-1 flex justify-center lg:order-2">
          <div
            className="relative w-full max-w-lg [perspective:1200px]"
            style={{ height: CARD_H + 48 }}
            aria-live="polite"
          >
            <div className="absolute inset-0 overflow-hidden px-4">
              {MARKETPLACE_CATEGORIES.map((cat, index) => {
                const offset = getCircularOffset(index, activeIndex, count);
                if (Math.abs(offset) > 1) return null;

                const isCenter = offset === 0;
                const x = offset * shift;

                return (
                  <motion.button
                    key={cat.slug}
                    type="button"
                    aria-label={cat.label}
                    aria-current={isCenter ? "true" : undefined}
                    onClick={() => setActiveIndex(index)}
                    className="absolute left-1/2 top-1/2 overflow-hidden rounded-2xl border border-border bg-card shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    style={{
                      width: CARD_W,
                      height: CARD_H,
                      marginLeft: -CARD_W / 2,
                      marginTop: -CARD_H / 2,
                      zIndex: isCenter ? 30 : 20 - Math.abs(offset),
                    }}
                    animate={{
                      x,
                      scale: isCenter ? 1 : 0.78,
                      opacity: isCenter ? 1 : 0.5,
                      rotateY: offset * -18,
                    }}
                    transition={{ type: "spring", stiffness: 260, damping: 28 }}
                  >
                    <Image
                      src={cat.image}
                      alt={cat.label}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 220px, 280px"
                      priority={index === 0}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
                      <p
                        className={cn(
                          "font-display font-bold leading-tight text-white",
                          isCenter ? "text-lg" : "text-sm"
                        )}
                      >
                        {cat.label}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

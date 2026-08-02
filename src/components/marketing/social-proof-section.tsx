"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";

const LINES = [
  "Evendor streamlines event planning, helping you craft unforgettable moments and build confidence in every booking.",
  "Acting as an extension of your team, we connect discovery, comparison, and secure payments in one seamless platform.",
  "Welcome to the future of event planning in Africa.",
] as const;

function ScrollLine({ children }: { children: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    // Brighten as the line approaches the upper half of the viewport, then stay clear
    offset: ["start 0.9", "start 0.45"],
  });
  const opacity = useTransform(scrollYProgress, [0, 1], [0.18, 1]);

  return (
    <motion.p
      ref={ref}
      style={{ opacity }}
      className="font-display text-2xl font-medium leading-snug text-foreground sm:text-3xl md:text-4xl md:leading-snug"
    >
      {children}
    </motion.p>
  );
}

export function SocialProofSection() {
  return (
    <section id="social-proof" className="border-y border-border bg-secondary/40 py-20 md:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="space-y-8 md:space-y-12">
          {LINES.map((line) => (
            <ScrollLine key={line}>{line}</ScrollLine>
          ))}
        </div>

        <Link href="#solution" className="link-arrow mt-12 inline-flex text-base md:mt-14">
          See how we can help
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

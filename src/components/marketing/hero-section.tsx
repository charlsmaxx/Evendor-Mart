"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { HeroDashboardMock } from "./hero-dashboard-mock";
import { Button } from "@/components/ui/button";

const TRUSTED_BY = ["Lagos Events Co.", "Abuja Corporate", "PH Weddings", "Accra Planners", "Nairobi Gala"];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-28 pb-8 md:pt-32 md:pb-12">
      <div className="mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">

        {/* Premium rewards badge */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mx-auto mb-5 w-fit"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/8 px-4 py-1.5 text-sm font-semibold text-primary shadow-[0_0_18px_rgba(122,46,61,0.18)]"
            style={{ background: "linear-gradient(135deg, rgba(122,46,61,0.10) 0%, rgba(229,223,217,0.18) 100%)" }}>
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
            >
              🎁
            </motion.span>
            Earn 2% Cashback On Every Booking On Evendor
          </span>
        </motion.div>

        <div className="badge-pill mx-auto mb-8 w-fit">
          <strong>Events start at Evendor</strong>
          <span> — Africa&apos;s #1 event marketplace</span>
        </div>

        <h1 className="font-display mx-auto max-w-4xl text-4xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-[3.5rem]">
          Planning your special event shouldn&apos;t be stressful.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
          Find venues, hire trusted vendors, earn rewards everytime you book and manage your event seamlessly — all in one place.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/marketplace">
            <Button size="lg">Find Vendors</Button>
          </Link>
          <Link href="/list-your-business">
            <Button size="lg" variant="outline">
              List Your Business
            </Button>
          </Link>
        </div>

        <div className="mx-auto mt-14 max-w-5xl md:mt-20">
          <HeroDashboardMock />
        </div>

        <div className="mt-16 border-t border-border pt-12 md:mt-24">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Proudly trusted by
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {TRUSTED_BY.map((name) => (
              <span key={name} className="text-sm font-semibold text-foreground/70">
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

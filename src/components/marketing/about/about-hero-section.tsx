"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function AboutHeroSection() {
  return (
    <section className="relative flex min-h-[88vh] items-end overflow-hidden md:min-h-[92vh]">
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.08 }}
        animate={{ scale: 1 }}
        transition={{ duration: 8, ease: "easeOut" }}
      >
        <Image
          src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1800&q=80"
          alt="Guests celebrating at a beautifully styled Nigerian event"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </motion.div>

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(31,27,24,0.35) 0%, rgba(31,27,24,0.55) 45%, rgba(31,27,24,0.88) 100%)",
        }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-16 pt-32 sm:px-6 md:pb-24 lg:px-8">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-white/80"
        >
          Evendor
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-display mt-4 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl"
        >
          Every great celebration begins with the right people.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-6 max-w-xl text-base leading-relaxed text-white/85 md:text-lg"
        >
          Planning an event should feel exciting—not stressful. Whether it&apos;s a wedding,
          birthday, conference, church program, graduation, or corporate gathering, Evendor helps
          you discover trusted event halls and professional vendors in one place.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="mt-10 flex flex-wrap gap-4"
        >
          <Link href="/marketplace">
            <Button size="lg" className="bg-white text-foreground hover:bg-white/90">
              Find Vendors
            </Button>
          </Link>
          <Link href="/marketplace?category=venues">
            <Button
              size="lg"
              variant="outline"
              className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              Explore Event Halls
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export function AboutVisionSection() {
  return (
    <section id="vision" className="relative overflow-hidden border-y border-border">
      <div className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1519167758481-83f29da8c2d0?w=1600&q=80"
          alt="Warmly lit celebration venue ready for guests"
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(31,27,24,0.92) 0%, rgba(31,27,24,0.78) 55%, rgba(31,27,24,0.55) 100%)",
          }}
          aria-hidden
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 md:py-32 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl"
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-white/70">Our vision</p>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
            Building the future of Africa&apos;s event industry
          </h2>
          <p className="mt-6 text-base leading-relaxed text-white/85 md:text-lg">
            Evendor is building more than a marketplace. Our vision is to become Africa&apos;s most
            trusted event marketplace—connecting people with exceptional venues and event
            professionals while making planning simple, secure, and accessible.
          </p>
          <p className="mt-4 text-base leading-relaxed text-white/75 md:text-lg">
            As the platform grows, we will keep building smarter tools that help customers create
            unforgettable events—and help event businesses grow sustainably.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Star, MapPin, TrendingUp, Users, Heart } from "lucide-react";

const BG_IMAGES = [
  {
    src: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80",
    alt: "Luxury event hall",
    className: "left-[2%] top-[8%] z-0 h-[55%] w-[38%] -rotate-2",
  },
  {
    src: "/images/wedding-couple.png",
    alt: "Wedding couple",
    className: "right-[4%] top-[4%] z-0 h-[50%] w-[44%] translate-x-[130px] rotate-2",
    objectPosition: "center top",
  },
  {
    src: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80",
    alt: "Event center building",
    className: "bottom-[6%] left-[28%] z-0 h-[48%] w-[44%] rotate-1",
  },
];

const MINI_LISTINGS = [
  { title: "Grand Ballroom", city: "Lagos", price: "₦500k+", rating: 4.9 },
  { title: "DJ SpinMaster", city: "Abuja", price: "₦150k+", rating: 4.8 },
];

const CHART_BARS = [42, 58, 65, 72, 78, 85, 92, 98];

const STATS = [
  { label: "Events planned", value: "12k+", icon: TrendingUp },
  { label: "Happy clients", value: "98%", icon: Heart },
  { label: "Verified vendors", value: "2.4k+", icon: Users },
];

export function HeroDashboardMock() {
  return (
    <div className="relative mx-auto min-h-[420px] w-full max-w-4xl overflow-visible md:min-h-[480px]">
      {/* Background event imagery */}
      <div className="pointer-events-none absolute inset-0 overflow-visible rounded-3xl">
        {BG_IMAGES.map((img) => (
          <div
            key={img.alt}
            className={`absolute overflow-hidden rounded-2xl border border-white/60 shadow-lg ${img.className}`}
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              unoptimized={img.src.includes("unsplash.com")}
              className="object-cover"
              style={{ objectPosition: img.objectPosition ?? "center" }}
              sizes="400px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/10" />
          </div>
        ))}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-background/20 via-background/5 to-background/30" />
      </div>

      {/* Floating UI cards */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-4 px-2 pt-16 pb-8 md:flex-row md:items-end md:gap-6 md:px-6 md:pt-24">
        {/* Compact marketplace card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: [0, -6, 0] }}
          transition={{ opacity: { duration: 0.6, delay: 0.1 }, y: { duration: 5, repeat: Infinity, ease: "easeInOut" } }}
          className="w-full max-w-[240px] shrink-0 overflow-hidden rounded-xl border border-border bg-card/95 shadow-[0_16px_40px_rgba(31,27,24,0.12)] backdrop-blur-sm md:max-w-[260px]"
        >
          <div className="flex items-center gap-1.5 border-b border-border bg-muted/60 px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-[#e8a598]" />
            <span className="h-2 w-2 rounded-full bg-[#e8d4a8]" />
            <span className="h-2 w-2 rounded-full bg-[#a8c4a0]" />
            <span className="ml-1 truncate text-[10px] text-muted-foreground">evendor.app/marketplace</span>
          </div>
          <div className="p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-medium text-foreground">Live marketplace</span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live
              </span>
            </div>
            <div className="space-y-2">
              {MINI_LISTINGS.map((c) => (
                <div
                  key={c.title}
                  className="flex items-center justify-between rounded-lg border border-border bg-background/80 px-2.5 py-2"
                >
                  <div className="min-w-0 text-left">
                    <p className="truncate text-xs font-semibold text-foreground">{c.title}</p>
                    <p className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <MapPin className="h-2.5 w-2.5 shrink-0" /> {c.city}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] font-medium text-primary">{c.price}</p>
                    <p className="flex items-center justify-end gap-0.5 text-[10px] text-muted-foreground">
                      <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" /> {c.rating}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Stats & chart card */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: [0, -8, 0] }}
          transition={{ opacity: { duration: 0.6, delay: 0.25 }, y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 } }}
          className="w-full max-w-[280px] shrink-0 overflow-hidden rounded-xl border border-border bg-card/95 p-4 shadow-[0_16px_40px_rgba(31,27,24,0.12)] backdrop-blur-sm md:max-w-[300px]"
        >
          <p className="text-xs font-semibold text-foreground">Customer satisfaction</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Events planned across Africa</p>

          {/* Mini bar chart */}
          <div className="mt-4 flex h-20 items-end justify-between gap-1 rounded-lg bg-muted/50 px-2 pb-2 pt-3">
            {CHART_BARS.map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 0.5, delay: 0.4 + i * 0.05 }}
                className="w-full max-w-[22px] rounded-sm bg-primary/80"
                style={{ minHeight: 4 }}
              />
            ))}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <s.icon className="mx-auto h-3.5 w-3.5 text-primary" />
                <p className="mt-1 text-sm font-bold text-foreground">{s.value}</p>
                <p className="text-[9px] leading-tight text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

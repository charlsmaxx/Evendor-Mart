"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Building2,
  CalendarDays,
  Headphones,
  MapPin,
  Award,
  Lock,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SearchMode = "venues" | "vendors";

const POPULAR = [
  { label: "Wedding Venues", href: "/marketplace?category=venues&q=wedding" },
  { label: "Photographers", href: "/marketplace?category=photographers" },
  { label: "Caterers", href: "/marketplace?category=caterers" },
  { label: "MCs", href: "/marketplace?category=mcs" },
  { label: "Decorators", href: "/marketplace?category=decorators" },
] as const;

const TRUST = [
  {
    icon: ShieldCheck,
    title: "Verified & Trusted",
    desc: "All vendors and venues are verified",
  },
  {
    icon: Lock,
    title: "Secure Payments",
    desc: "100% secure payments with Paystack",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    desc: "We're here to help you plan perfectly",
  },
  {
    icon: Award,
    title: "Quality Guaranteed",
    desc: "Top quality services every time",
  },
] as const;

export function HeroSection() {
  const router = useRouter();
  const [mode, setMode] = useState<SearchMode>("venues");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState("");
  const [videoReady, setVideoReady] = useState(false);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (mode === "venues") params.set("type", "VENUE");
    else params.set("type", "SERVICE");
    if (location.trim()) params.set("city", location.trim());
    if (date) params.set("date", date);
    if (guests.trim()) params.set("guests", guests.trim());
    const qs = params.toString();
    router.push(qs ? `/marketplace?${qs}` : "/marketplace");
  }

  return (
    <section className="relative min-h-[100svh] overflow-visible text-white">
      <div className="absolute inset-0 overflow-hidden">
        {/* Poster / fallback while video loads */}
        <Image
          src="/images/hero-background.png"
          alt="Luxurious event hall ready for a celebration"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <video
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-700 motion-reduce:hidden",
            videoReady ? "opacity-100" : "opacity-0"
          )}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/images/hero-background.png"
          aria-hidden
          onCanPlay={() => setVideoReady(true)}
          onError={() => setVideoReady(false)}
        >
          <source src="/videos/hero-background.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Dark left + bottom wash so copy/search stay readable */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(105deg, rgba(12,10,9,0.88) 0%, rgba(12,10,9,0.62) 42%, rgba(12,10,9,0.28) 68%, rgba(12,10,9,0.45) 100%), linear-gradient(180deg, rgba(12,10,9,0.35) 0%, transparent 38%, rgba(12,10,9,0.78) 100%)",
        }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col justify-center px-4 pb-20 pt-28 sm:px-6 md:pb-24 md:pt-32 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="w-full max-w-3xl"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-black/45 px-3.5 py-1.5 text-xs font-medium text-white/95 ring-1 ring-white/10 backdrop-blur-sm sm:text-sm">
            <Sparkles className="h-3.5 w-3.5 text-[#7A2E3D]" aria-hidden />
            Nigeria&apos;s Most Trusted Event Booking Platform
          </span>

          <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl lg:text-[3.75rem]">
            The Perfect Event
            <br />
            Starts Here
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
            Discover and book the best event halls and professional vendors for any
            occasion. Simple, secure and reliable.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setMode("venues")}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                mode === "venues"
                  ? "bg-black/55 text-white ring-1 ring-white/15 backdrop-blur-sm"
                  : "text-white/85 hover:text-white"
              )}
            >
              <Building2 className="h-4 w-4" aria-hidden />
              Event Halls
            </button>
            <button
              type="button"
              onClick={() => setMode("vendors")}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                mode === "vendors"
                  ? "bg-black/55 text-white ring-1 ring-white/15 backdrop-blur-sm"
                  : "text-white/85 hover:text-white"
              )}
            >
              <Users className="h-4 w-4" aria-hidden />
              Vendors
            </button>
          </div>

          <motion.form
            onSubmit={onSearch}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12, ease: "easeOut" }}
            className="mt-5 flex flex-col gap-3 rounded-[1.75rem] bg-white p-2 shadow-2xl shadow-black/30 sm:rounded-full sm:p-1.5 lg:flex-row lg:items-center"
          >
            <label className="flex min-w-0 flex-1 cursor-text items-center gap-3 rounded-full px-4 py-2.5 sm:py-3">
              <MapPin className="h-5 w-5 shrink-0 text-[#7A2E3D]" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                  Location
                </span>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Where are you planning?"
                  className="w-full bg-transparent text-sm text-neutral-800 outline-none placeholder:text-neutral-400"
                />
              </span>
            </label>

            <div className="hidden h-10 w-px bg-neutral-200 lg:block" aria-hidden />

            <label className="flex min-w-0 flex-1 cursor-text items-center gap-3 rounded-full px-4 py-2.5 sm:py-3">
              <CalendarDays className="h-5 w-5 shrink-0 text-[#7A2E3D]" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                  Date
                </span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={cn(
                    "w-full bg-transparent text-sm outline-none",
                    date ? "text-neutral-800" : "text-neutral-400"
                  )}
                />
              </span>
            </label>

            <div className="hidden h-10 w-px bg-neutral-200 lg:block" aria-hidden />

            <label className="flex min-w-0 flex-1 cursor-text items-center gap-3 rounded-full px-4 py-2.5 sm:py-3">
              <Users className="h-5 w-5 shrink-0 text-[#7A2E3D]" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                  Guests
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  placeholder="No. of guests"
                  className="w-full bg-transparent text-sm text-neutral-800 outline-none placeholder:text-neutral-400"
                />
              </span>
            </label>

            <button
              type="submit"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-neutral-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-neutral-800 sm:m-0.5"
            >
              <Search className="h-4 w-4" aria-hidden />
              Search
            </button>
          </motion.form>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5">
            <span className="text-sm text-white/80">Popular Searches:</span>
            <div className="flex flex-wrap gap-2">
              {POPULAR.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="rounded-full bg-black/45 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/10 backdrop-blur-sm transition hover:bg-black/60 sm:text-sm"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.22, ease: "easeOut" }}
          className="relative z-20 mt-12 -mb-10 w-full translate-y-8 sm:-mb-12 sm:translate-y-10 md:mt-16 md:-mb-14 md:translate-y-12"
        >
          <div
            className="grid grid-cols-1 gap-5 rounded-2xl border border-solid border-[#7A2E3D] bg-[#3A1520] px-5 py-5 shadow-[0_24px_60px_rgba(0,0,0,0.45),0_8px_24px_rgba(122,46,61,0.35)] sm:grid-cols-2 sm:gap-6 sm:px-6 sm:py-6 lg:grid-cols-4"
          >
            {TRUST.map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <item.icon
                  className="mt-0.5 h-6 w-6 shrink-0 text-[#E5DFD9]"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <div>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-white/70 sm:text-sm">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

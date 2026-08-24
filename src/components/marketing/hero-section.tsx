"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Award,
  CalendarDays,
  Headphones,
  MapPin,
  Lock,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MARKETPLACE_CATEGORIES } from "@/lib/categories";
import { HeroSlideshow } from "@/components/marketing/hero-slideshow";

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
    desc: "Payments held securely until the job is done",
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

const CATEGORY_CHIPS = MARKETPLACE_CATEGORIES.map((c) => ({
  label: c.label,
  href: `/marketplace?category=${c.slug}`,
}));

export function HeroSection() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState("");

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (location.trim()) params.set("city", location.trim());
    if (date) params.set("date", date);
    if (guests.trim()) params.set("guests", guests.trim());
    const qs = params.toString();
    router.push(qs ? `/marketplace?${qs}` : "/marketplace");
  }

  const getStartedButton = (
    <Link
      href="/register?redirect=/dashboard"
      className="inline-flex items-center justify-center rounded-full bg-[#7A2E3D] px-6 py-3 text-sm font-semibold text-white shadow-md shadow-black/20 transition hover:bg-[#6a2835]"
    >
      Get started
    </Link>
  );

  return (
    <>
      {/* Mobile layout — matches the light Eventra-style mock, desktop hero stays as-is */}
      <section className="bg-[#faf9f7] pt-24 md:hidden">
        <div className="px-4 pb-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/5 px-3 py-1 text-[11px] font-medium text-black">
            <Sparkles className="h-3 w-3" aria-hidden />
            Nigeria&apos;s most trusted event booking platform
          </span>

          <h1 className="mt-4 font-display text-[2rem] font-semibold leading-[1.12] tracking-tight text-[#1f1b18]">
            Events Start at{" "}
            <span className="text-[#7A2E3D]">Evendor</span>
          </h1>

          <p className="mt-3 text-[15px] leading-relaxed text-[#5c534c]">
            Discover and book the best event halls and professional vendors for any
            occasion.{" "}
            <span className="font-medium text-[#7A2E3D]">Simple, secure and reliable.</span>
          </p>

          <Link
            href="/register?redirect=/dashboard"
            className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-[#7A2E3D] px-4 py-3.5 text-sm font-semibold text-white shadow-md shadow-[#7A2E3D]/25"
          >
            Get started
          </Link>

          <form onSubmit={onSearch} className="mt-3 space-y-2.5">
            <label className="flex items-center gap-3 rounded-2xl border border-[#e5dfd9] bg-white px-4 py-3.5 shadow-sm">
              <Search className="h-5 w-5 shrink-0 text-[#7A2E3D]" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search vendors, venues..."
                className="w-full bg-transparent text-sm text-[#1f1b18] outline-none placeholder:text-[#9a918a]"
              />
            </label>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7A2E3D] px-4 py-3.5 text-sm font-semibold uppercase tracking-wide text-white shadow-md shadow-[#7A2E3D]/25"
            >
              <Search className="h-4 w-4" aria-hidden />
              Find vendors &amp; venues
            </button>
          </form>
        </div>

        <div className="pb-4">
          <p className="px-4 text-center text-xs font-semibold uppercase tracking-[0.16em] text-[#7A2E3D]">
            Popular search
          </p>
          <div className="mt-3 overflow-hidden">
            <div className="hero-marquee-track gap-2 px-4">
              {[...CATEGORY_CHIPS, ...CATEGORY_CHIPS].map((item, i) => (
                <Link
                  key={`${item.href}-${i}`}
                  href={item.href}
                  className="shrink-0 rounded-full border border-[#eadfd8] bg-white px-3.5 py-1.5 text-sm font-medium text-[#3d342f] shadow-sm"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-hidden pb-8">
          <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2">
            <div className="relative aspect-[4/5] w-full">
              <HeroSlideshow sizes="100vw" />
            </div>
            <div className="relative z-10 mx-4 -mt-12 rounded-2xl bg-white px-4 py-4 shadow-[0_12px_40px_rgba(31,27,24,0.18)]">
              <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                {TRUST.map((item) => (
                  <div key={item.title} className="flex items-start gap-2">
                    <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-[#7A2E3D]" strokeWidth={1.75} aria-hidden />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold leading-tight text-[#1f1b18]">{item.title}</p>
                      <p className="mt-0.5 text-[10px] leading-snug text-[#6b635c]">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative hidden min-h-[100svh] overflow-hidden text-white md:block">
      <div className="absolute inset-0">
        <HeroSlideshow sizes="100vw" />
      </div>

      {/* Dark left + bottom wash so copy/search stay readable */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(105deg, rgba(12,10,9,0.92) 0%, rgba(12,10,9,0.72) 42%, rgba(12,10,9,0.48) 68%, rgba(12,10,9,0.62) 100%), linear-gradient(180deg, rgba(12,10,9,0.5) 0%, rgba(12,10,9,0.2) 38%, rgba(12,10,9,0.88) 100%)",
        }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col justify-center px-4 pb-12 pt-24 sm:px-6 md:pb-28 md:pt-32 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="w-full max-w-3xl"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-black/45 px-3.5 py-1.5 text-xs font-medium text-white/95 ring-1 ring-white/10 backdrop-blur-sm sm:text-sm">
            <Sparkles className="h-3.5 w-3.5 text-[#7A2E3D]" aria-hidden />
            Nigeria&apos;s most trusted event booking platform
          </span>

          <h1 className="mt-4 font-display text-3xl font-semibold leading-[1.08] tracking-tight sm:mt-6 sm:text-5xl md:text-6xl lg:text-[3.75rem]">
             Events 
            <br />
            Start at Evendor
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/85 sm:mt-5 sm:text-lg">
            Discover and book the best event halls and professional vendors for any
            occasion. Simple, secure and reliable.
          </p>

          <div className="mt-5 sm:mt-8">
            {getStartedButton}
          </div>

          <motion.form
            onSubmit={onSearch}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12, ease: "easeOut" }}
            className="mt-5 flex flex-col gap-1 rounded-2xl bg-white p-1.5 shadow-2xl shadow-black/30 sm:gap-0 sm:rounded-full sm:p-1.5 lg:flex-row lg:items-center"
          >
            <label className="flex min-w-0 flex-1 cursor-text items-center gap-2 rounded-full px-3 py-1.5 sm:gap-3 sm:px-4 sm:py-3">
              <MapPin className="h-4 w-4 shrink-0 text-[#7A2E3D] sm:h-5 sm:w-5" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="hidden text-[11px] font-semibold uppercase tracking-wide text-neutral-500 sm:block">
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

            <label className="flex min-w-0 flex-1 cursor-text items-center gap-2 rounded-full px-3 py-1.5 sm:gap-3 sm:px-4 sm:py-3">
              <CalendarDays className="h-4 w-4 shrink-0 text-[#7A2E3D] sm:h-5 sm:w-5" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="hidden text-[11px] font-semibold uppercase tracking-wide text-neutral-500 sm:block">
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

            <label className="flex min-w-0 flex-1 cursor-text items-center gap-2 rounded-full px-3 py-1.5 sm:gap-3 sm:px-4 sm:py-3">
              <Users className="h-4 w-4 shrink-0 text-[#7A2E3D] sm:h-5 sm:w-5" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="hidden text-[11px] font-semibold uppercase tracking-wide text-neutral-500 sm:block">
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
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 sm:m-0.5 sm:px-6 sm:py-3.5"
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
      </div>
    </section>

    {/* Separate from hero — sits below so mobile hero has no overflow scrollbar */}
    <section className="relative z-20 hidden bg-background px-0 pb-2 pt-0 sm:px-6 sm:pb-4 md:block md:-mt-14 md:px-8 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
        className="mx-auto w-full max-w-6xl"
      >
        <div className="grid w-full grid-cols-2 gap-x-4 gap-y-4 border-y border-[#7A2E3D] bg-[#3A1520] px-4 py-5 shadow-[0_20px_48px_rgba(0,0,0,0.55),0_8px_20px_rgba(122,46,61,0.4)] sm:gap-6 sm:rounded-2xl sm:border sm:px-6 sm:py-6 sm:shadow-[0_24px_60px_rgba(0,0,0,0.45),0_8px_24px_rgba(122,46,61,0.35)] lg:grid-cols-4">
          {TRUST.map((item) => (
            <div key={item.title} className="flex items-start gap-2.5 sm:gap-3">
              <item.icon
                className="mt-0.5 h-5 w-5 shrink-0 text-[#E5DFD9] sm:h-6 sm:w-6"
                strokeWidth={1.75}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight text-white sm:text-sm">
                  {item.title}
                </p>
                <p className="mt-1 text-[11px] leading-snug text-white/70 sm:text-sm sm:leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
    </>
  );
}

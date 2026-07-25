"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Search, DollarSign, CalendarX, MessageSquare } from "lucide-react";

const problems = [
  {
    icon: Search,
    title: "Too many vendors",
    desc: "Endless WhatsApp lists with no way to compare quality.",
  },
  {
    icon: DollarSign,
    title: "No price clarity",
    desc: "Hidden fees and surprise quotes after you've committed.",
  },
  {
    icon: CalendarX,
    title: "Unreliable bookings",
    desc: "Double bookings and last-minute cancellations.",
  },
  {
    icon: MessageSquare,
    title: "Scattered communication",
    desc: "Dozens of chats across platforms with no paper trail.",
  },
];

export function SocialProofSection() {
  return (
    <section id="social-proof" className="border-y border-border bg-secondary/40 py-16 md:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-2xl font-medium leading-snug text-foreground sm:text-3xl md:text-4xl md:leading-snug">
          Event planning is broken.
        </h2>

        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {problems.map((p) => (
            <article
              key={p.title}
              className="rounded-xl border border-border bg-card p-3 shadow-sm md:p-4"
            >
              <p.icon className="h-4 w-4 text-primary md:h-5 md:w-5" />
              <h3 className="mt-2 text-xs font-semibold leading-tight text-foreground md:text-sm">
                {p.title}
              </h3>
              <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground md:text-xs">
                {p.desc}
              </p>
            </article>
          ))}
        </div>

        <p className="font-display mt-10 text-2xl font-medium leading-snug text-foreground sm:text-3xl md:text-4xl md:leading-snug">
          Millions celebrate across Africa — yet planning remains fragmented and stressful.
          <br />
          <br />
          Evendor streamlines event planning, helping you craft unforgettable moments and build
          confidence in every booking. Acting as an extension of your team, we connect discovery,
          comparison, and secure payments in one seamless platform.
          <br />
          <br />
          Welcome to the future of event planning in Africa.
        </p>

        <Link href="#solution" className="link-arrow mt-10 inline-flex text-base">
          See how we can help
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

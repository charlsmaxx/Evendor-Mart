"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { SectionShell } from "@/components/shared/section-shell";
import { getWhatsAppHref } from "@/lib/whatsapp";

const BENEFITS = [
  "Find all event information in one place",
  "RSVP easily",
  "Get directions to the venue",
  "Stay updated with important announcements",
  "Share in the excitement with your guests",
] as const;

const WHATSAPP_MESSAGE = `Hello Evendor! 👋

I'd like a custom website for my event.

Here are my details:

• Event Type:
• Event Date:
• Event Location:
• Estimated Guests:

Please tell me more about your event website service.`;

export function EventWebsiteSection() {
  const reduceMotion = useReducedMotion();
  const href = getWhatsAppHref(WHATSAPP_MESSAGE);

  return (
    <SectionShell id="event-website" className="bg-[#FAF8F6]">
      <div
        className="pointer-events-none absolute -right-16 top-0 h-64 w-64 rounded-full opacity-[0.07]"
        style={{ background: "radial-gradient(circle, #7A2E3D 0%, transparent 70%)" }}
        aria-hidden
      />

      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16 xl:gap-20">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="relative z-10 order-1 lg:order-1"
        >
          <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-white/80 px-3.5 py-1.5 text-sm font-medium text-primary shadow-sm">
            <span aria-hidden>✨</span> Premium Service
          </p>

          <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
            Need a Beautiful Website for Your Event?
          </h2>

          <div className="mt-5 space-y-4 text-base leading-relaxed text-muted-foreground md:text-lg">
            <p>
              Instead of relying on dozens of WhatsApp messages and phone calls, give your
              guests one beautiful place where they can find everything they need.
            </p>
            <p>
              Whether it&apos;s a wedding, birthday, conference, church program, corporate event, or
              any special celebration, we&apos;ll create a professionally designed website that
              reflects your event, your style, and your story.
            </p>
          </div>

          <ul className="mt-8 space-y-3.5">
            {BENEFITS.map((item) => (
              <li key={item} className="flex items-start gap-3 text-[15px] text-foreground md:text-base">
                <CheckCircle2
                  className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-10 border-t border-border/80 pt-8">
            <h3 className="font-display text-xl font-semibold tracking-tight text-foreground md:text-2xl">
              Ready to Create Your Event Website?
            </h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
              Make your event unforgettable with a professionally designed website your guests will
              love.
            </p>

            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-6 py-3 text-base font-semibold text-white shadow-[0_8px_24px_rgba(37,211,102,0.28)] transition hover:bg-[#1ebe57] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
              >
                <span aria-hidden>🟢</span>
                Chat With Us on WhatsApp
              </a>
            ) : (
              <p className="mt-6 text-sm text-muted-foreground">
                WhatsApp is temporarily unavailable. Please email support to request an event
                website.
              </p>
            )}

            <p className="mt-3 text-sm text-muted-foreground">
              Custom-designed • Mobile-friendly • Tailored to your event
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.08, ease: "easeOut" }}
          className="relative z-10 order-2 flex justify-center lg:order-2 lg:justify-end"
        >
          <motion.div
            animate={reduceMotion ? undefined : { y: [0, -10, 0] }}
            transition={
              reduceMotion
                ? undefined
                : { duration: 5.5, repeat: Infinity, ease: "easeInOut" }
            }
            className="relative w-full max-w-xl"
          >
            <div className="overflow-hidden rounded-[18px] bg-white/40 p-2 shadow-[0_20px_50px_rgba(31,27,24,0.12)] sm:p-3">
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src="/images/event-website-laptop.png"
                  alt="Laptop displaying a beautifully designed custom event website"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-contain"
                  loading="lazy"
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </SectionShell>
  );
}

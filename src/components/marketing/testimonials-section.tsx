"use client";

import { motion } from "framer-motion";
import { SectionShell } from "@/components/shared/section-shell";

const testimonials = [
  { name: "Amara O.", role: "Wedding planner, Lagos", quote: "Evendor cut our vendor sourcing time by 70%. The booking flow is flawless." },
  { name: "David K.", role: "Corporate events, Nairobi", quote: "Finally — price transparency and verified vendors in one platform." },
  { name: "Fatima A.", role: "Bride-to-be, Abuja", quote: "I booked my venue, DJ, and caterer without a single stressful phone chase." },
];

export function TestimonialsSection() {
  return (
    <SectionShell id="testimonials" className="bg-primary text-primary-foreground">
      <h2 className="text-center font-display text-3xl font-bold md:text-4xl">
        Loved by event creators
      </h2>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {testimonials.map((t, i) => (
          <motion.blockquote
            key={t.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-[2px]"
          >
            <p className="text-primary-foreground/90">&ldquo;{t.quote}&rdquo;</p>
            <footer className="mt-4">
              <p className="font-semibold text-primary-foreground">{t.name}</p>
              <p className="text-sm text-primary-foreground/70">{t.role}</p>
            </footer>
          </motion.blockquote>
        ))}
      </div>
    </SectionShell>
  );
}

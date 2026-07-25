"use client";

import { motion } from "framer-motion";
import { SectionShell } from "@/components/shared/section-shell";

export function MobilePreviewSection() {
  return (
    <SectionShell id="mobile" className="bg-secondary/30">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-3xl font-bold md:text-4xl">Plan on the go</h2>
          <p className="mt-4 text-muted-foreground">
            Mobile app coming soon. Manage bookings, chat vendors, and track your event from anywhere.
          </p>
        </div>
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="mx-auto w-64 rounded-[2.5rem] border-4 border-border bg-card p-3 shadow-xl"
        >
          <div className="aspect-[9/19] overflow-hidden rounded-[2rem] bg-muted p-4">
            <div className="mb-4 mx-auto h-2 w-16 rounded-full bg-border" />
            <div className="space-y-3">
              <div className="h-8 rounded-lg bg-primary/20" />
              <div className="h-20 rounded-xl border border-border bg-card" />
              <div className="h-20 rounded-xl border border-border bg-card" />
              <div className="h-12 rounded-xl bg-primary/15" />
            </div>
          </div>
        </motion.div>
      </div>
    </SectionShell>
  );
}

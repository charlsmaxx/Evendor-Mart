"use client";

import dynamic from "next/dynamic";
import { useCompareStore } from "@/stores/compare-store";

const CompareDrawer = dynamic(
  () => import("@/components/app/compare-drawer").then((m) => ({ default: m.CompareDrawer })),
  { ssr: false }
);

/** Loads compare UI only after the user adds an item — keeps it off most routes. */
export function CompareDrawerLazy() {
  const hasItems = useCompareStore((s) => s.items.length > 0);
  if (!hasItems) return null;
  return <CompareDrawer />;
}

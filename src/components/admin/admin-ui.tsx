"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminKpiCard({
  label,
  value,
  sub,
  href,
  accent,
  highlight,
}: {
  label: string;
  value: string | number;
  sub?: string;
  href: string;
  accent?: boolean;
  highlight?: "green" | "amber" | "red" | "primary";
}) {
  const highlightRing = {
    green: "border-emerald-500/30",
    amber: "border-amber-500/30",
    red: "border-red-500/30",
    primary: "border-[#7A2E3D]/40",
  };

  return (
    <Link href={href} className="group block">
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border bg-[#1a1215]/80 p-5 transition-all duration-200",
          "hover:-translate-y-0.5 hover:border-[#7A2E3D]/50 hover:shadow-[0_8px_32px_rgba(122,46,61,0.15)]",
          highlight ? highlightRing[highlight] : "border-white/10",
          accent && "bg-gradient-to-br from-[#7A2E3D]/15 to-transparent"
        )}
      >
        <div className="flex items-start justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-[#E5DFD9]/50">{label}</p>
          <ArrowUpRight className="h-3.5 w-3.5 text-[#E5DFD9]/20 transition group-hover:text-[#E5DFD9]/60" />
        </div>
        <p className={cn("mt-2 font-display text-2xl font-bold", accent ? "text-[#E5DFD9]" : "text-[#E5DFD9]/90")}>
          {value}
        </p>
        {sub && <p className="mt-1 text-xs text-[#E5DFD9]/40">{sub}</p>}
      </div>
    </Link>
  );
}

export function AdminHealthRing({ score, label }: { score: number; label: string }) {
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 85 ? "#10b981" : score >= 70 ? "#7A2E3D" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-24 w-24">
        <svg className="-rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-xl font-bold text-[#E5DFD9]">{score}</span>
        </div>
      </div>
      <p className="mt-2 text-xs font-semibold text-[#E5DFD9]/70">Platform Health</p>
      <p className="text-[10px] text-[#E5DFD9]/40">{label}</p>
    </div>
  );
}

export function AdminBarChart({
  data,
  valueKey = "value",
  labelKey = "label",
  color = "#7A2E3D",
}: {
  data: { label: string; value: number }[];
  valueKey?: string;
  labelKey?: string;
  color?: string;
}) {
  const max = Math.max(...data.map((d) => d[valueKey as keyof typeof d] as number), 1);

  return (
    <div className="flex h-40 items-end gap-2">
      {data.map((d) => {
        const val = d[valueKey as keyof typeof d] as number;
        const height = Math.max(4, (val / max) * 100);
        return (
          <div key={d[labelKey as keyof typeof d] as string} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex w-full flex-1 flex-col justify-end">
              <div
                className="w-full rounded-t-md transition-all"
                style={{ height: `${height}%`, background: `linear-gradient(to top, ${color}, ${color}88)` }}
                title={String(val)}
              />
            </div>
            <span className="text-[10px] text-[#E5DFD9]/40">{d[labelKey as keyof typeof d] as string}</span>
          </div>
        );
      })}
    </div>
  );
}

export function AdminPageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#E5DFD9] md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[#E5DFD9]/50">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

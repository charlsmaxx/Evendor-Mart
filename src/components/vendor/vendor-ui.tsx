"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export function VendorPageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function VendorSummaryCard({
  label,
  value,
  sub,
  href,
  accent = false,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  href?: string;
  accent?: boolean;
  icon?: React.ElementType;
}) {
  const inner = (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/80 bg-card/80 p-5 shadow-sm backdrop-blur-sm transition-all duration-200",
        href && "cursor-pointer hover:-translate-y-0.5 hover:shadow-md",
        accent && "border-primary/25"
      )}
      style={
        accent
          ? {
              background:
                "linear-gradient(135deg, rgba(122,46,61,0.07) 0%, rgba(229,223,217,0.15) 100%)",
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-3">
        {Icon && (
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              accent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      <p
        className={cn(
          "mt-3 font-display text-2xl font-bold tabular-nums",
          accent && "text-primary"
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground/70">{sub}</p>}
    </div>
  );

  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

export function QuickActionGrid({
  actions,
}: {
  actions: { label: string; href: string; icon: React.ElementType; highlight?: boolean }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {actions.map((a) => (
        <Link
          key={a.href + a.label}
          href={a.href}
          className={cn(
            "flex flex-col items-center gap-2 rounded-2xl border border-border/80 bg-card/60 p-4 text-center backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm",
            a.highlight && "border-primary/30 bg-primary/5"
          )}
        >
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl",
              a.highlight ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
            )}
          >
            <a.icon className="h-5 w-5" />
          </div>
          <span className="text-xs font-medium leading-tight">{a.label}</span>
        </Link>
      ))}
    </div>
  );
}

export function VendorSection({
  title,
  href,
  hrefLabel = "View all",
  children,
}: {
  title: string;
  href?: string;
  hrefLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card/60 p-5 shadow-sm backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-semibold">{title}</p>
        {href && (
          <Link href={href} className="text-xs font-medium text-primary hover:underline">
            {hrefLabel}
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

export function VendorSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 w-56 rounded-lg bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-muted" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-32 rounded-2xl bg-muted" />
      ))}
    </div>
  );
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
        aria-label="Close"
      />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h3 className="font-display text-lg font-bold">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={cn(
              "flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60",
              destructive ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary/90"
            )}
          >
            {loading ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export const BOOKING_STATUS_STYLES: Record<string, string> = {
  RESERVED: "bg-amber-100 text-amber-800 border-amber-200",
  PENDING_PAYMENT: "bg-amber-100 text-amber-800 border-amber-200",
  CONFIRMED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-200",
  COMPLETED: "bg-gray-100 text-gray-700 border-gray-200",
  CANCELLED: "bg-red-100 text-red-700 border-red-200",
  DECLINED: "bg-red-100 text-red-700 border-red-200",
  EXPIRED: "bg-gray-100 text-gray-500 border-gray-200",
};

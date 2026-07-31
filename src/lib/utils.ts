import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Show a single price when min equals max (or only one amount is set). */
export function formatPriceRange(min: number, max: number) {
  if (!max || max <= min) return formatCurrency(min);
  return `${formatCurrency(min)} – ${formatCurrency(max)}`;
}

/** Browse/list cards: starting price only (full range on vendor profile). */
export function formatStartingPrice(min: number) {
  return `From ${formatCurrency(min)}`;
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function maskContact(text: string) {
  return text.replace(/(\+?\d[\d\s-]{8,}\d)/g, "[hidden]");
}

import { slugify } from "@/lib/utils";

export const BUSINESS_CARD_IMAGE = "/images/business card.png";
export const BUSINESS_CARD_SIZE = 1254;

/** Layout as fractions of the 1254×1254 template. */
export const BUSINESS_CARD_LAYOUT = {
  avatar: { top: 0.118, diameter: 0.308 },
  pill: { left: 0.068, bottom: 0.108, height: 0.162 },
} as const;

export function vendorCardHandle(slug: string, businessName?: string) {
  const base = (slug || slugify(businessName ?? "vendor")).replace(/-/g, "_");
  return `@${base}`;
}

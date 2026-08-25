import { slugify } from "@/lib/utils";

export const BUSINESS_CARD_IMAGE = "/images/business card.png";
export const BUSINESS_CARD_SIZE = 1254;
export const BUSINESS_CARD_HEADLINE_LINE_1 = "You can find me";
export const BUSINESS_CARD_HEADLINE_LINE_2 = "on evendor.ng";

/** Layout as fractions of the 1254×1254 template. */
export const BUSINESS_CARD_LAYOUT = {
  avatar: { top: 0.226, diameter: 0.274 },
  headline: { top: 0.502, height: 0.148 },
  pill: { left: 0.190, bottom: 0.158, height: 0.160 },
} as const;

export function vendorCardHandle(slug: string, businessName?: string) {
  const base = (slug || slugify(businessName ?? "vendor")).replace(/-/g, "_");
  return `@${base}`;
}

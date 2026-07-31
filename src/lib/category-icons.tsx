import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Cake,
  Camera,
  Car,
  ClipboardList,
  Flower2,
  Gift,
  Headphones,
  Mic2,
  Music,
  Palette,
  Printer,
  Shield,
  Shirt,
  Sparkles,
  SprayCan,
  Theater,
  UtensilsCrossed,
  Users,
  Video,
  Wine,
  PartyPopper,
  CircleDot,
  Store,
} from "lucide-react";
import type { VendorCategoryValue } from "@/lib/categories";

/** Lucide icons for marketplace / nav category menus. */
export const CATEGORY_ICONS: Record<VendorCategoryValue, LucideIcon> = {
  EVENT_PLANNER: ClipboardList,
  VENUE: Building2,
  CATERER: UtensilsCrossed,
  DECORATOR: Palette,
  BAKER: Cake,
  PHOTOGRAPHER: Camera,
  VIDEOGRAPHER: Video,
  MAKEUP_ARTIST: SprayCan,
  GELE_BRIDAL_ARTIST: Sparkles,
  FASHION_DESIGNER: Shirt,
  MC: Mic2,
  DJ: Music,
  FLORIST: Flower2,
  LIGHTING_SOUND: Headphones,
  RENTAL: Store,
  BRIDAL_RENTAL: Shirt,
  TRANSPORTATION: Car,
  SECURITY: Shield,
  BAR_COCKTAIL: Wine,
  WAITERS_USHERS: Users,
  EVENT_RENTAL: PartyPopper,
  PRINTING_BRANDING: Printer,
  GIFT_SOUVENIR: Gift,
  SMALL_CHOPS_CATERING: UtensilsCrossed,
  BALLOON_BACKDROP: CircleDot,
  WEDDING_VENDOR: Sparkles,
  CORPORATE: Theater,
};

export function getCategoryIcon(value: VendorCategoryValue | string): LucideIcon {
  return CATEGORY_ICONS[value as VendorCategoryValue] ?? Sparkles;
}

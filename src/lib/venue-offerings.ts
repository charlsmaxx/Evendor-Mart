import type { LucideIcon } from "lucide-react";
import {
  Zap,
  Wifi,
  Snowflake,
  Car,
  Shield,
  Flame,
  BellRing,
  Armchair,
  Users,
  Music,
  Utensils,
  Sparkles,
  Bath,
  Accessibility,
  Camera,
  TreePine,
  Sun,
  Volume2,
  ClipboardList,
  Trash2,
  Plug,
} from "lucide-react";

export type VenueOfferingItem = {
  key: string;
  label: string;
  icon: LucideIcon;
};

export type VenueOfferingGroup = {
  id: string;
  label: string;
  items: VenueOfferingItem[];
};

export const VENUE_AMENITY_GROUPS: VenueOfferingGroup[] = [
  {
    id: "power",
    label: "Power & connectivity",
    items: [
      { key: "power-24-7", label: "24/7 power supply", icon: Zap },
      { key: "generator", label: "Backup generator", icon: Plug },
      { key: "wifi", label: "Free WiFi", icon: Wifi },
    ],
  },
  {
    id: "comfort",
    label: "Comfort & furniture",
    items: [
      { key: "ac", label: "Air conditioning", icon: Snowflake },
      { key: "tables-chairs", label: "Tables & chairs", icon: Armchair },
      { key: "restrooms", label: "Restrooms", icon: Bath },
      { key: "wheelchair-access", label: "Wheelchair accessible", icon: Accessibility },
    ],
  },
  {
    id: "space",
    label: "Event space features",
    items: [
      { key: "stage", label: "Stage / raised platform", icon: Music },
      { key: "dance-floor", label: "Dance floor", icon: Sparkles },
      { key: "dressing-room", label: "Dressing / green room", icon: Users },
      { key: "bridal-suite", label: "Bridal suite", icon: Sparkles },
      { key: "outdoor-space", label: "Outdoor / garden space", icon: TreePine },
      { key: "rooftop", label: "Rooftop area", icon: Sun },
    ],
  },
  {
    id: "parking",
    label: "Parking & access",
    items: [
      { key: "parking", label: "Parking space", icon: Car },
      { key: "valet-parking", label: "Valet parking", icon: Car },
      { key: "secure-perimeter", label: "Secure perimeter", icon: Shield },
    ],
  },
  {
    id: "safety",
    label: "Safety & security",
    items: [
      { key: "security", label: "On-site security", icon: Shield },
      { key: "cctv", label: "CCTV surveillance", icon: Camera },
      { key: "fire-extinguisher", label: "Fire extinguisher", icon: Flame },
      { key: "smoke-alarm", label: "Smoke alarm", icon: BellRing },
      { key: "first-aid", label: "First aid kit", icon: ClipboardList },
      { key: "emergency-exits", label: "Marked emergency exits", icon: BellRing },
    ],
  },
];

export const VENUE_SERVICE_GROUPS: VenueOfferingGroup[] = [
  {
    id: "catering",
    label: "Food & beverage",
    items: [
      { key: "in-house-catering", label: "In-house catering", icon: Utensils },
      { key: "external-catering", label: "External catering allowed", icon: Utensils },
      { key: "bar-service", label: "Bar / drinks service", icon: Utensils },
    ],
  },
  {
    id: "production",
    label: "A/V & production",
    items: [
      { key: "sound-system", label: "Sound system / PA", icon: Volume2 },
      { key: "lighting", label: "Event lighting", icon: Sparkles },
      { key: "projector-screen", label: "Projector & screen", icon: Camera },
    ],
  },
  {
    id: "event-support",
    label: "Event support",
    items: [
      { key: "decoration", label: "Decoration services", icon: Sparkles },
      { key: "event-coordination", label: "Event coordination", icon: ClipboardList },
      { key: "cleaning", label: "Post-event cleaning", icon: Trash2 },
      { key: "security-staff", label: "Security personnel", icon: Shield },
    ],
  },
];

const ALL_ITEMS = [...VENUE_AMENITY_GROUPS, ...VENUE_SERVICE_GROUPS].flatMap((g) => g.items);
const KEY_MAP = new Map(ALL_ITEMS.map((i) => [i.key, i]));
const LABEL_TO_KEY = new Map(ALL_ITEMS.map((i) => [i.label.toLowerCase(), i.key]));

export function isKnownOfferingKey(value: string) {
  return KEY_MAP.has(value);
}

export function resolveOffering(value: string): VenueOfferingItem | null {
  if (KEY_MAP.has(value)) return KEY_MAP.get(value)!;
  const byLabel = LABEL_TO_KEY.get(value.toLowerCase());
  if (byLabel) return KEY_MAP.get(byLabel)!;
  return null;
}

export function splitOfferings(values: string[]) {
  const known: VenueOfferingItem[] = [];
  const custom: string[] = [];
  for (const v of values) {
    const resolved = resolveOffering(v);
    if (resolved) known.push(resolved);
    else if (v.trim()) custom.push(v.trim());
  }
  return { known, custom };
}

export function groupResolvedOfferings(
  items: VenueOfferingItem[],
  groups: VenueOfferingGroup[]
) {
  return groups
    .map((group) => ({
      ...group,
      selected: group.items.filter((item) => items.some((s) => s.key === item.key)),
    }))
    .filter((g) => g.selected.length > 0);
}

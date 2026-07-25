/**
 * Evendor vendor categories — aligned with official vendor list (Assets/vendor list.png).
 * Single source of truth for onboarding pickers, marketplace filters, and DB seeding.
 */

export type VendorCategoryValue =
  | "EVENT_PLANNER"
  | "VENUE"
  | "CATERER"
  | "DECORATOR"
  | "BAKER"
  | "PHOTOGRAPHER"
  | "VIDEOGRAPHER"
  | "MAKEUP_ARTIST"
  | "GELE_BRIDAL_ARTIST"
  | "FASHION_DESIGNER"
  | "MC"
  | "DJ"
  | "FLORIST"
  | "LIGHTING_SOUND"
  | "RENTAL"
  | "BRIDAL_RENTAL"
  | "TRANSPORTATION"
  | "SECURITY"
  | "BAR_COCKTAIL"
  | "WAITERS_USHERS"
  | "EVENT_RENTAL"
  | "PRINTING_BRANDING"
  | "GIFT_SOUVENIR"
  | "SMALL_CHOPS_CATERING"
  | "BALLOON_BACKDROP"
  /** @deprecated Legacy — use EVENT_PLANNER */
  | "WEDDING_VENDOR"
  /** @deprecated Legacy — use EVENT_PLANNER */
  | "CORPORATE";

export type CategoryDefinition = {
  value: VendorCategoryValue;
  label: string;
  slug: string;
  sortOrder: number;
  description: string;
  image: string;
  /** Venue owners list spaces, not services */
  isVenue?: boolean;
  /** Hidden from new vendor pickers; kept for existing profiles */
  legacy?: boolean;
};

const U = (id: string, w = 900) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80`;

/** Official Evendor vendor list (25 categories) + legacy values. */
export const VENDOR_CATEGORIES: CategoryDefinition[] = [
  {
    value: "EVENT_PLANNER",
    label: "Event Planners",
    slug: "event-planners",
    sortOrder: 1,
    description: "Full-service planners who coordinate vendors, timelines, and details so you can enjoy the day.",
    image: "/images/event-planner.png",
  },
  {
    value: "VENUE",
    label: "Venue Owners",
    slug: "venues",
    sortOrder: 2,
    isVenue: true,
    description: "Ballrooms, rooftops, gardens, and unique spaces for weddings, galas, and corporate events.",
    image: "/images/venues.png",
  },
  {
    value: "CATERER",
    label: "Caterers",
    slug: "caterers",
    sortOrder: 3,
    description: "From buffet spreads to plated fine dining — chefs and caterers for every taste and budget.",
    image: U("1555244162-803834f70033"),
  },
  {
    value: "DECORATOR",
    label: "Decorators & Stylists",
    slug: "decorators",
    sortOrder: 4,
    description: "Floral design, stage styling, and décor that transforms any venue into something unforgettable.",
    image: U("1464366400600-7168b8af9bc3"),
  },
  {
    value: "BAKER",
    label: "Bakers & Cake Designers",
    slug: "bakers",
    sortOrder: 5,
    description: "Custom wedding cakes, dessert tables, and celebration bakes crafted for your event.",
    image: U("1578985545062-69928b1d9587"),
  },
  {
    value: "PHOTOGRAPHER",
    label: "Photographers",
    slug: "photographers",
    sortOrder: 6,
    description: "Capture every moment — wedding photographers and creative visual storytellers.",
    image: U("1492691527719-9d1e07e534b4"),
  },
  {
    value: "VIDEOGRAPHER",
    label: "Videographers",
    slug: "videographers",
    sortOrder: 7,
    description: "Cinematic event films, highlight reels, and live-stream coverage for your celebration.",
    image: U("1492691290082-93253102142c"),
  },
  {
    value: "MAKEUP_ARTIST",
    label: "Makeup Artists",
    slug: "makeup-artists",
    sortOrder: 8,
    description: "Bridal glam, event makeup, and on-site artists who help you look your best on the big day.",
    image: "/images/makeup-artist.png",
  },
  {
    value: "GELE_BRIDAL_ARTIST",
    label: "Gele & Bridal Artists",
    slug: "gele-bridal-artists",
    sortOrder: 9,
    description: "Traditional gele styling, bridal headpieces, and cultural beauty for your ceremony.",
    image: U("1522337360788-8bbb487af923"),
  },
  {
    value: "FASHION_DESIGNER",
    label: "Fashion Designers",
    slug: "fashion-designers",
    sortOrder: 10,
    description: "Custom outfits, aso-ebi coordination, and designer wear for hosts and bridal parties.",
    image: U("1515372039744-b8f02a3ae446"),
  },
  {
    value: "MC",
    label: "MCs / Hosts",
    slug: "mcs",
    sortOrder: 11,
    description: "Charismatic hosts and MCs who guide your program and keep guests engaged from start to finish.",
    image: "/images/mc.png",
  },
  {
    value: "DJ",
    label: "DJ / Musicians",
    slug: "djs",
    sortOrder: 12,
    description: "Professional DJs, live bands, and musicians to keep your dance floor and atmosphere alive.",
    image: "/images/djs.png",
  },
  {
    value: "FLORIST",
    label: "Florists",
    slug: "florists",
    sortOrder: 13,
    description: "Bouquets, centrepieces, and floral installations for weddings and special occasions.",
    image: U("1487536270022-cf5f6831c327"),
  },
  {
    value: "LIGHTING_SOUND",
    label: "Lighting & Sound Providers",
    slug: "lighting-sound",
    sortOrder: 14,
    description: "Stage lighting, PA systems, and technical production for events of any scale.",
    image: U("1470229722913-7c0e2dbbafd3"),
  },
  {
    value: "RENTAL",
    label: "Rental Equipment Providers",
    slug: "equipment-rentals",
    sortOrder: 15,
    description: "AV gear, generators, staging equipment, and specialty rentals for events.",
    image: U("1581094794329-c8112a89af12"),
  },
  {
    value: "BRIDAL_RENTAL",
    label: "Bridal Rentals",
    slug: "bridal-rentals",
    sortOrder: 16,
    description: "Wedding gowns, suits, accessories, and bridal wear available to rent.",
    image: U("1519741497674-611481863552"),
  },
  {
    value: "TRANSPORTATION",
    label: "Transportation Providers",
    slug: "transportation",
    sortOrder: 17,
    description: "Luxury cars, buses, and guest shuttle services for weddings and corporate events.",
    image: U("1449965408869-eaa3f723e40d"),
  },
  {
    value: "SECURITY",
    label: "Security Services",
    slug: "security",
    sortOrder: 18,
    description: "Event security, crowd control, and VIP protection for private and public gatherings.",
    image: U("1450101499163-c8848c66ca85"),
  },
  {
    value: "BAR_COCKTAIL",
    label: "Bar & Cocktail Services",
    slug: "bar-cocktail",
    sortOrder: 19,
    description: "Mobile bars, mixologists, and cocktail stations for receptions and parties.",
    image: U("1514362545857-3bc16c4c7d66"),
  },
  {
    value: "WAITERS_USHERS",
    label: "Waiters / Ushers",
    slug: "waiters-ushers",
    sortOrder: 20,
    description: "Professional wait staff, ushers, and guest services for seamless event hospitality.",
    image: U("1414235077428-338989a2714b"),
  },
  {
    value: "EVENT_RENTAL",
    label: "Event Rentals (Chairs, Tables, Tents)",
    slug: "event-rentals",
    sortOrder: 21,
    description: "Chairs, tables, tents, linens, and furniture hire for indoor and outdoor events.",
    image: U("1530103862673-de803c894a0d"),
  },
  {
    value: "PRINTING_BRANDING",
    label: "Printing & Branding Services",
    slug: "printing-branding",
    sortOrder: 22,
    description: "Invitations, signage, programmes, and branded materials for your event.",
    image: U("1586281380117-5a97127b903f"),
  },
  {
    value: "GIFT_SOUVENIR",
    label: "Gift & Souvenir Vendors",
    slug: "gift-souvenir",
    sortOrder: 23,
    description: "Party favours, corporate gifts, and personalised souvenirs for guests.",
    image: U("1549464218-9f1a27918c82"),
  },
  {
    value: "SMALL_CHOPS_CATERING",
    label: "Catering (Small Chops, Snacks)",
    slug: "small-chops-catering",
    sortOrder: 24,
    description: "Small chops, finger foods, and snack catering for cocktails and receptions.",
    image: U("1606755969252-67c0e0873a10"),
  },
  {
    value: "BALLOON_BACKDROP",
    label: "Balloons & Backdrop Designers",
    slug: "balloon-backdrop",
    sortOrder: 25,
    description: "Balloon arches, photo backdrops, and creative installations for celebrations.",
    image: U("1464347759843-97936a0930c2"),
  },
  {
    value: "WEDDING_VENDOR",
    label: "Wedding vendor",
    slug: "wedding-planners",
    sortOrder: 98,
    legacy: true,
    description: "Legacy category — please update your profile to a specific vendor type.",
    image: "/images/wedding-couple.png",
  },
  {
    value: "CORPORATE",
    label: "Corporate events",
    slug: "corporate-events",
    sortOrder: 99,
    legacy: true,
    description: "Legacy category — please update your profile to a specific vendor type.",
    image: U("1511578314324-3792e89fd148"),
  },
];

/** Categories shown when listing a service business (excludes venues & legacy). */
export const SERVICE_VENDOR_CATEGORY_OPTIONS = VENDOR_CATEGORIES.filter(
  (c) => !c.isVenue && !c.legacy
);

/** All categories for marketplace browse/search (excludes legacy duplicates). */
export const MARKETPLACE_CATEGORIES = VENDOR_CATEGORIES.filter((c) => !c.legacy);

/** Venue + all service categories for simple onboarding form. */
export const ALL_VENDOR_CATEGORY_OPTIONS = VENDOR_CATEGORIES.filter((c) => !c.legacy);

export const serviceVendorCategories = SERVICE_VENDOR_CATEGORY_OPTIONS.map(
  (c) => c.value
) as [VendorCategoryValue, ...VendorCategoryValue[]];

export const vendorCategoryToSlug: Record<VendorCategoryValue, string> = Object.fromEntries(
  VENDOR_CATEGORIES.map((c) => [c.value, c.slug])
) as Record<VendorCategoryValue, string>;

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  VENDOR_CATEGORIES.map((c) => [c.value, c.label])
);

export function getCategoryLabel(value: string): string {
  return CATEGORY_LABELS[value] ?? value.replace(/_/g, " ");
}

export function getCategoryBySlug(slug: string): CategoryDefinition | undefined {
  return VENDOR_CATEGORIES.find((c) => c.slug === slug);
}

export function getCategoryByValue(value: string): CategoryDefinition | undefined {
  return VENDOR_CATEGORIES.find((c) => c.value === value);
}

/** Seed / migration rows for the Category table. */
export function marketplaceCategorySeedRows() {
  return MARKETPLACE_CATEGORIES.map((c) => ({
    name: c.label,
    slug: c.slug,
    icon: c.isVenue ? "building" : "sparkles",
    sortOrder: c.sortOrder,
  }));
}

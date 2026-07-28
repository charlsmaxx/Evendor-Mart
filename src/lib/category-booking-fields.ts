/**
 * Configurable category booking fields — rendered dynamically by BookingForm.
 * Add new categories here without changing booking-engine logic.
 */

import type { VendorCategoryValue } from "@/lib/categories";

export type CategoryFieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "multiselect"
  | "boolean"
  | "time";

export type CategoryBookingField = {
  key: string;
  label: string;
  type: CategoryFieldType;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
};

const guestCount: CategoryBookingField = {
  key: "guestCount",
  label: "Guest count",
  type: "number",
  required: true,
  min: 1,
  placeholder: "Number of guests",
};

const CATEGORY_BOOKING_FIELDS: Partial<Record<VendorCategoryValue, CategoryBookingField[]>> = {
  VENUE: [
    guestCount,
    { key: "setupTime", label: "Setup time", type: "time" },
    { key: "cleanupTime", label: "Cleanup time", type: "time" },
    { key: "decorationRequired", label: "Decoration required", type: "boolean" },
    { key: "parkingRequired", label: "Parking required", type: "boolean" },
    {
      key: "accessibilityRequirements",
      label: "Accessibility requirements",
      type: "textarea",
      placeholder: "Ramps, seating, etc.",
    },
  ],
  PHOTOGRAPHER: [
    {
      key: "locationType",
      label: "Indoor / Outdoor",
      type: "select",
      options: [
        { value: "indoor", label: "Indoor" },
        { value: "outdoor", label: "Outdoor" },
        { value: "both", label: "Both" },
      ],
    },
    { key: "drone", label: "Drone coverage", type: "boolean" },
    { key: "album", label: "Printed album", type: "boolean" },
    { key: "highlightVideo", label: "Highlight video", type: "boolean" },
    {
      key: "deliveryPreference",
      label: "Delivery preference",
      type: "select",
      options: [
        { value: "online", label: "Online gallery" },
        { value: "usb", label: "USB drive" },
        { value: "both", label: "Both" },
      ],
    },
  ],
  VIDEOGRAPHER: [
    {
      key: "locationType",
      label: "Indoor / Outdoor",
      type: "select",
      options: [
        { value: "indoor", label: "Indoor" },
        { value: "outdoor", label: "Outdoor" },
        { value: "both", label: "Both" },
      ],
    },
    { key: "drone", label: "Drone coverage", type: "boolean" },
    { key: "sameDayEdit", label: "Same-day edit", type: "boolean" },
    {
      key: "deliveryPreference",
      label: "Delivery preference",
      type: "select",
      options: [
        { value: "online", label: "Online" },
        { value: "usb", label: "USB" },
        { value: "both", label: "Both" },
      ],
    },
  ],
  DECORATOR: [
    { key: "theme", label: "Theme", type: "text", placeholder: "e.g. Classic ivory" },
    { key: "colourPalette", label: "Colour palette", type: "text" },
    {
      key: "venueType",
      label: "Venue type",
      type: "select",
      options: [
        { value: "hall", label: "Hall" },
        { value: "garden", label: "Garden" },
        { value: "church", label: "Church" },
        { value: "other", label: "Other" },
      ],
    },
    { key: "lighting", label: "Lighting required", type: "boolean" },
    { key: "flowers", label: "Flowers required", type: "boolean" },
  ],
  MAKEUP_ARTIST: [
    { key: "brideOnly", label: "Bride only", type: "boolean" },
    { key: "bridesmaidsCount", label: "Bridesmaids", type: "number", min: 0 },
    { key: "hairStyling", label: "Hair styling", type: "boolean" },
    { key: "gele", label: "Gele", type: "boolean" },
    { key: "touchUp", label: "Touch-up", type: "boolean" },
  ],
  GELE_BRIDAL_ARTIST: [
    { key: "brideOnly", label: "Bride only", type: "boolean" },
    { key: "bridesmaidsCount", label: "Additional gele", type: "number", min: 0 },
    { key: "touchUp", label: "Touch-up", type: "boolean" },
  ],
  DJ: [
    {
      key: "musicStyle",
      label: "Music style",
      type: "text",
      placeholder: "Afrobeats, hip-hop, gospel…",
    },
    { key: "lighting", label: "Lighting package", type: "boolean" },
    { key: "smokeMachine", label: "Smoke machine", type: "boolean" },
    {
      key: "playlistNotes",
      label: "Playlist notes",
      type: "textarea",
      placeholder: "Must-play / do-not-play songs",
    },
  ],
  MC: [
    {
      key: "language",
      label: "Language",
      type: "select",
      options: [
        { value: "english", label: "English" },
        { value: "yoruba", label: "Yoruba" },
        { value: "igbo", label: "Igbo" },
        { value: "hausa", label: "Hausa" },
        { value: "pidgin", label: "Pidgin" },
        { value: "mixed", label: "Mixed" },
      ],
    },
    {
      key: "eventStyle",
      label: "Event style",
      type: "select",
      options: [
        { value: "formal", label: "Formal" },
        { value: "fun", label: "Fun / energetic" },
        { value: "traditional", label: "Traditional" },
      ],
    },
    guestCount,
  ],
  CATERER: [
    guestCount,
    { key: "menuNotes", label: "Menu preferences", type: "textarea" },
    {
      key: "serviceStyle",
      label: "Service style",
      type: "select",
      options: [
        { value: "buffet", label: "Buffet" },
        { value: "table", label: "Table service" },
        { value: "boxed", label: "Boxed / plated takeaway" },
      ],
    },
    {
      key: "specialDiet",
      label: "Special diet / allergies",
      type: "textarea",
      placeholder: "Halal, vegan, nut allergies…",
    },
  ],
  SMALL_CHOPS_CATERING: [
    guestCount,
    { key: "menuNotes", label: "Menu preferences", type: "textarea" },
    {
      key: "specialDiet",
      label: "Special diet / allergies",
      type: "textarea",
    },
  ],
  RENTAL: [
    { key: "rentalItems", label: "Rental items", type: "textarea", required: true },
    { key: "delivery", label: "Delivery required", type: "boolean" },
    { key: "pickup", label: "Pickup required", type: "boolean" },
    { key: "installation", label: "Installation required", type: "boolean" },
  ],
  EVENT_RENTAL: [
    { key: "rentalItems", label: "Rental items", type: "textarea", required: true },
    { key: "delivery", label: "Delivery required", type: "boolean" },
    { key: "pickup", label: "Pickup required", type: "boolean" },
    { key: "installation", label: "Installation required", type: "boolean" },
  ],
  BRIDAL_RENTAL: [
    { key: "rentalItems", label: "Items needed", type: "textarea", required: true },
    { key: "delivery", label: "Delivery required", type: "boolean" },
    { key: "pickup", label: "Pickup / return", type: "boolean" },
  ],
  EVENT_PLANNER: [
    guestCount,
    { key: "budget", label: "Approx. budget (NGN)", type: "number", min: 0 },
    { key: "timeline", label: "Timeline / milestones", type: "textarea" },
    {
      key: "preferredVendors",
      label: "Preferred vendors",
      type: "textarea",
      placeholder: "Vendors you already want included",
    },
  ],
  LIGHTING_SOUND: [
    { key: "lighting", label: "Lighting required", type: "boolean" },
    { key: "smokeMachine", label: "Smoke / effects", type: "boolean" },
    { key: "playlistNotes", label: "Technical notes", type: "textarea" },
  ],
  FLORIST: [
    { key: "theme", label: "Theme", type: "text" },
    { key: "colourPalette", label: "Colour palette", type: "text" },
    { key: "flowers", label: "Flower preferences", type: "textarea" },
  ],
  BALLOON_BACKDROP: [
    { key: "theme", label: "Theme", type: "text" },
    { key: "colourPalette", label: "Colour palette", type: "text" },
    {
      key: "venueType",
      label: "Venue type",
      type: "select",
      options: [
        { value: "hall", label: "Hall" },
        { value: "outdoor", label: "Outdoor" },
        { value: "home", label: "Home" },
        { value: "other", label: "Other" },
      ],
    },
  ],
  BAKER: [
    guestCount,
    { key: "theme", label: "Cake theme / flavour notes", type: "textarea" },
    { key: "delivery", label: "Delivery required", type: "boolean" },
  ],
  BAR_COCKTAIL: [
    guestCount,
    { key: "menuNotes", label: "Bar preferences", type: "textarea" },
    { key: "specialDiet", label: "Non-alcoholic / restrictions", type: "textarea" },
  ],
  WAITERS_USHERS: [guestCount, { key: "timeline", label: "Shift notes", type: "textarea" }],
  SECURITY: [guestCount, { key: "timeline", label: "Coverage notes", type: "textarea" }],
  TRANSPORTATION: [
    guestCount,
    { key: "delivery", label: "Pickup location notes", type: "textarea" },
    { key: "timeline", label: "Route / timing", type: "textarea" },
  ],
  PRINTING_BRANDING: [
    { key: "rentalItems", label: "Items / quantities", type: "textarea", required: true },
    { key: "delivery", label: "Delivery required", type: "boolean" },
  ],
  GIFT_SOUVENIR: [
    guestCount,
    { key: "rentalItems", label: "Gift details", type: "textarea" },
    { key: "delivery", label: "Delivery required", type: "boolean" },
  ],
  FASHION_DESIGNER: [
    { key: "theme", label: "Style notes", type: "textarea" },
    { key: "timeline", label: "Fitting timeline", type: "textarea" },
  ],
};

const DEFAULT_FIELDS: CategoryBookingField[] = [
  guestCount,
  {
    key: "specialRequests",
    label: "Special requests",
    type: "textarea",
    placeholder: "Anything the vendor should know",
  },
];

export function getCategoryBookingFields(
  category: string | null | undefined
): CategoryBookingField[] {
  if (!category) return DEFAULT_FIELDS;
  const key = category as VendorCategoryValue;
  return CATEGORY_BOOKING_FIELDS[key] ?? DEFAULT_FIELDS;
}

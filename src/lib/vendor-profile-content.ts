/**
 * Profile content stored on VendorProfile.metadata (FAQs, requirements, services, areas).
 */

export type ProfileFaq = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
};

export type ServiceRequirement = {
  id: string;
  text: string;
  sortOrder: number;
};

export type ServiceAreaInfo = {
  city?: string;
  state?: string;
  cities?: string[];
  states?: string[];
  serviceRadiusKm?: number | null;
  travelsOutsideCity?: boolean;
  travelsOutsideState?: boolean;
  travelFeePolicy?: string;
  availableNationwide?: boolean;
};

function asRecord(meta: unknown): Record<string, unknown> {
  return meta && typeof meta === "object" && !Array.isArray(meta)
    ? (meta as Record<string, unknown>)
    : {};
}

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeFaqs(raw: unknown): ProfileFaq[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, i) => {
      if (!item || typeof item !== "object") return null;
      const r = item as Record<string, unknown>;
      const question = String(r.question ?? "").trim();
      const answer = String(r.answer ?? "").trim();
      if (!question || !answer) return null;
      return {
        id: String(r.id ?? newId()),
        question,
        answer,
        sortOrder: typeof r.sortOrder === "number" ? r.sortOrder : i,
      };
    })
    .filter((x): x is ProfileFaq => Boolean(x))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function normalizeServiceRequirements(raw: unknown): ServiceRequirement[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, i) => {
      if (typeof item === "string") {
        const text = item.trim();
        if (!text) return null;
        return { id: newId(), text, sortOrder: i };
      }
      if (!item || typeof item !== "object") return null;
      const r = item as Record<string, unknown>;
      const text = String(r.text ?? "").trim();
      if (!text) return null;
      return {
        id: String(r.id ?? newId()),
        text,
        sortOrder: typeof r.sortOrder === "number" ? r.sortOrder : i,
      };
    })
    .filter((x): x is ServiceRequirement => Boolean(x))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function normalizeServicesOffered(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => String(s ?? "").trim())
    .filter(Boolean)
    .filter((s, i, arr) => arr.indexOf(s) === i);
}

export function parseServiceArea(meta: unknown, fallbackCity?: string): ServiceAreaInfo | null {
  const m = asRecord(meta);
  const loc = asRecord(m.location);

  const city = String(loc.city ?? m.city ?? fallbackCity ?? "").trim();
  const state = String(loc.state ?? "").trim();
  const cities = Array.isArray(loc.cities)
    ? loc.cities.map((c) => String(c).trim()).filter(Boolean)
    : city
      ? [city]
      : [];
  const states = Array.isArray(loc.states)
    ? loc.states.map((s) => String(s).trim()).filter(Boolean)
    : state
      ? [state]
      : [];

  const travelsOutsideState = Boolean(loc.travelsOutsideState);
  const travelsOutsideCity = Boolean(loc.travelsOutsideCity);
  const availableNationwide =
    Boolean(loc.availableNationwide) ||
    (travelsOutsideState && String(loc.travelFeePolicy ?? "").toLowerCase().includes("nationwide"));

  if (!cities.length && !states.length && !availableNationwide && !travelsOutsideState) {
    if (fallbackCity) return { city: fallbackCity, cities: [fallbackCity] };
    return null;
  }

  return {
    city: city || undefined,
    state: state || undefined,
    cities,
    states,
    serviceRadiusKm:
      typeof loc.serviceRadiusKm === "number" ? loc.serviceRadiusKm : null,
    travelsOutsideCity,
    travelsOutsideState,
    travelFeePolicy: String(loc.travelFeePolicy ?? "").trim() || undefined,
    availableNationwide,
  };
}

export function extractProfileContent(meta: unknown, fallbackCity?: string) {
  const m = asRecord(meta);
  return {
    faqs: normalizeFaqs(m.faqs),
    serviceRequirements: normalizeServiceRequirements(m.serviceRequirements),
    servicesOffered: normalizeServicesOffered(m.servicesOffered),
    serviceArea: parseServiceArea(meta, fallbackCity),
  };
}

export function emptyFaq(partial?: Partial<ProfileFaq>): ProfileFaq {
  return {
    id: newId(),
    question: "",
    answer: "",
    sortOrder: 0,
    ...partial,
  };
}

export function emptyRequirement(partial?: Partial<ServiceRequirement>): ServiceRequirement {
  return {
    id: newId(),
    text: "",
    sortOrder: 0,
    ...partial,
  };
}

export function reorderById<T extends { id: string; sortOrder: number }>(
  items: T[],
  id: string,
  direction: "up" | "down"
): T[] {
  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
  const idx = sorted.findIndex((i) => i.id === id);
  if (idx < 0) return items;
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= sorted.length) return items;
  const next = [...sorted];
  [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
  return next.map((item, i) => ({ ...item, sortOrder: i }));
}

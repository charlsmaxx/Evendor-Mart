export type VendorPackage = {
  tier: "BASIC" | "PREMIUM" | "LUXURY";
  name: string;
  price: number;
  description: string;
  features: string[];
  enabled: boolean;
};

const TIER_LABELS: Record<VendorPackage["tier"], string> = {
  BASIC: "Basic",
  PREMIUM: "Premium",
  LUXURY: "Luxury",
};

function emptyPackage(tier: VendorPackage["tier"]): VendorPackage {
  return {
    tier,
    name: "",
    price: 0,
    description: "",
    features: [],
    enabled: false,
  };
}

const DEFAULT_PACKAGES: VendorPackage[] = (
  ["BASIC", "PREMIUM", "LUXURY"] as VendorPackage["tier"][]
).map(emptyPackage);

export function normalizePackages(raw: unknown[]): VendorPackage[] {
  const byTier = new Map<string, VendorPackage>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const p = item as Record<string, unknown>;
    const tier = p.tier as VendorPackage["tier"];
    if (!["BASIC", "PREMIUM", "LUXURY"].includes(tier)) continue;
    byTier.set(tier, {
      tier,
      name: String(p.name ?? ""),
      price: Number(p.price) || 0,
      description: String(p.description ?? ""),
      features: Array.isArray(p.features) ? p.features.map(String) : [],
      enabled: p.enabled === true,
    });
  }
  return DEFAULT_PACKAGES.map((d) => byTier.get(d.tier) ?? d);
}

export function getEnabledPackages(metadata: unknown): VendorPackage[] {
  const meta = (metadata as Record<string, unknown>) ?? {};
  const raw = Array.isArray(meta.packages) ? meta.packages : [];
  return normalizePackages(raw).filter((p) => p.enabled && p.price > 0);
}

/**
 * Service packages, add-ons, and cancellation policies.
 * Stored on VendorProfile.metadata.packages — extends the legacy BASIC/PREMIUM/LUXURY shape.
 */

export type PackageBadge = "POPULAR" | "BEST_VALUE" | "PREMIUM" | "NEW";

export type PackageAddOn = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  quantityAllowed: boolean;
  maxQuantity: number;
  active: boolean;
};

export type CancellationWindow = {
  id: string;
  /** Hours before event — upper bound of this window (null = no upper bound / "more than"). */
  moreThanHoursBefore: number | null;
  /** Hours before event — lower bound (inclusive). Use 0 for "until the event". */
  lessThanOrEqualHoursBefore: number;
  refundPercent: number;
  allowCancel: boolean;
  feeAmount: number;
};

export type CancellationPolicyPreset = "FLEXIBLE" | "MODERATE" | "STRICT" | "CUSTOM";

export type CancellationPolicy = {
  preset: CancellationPolicyPreset;
  windows: CancellationWindow[];
  notes?: string;
};

export type VendorPackage = {
  id: string;
  /** Legacy tier key — kept for older profiles. */
  tier?: "BASIC" | "PREMIUM" | "LUXURY";
  name: string;
  shortDescription: string;
  description: string;
  coverImage?: string;
  /** Starting / base price (NGN). */
  price: number;
  fixedPrice?: number | null;
  maxPrice?: number | null;
  estimatedDuration?: string;
  features: string[];
  addOns: PackageAddOn[];
  badge?: PackageBadge | null;
  enabled: boolean;
  cancellationPolicy: CancellationPolicy;
};

export const PACKAGE_BADGE_LABELS: Record<PackageBadge, string> = {
  POPULAR: "Popular",
  BEST_VALUE: "Best Value",
  PREMIUM: "Premium",
  NEW: "New",
};

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function defaultFlexiblePolicy(): CancellationPolicy {
  return {
    preset: "FLEXIBLE",
    windows: [
      {
        id: uid("win"),
        moreThanHoursBefore: 24 * 7,
        lessThanOrEqualHoursBefore: Number.MAX_SAFE_INTEGER,
        refundPercent: 100,
        allowCancel: true,
        feeAmount: 0,
      },
      {
        id: uid("win"),
        moreThanHoursBefore: null,
        lessThanOrEqualHoursBefore: 24 * 7,
        refundPercent: 50,
        allowCancel: true,
        feeAmount: 0,
      },
    ],
  };
}

export function defaultModeratePolicy(): CancellationPolicy {
  return {
    preset: "MODERATE",
    windows: [
      {
        id: uid("win"),
        moreThanHoursBefore: 24 * 30,
        lessThanOrEqualHoursBefore: Number.MAX_SAFE_INTEGER,
        refundPercent: 100,
        allowCancel: true,
        feeAmount: 0,
      },
      {
        id: uid("win"),
        moreThanHoursBefore: 24 * 14,
        lessThanOrEqualHoursBefore: 24 * 30,
        refundPercent: 50,
        allowCancel: true,
        feeAmount: 0,
      },
      {
        id: uid("win"),
        moreThanHoursBefore: 24 * 7,
        lessThanOrEqualHoursBefore: 24 * 14,
        refundPercent: 25,
        allowCancel: true,
        feeAmount: 0,
      },
      {
        id: uid("win"),
        moreThanHoursBefore: null,
        lessThanOrEqualHoursBefore: 24 * 7,
        refundPercent: 0,
        allowCancel: false,
        feeAmount: 0,
      },
    ],
  };
}

export function defaultStrictPolicy(): CancellationPolicy {
  return {
    preset: "STRICT",
    windows: [
      {
        id: uid("win"),
        moreThanHoursBefore: 24 * 30,
        lessThanOrEqualHoursBefore: Number.MAX_SAFE_INTEGER,
        refundPercent: 50,
        allowCancel: true,
        feeAmount: 0,
      },
      {
        id: uid("win"),
        moreThanHoursBefore: null,
        lessThanOrEqualHoursBefore: 24 * 30,
        refundPercent: 0,
        allowCancel: false,
        feeAmount: 0,
      },
    ],
  };
}

export function policyForPreset(preset: CancellationPolicyPreset): CancellationPolicy {
  if (preset === "FLEXIBLE") return defaultFlexiblePolicy();
  if (preset === "STRICT") return defaultStrictPolicy();
  if (preset === "CUSTOM") {
    return { preset: "CUSTOM", windows: defaultModeratePolicy().windows, notes: "" };
  }
  return defaultModeratePolicy();
}

function normalizeWindow(raw: Record<string, unknown>): CancellationWindow | null {
  const refundPercent = Math.min(100, Math.max(0, Number(raw.refundPercent) || 0));
  return {
    id: String(raw.id ?? uid("win")),
    moreThanHoursBefore:
      raw.moreThanHoursBefore == null || raw.moreThanHoursBefore === ""
        ? null
        : Number(raw.moreThanHoursBefore),
    lessThanOrEqualHoursBefore: Number(raw.lessThanOrEqualHoursBefore) || 0,
    refundPercent,
    allowCancel: raw.allowCancel !== false && refundPercent > 0 ? true : raw.allowCancel === true,
    feeAmount: Math.max(0, Number(raw.feeAmount) || 0),
  };
}

export function normalizeCancellationPolicy(raw: unknown): CancellationPolicy {
  if (!raw || typeof raw !== "object") return defaultModeratePolicy();
  const p = raw as Record<string, unknown>;
  const preset = (["FLEXIBLE", "MODERATE", "STRICT", "CUSTOM"].includes(String(p.preset))
    ? String(p.preset)
    : "MODERATE") as CancellationPolicyPreset;
  const windows = Array.isArray(p.windows)
    ? (p.windows as unknown[])
        .map((w) => (w && typeof w === "object" ? normalizeWindow(w as Record<string, unknown>) : null))
        .filter((w): w is CancellationWindow => !!w)
    : [];
  if (windows.length === 0) return policyForPreset(preset);
  return {
    preset,
    windows,
    notes: typeof p.notes === "string" ? p.notes : undefined,
  };
}

function normalizeAddOn(raw: Record<string, unknown>): PackageAddOn {
  return {
    id: String(raw.id ?? uid("addon")),
    name: String(raw.name ?? ""),
    description: String(raw.description ?? ""),
    price: Math.max(0, Number(raw.price) || 0),
    imageUrl: typeof raw.imageUrl === "string" ? raw.imageUrl : undefined,
    quantityAllowed: raw.quantityAllowed === true,
    maxQuantity: Math.max(1, Number(raw.maxQuantity) || 1),
    active: raw.active !== false,
  };
}

export function emptyPackage(partial?: Partial<VendorPackage>): VendorPackage {
  return {
    id: partial?.id ?? uid("pkg"),
    tier: partial?.tier,
    name: partial?.name ?? "",
    shortDescription: partial?.shortDescription ?? "",
    description: partial?.description ?? "",
    coverImage: partial?.coverImage,
    price: partial?.price ?? 0,
    fixedPrice: partial?.fixedPrice ?? null,
    maxPrice: partial?.maxPrice ?? null,
    estimatedDuration: partial?.estimatedDuration ?? "",
    features: partial?.features ?? [],
    addOns: partial?.addOns ?? [],
    badge: partial?.badge ?? null,
    enabled: partial?.enabled ?? false,
    cancellationPolicy: partial?.cancellationPolicy ?? defaultModeratePolicy(),
  };
}

function normalizeOnePackage(item: unknown, index: number): VendorPackage | null {
  if (!item || typeof item !== "object") return null;
  const p = item as Record<string, unknown>;
  const tier = ["BASIC", "PREMIUM", "LUXURY"].includes(String(p.tier))
    ? (p.tier as VendorPackage["tier"])
    : undefined;
  const badgeRaw = String(p.badge ?? "");
  const badge = (["POPULAR", "BEST_VALUE", "PREMIUM", "NEW"].includes(badgeRaw)
    ? badgeRaw
    : null) as PackageBadge | null;

  return emptyPackage({
    id: String(p.id ?? (tier ? `legacy_${tier}` : uid("pkg"))),
    tier,
    name: String(p.name ?? (tier ?? `Package ${index + 1}`)),
    shortDescription: String(p.shortDescription ?? p.description ?? "").slice(0, 160),
    description: String(p.description ?? ""),
    coverImage: typeof p.coverImage === "string" ? p.coverImage : undefined,
    price: Number(p.price) || 0,
    fixedPrice: p.fixedPrice == null || p.fixedPrice === "" ? null : Number(p.fixedPrice),
    maxPrice: p.maxPrice == null || p.maxPrice === "" ? null : Number(p.maxPrice),
    estimatedDuration: typeof p.estimatedDuration === "string" ? p.estimatedDuration : "",
    features: Array.isArray(p.features) ? p.features.map(String) : [],
    addOns: Array.isArray(p.addOns)
      ? (p.addOns as unknown[])
          .filter((a) => a && typeof a === "object")
          .map((a) => normalizeAddOn(a as Record<string, unknown>))
      : [],
    badge,
    enabled: p.enabled === true,
    cancellationPolicy: normalizeCancellationPolicy(p.cancellationPolicy),
  });
}

/** Normalize stored packages. Preserves legacy 3-tier rows and free-form packages. */
export function normalizePackages(raw: unknown[]): VendorPackage[] {
  const parsed = raw
    .map((item, i) => normalizeOnePackage(item, i))
    .filter((p): p is VendorPackage => !!p);

  if (parsed.length === 0) {
    return (["BASIC", "PREMIUM", "LUXURY"] as const).map((tier) =>
      emptyPackage({ id: `legacy_${tier}`, tier, name: tier.charAt(0) + tier.slice(1).toLowerCase() })
    );
  }

  // Preserve vendor-defined order (package editor reorder).
  return parsed;
}

export function getEnabledPackages(metadata: unknown): VendorPackage[] {
  const meta = (metadata as Record<string, unknown>) ?? {};
  const raw = Array.isArray(meta.packages) ? meta.packages : [];
  return normalizePackages(raw).filter((p) => p.enabled && p.price > 0);
}

export function findPackageById(
  metadata: unknown,
  packageId: string | undefined | null
): VendorPackage | null {
  if (!packageId) return null;
  return getEnabledPackages(metadata).find((p) => p.id === packageId) ?? null;
}

export function packageBasePrice(pkg: VendorPackage): number {
  if (pkg.fixedPrice != null && pkg.fixedPrice > 0) return pkg.fixedPrice;
  return pkg.price;
}

export function calcPackageTotal(
  pkg: VendorPackage,
  selectedAddOns: { addOnId: string; quantity: number }[]
): number {
  const base = packageBasePrice(pkg);
  const addOnTotal = selectedAddOns.reduce((sum, sel) => {
    const addOn = pkg.addOns.find((a) => a.id === sel.addOnId && a.active);
    if (!addOn) return sum;
    const qty = Math.min(
      Math.max(1, sel.quantity || 1),
      addOn.quantityAllowed ? addOn.maxQuantity : 1
    );
    return sum + addOn.price * qty;
  }, 0);
  const total = base + addOnTotal;
  if (pkg.maxPrice != null && pkg.maxPrice > 0) return Math.min(total, pkg.maxPrice);
  return total;
}

/** Human-readable cancellation policy lines for UI / contract snapshot. */
export function formatCancellationPolicyLines(policy: CancellationPolicy): string[] {
  const sorted = [...policy.windows].sort(
    (a, b) => b.lessThanOrEqualHoursBefore - a.lessThanOrEqualHoursBefore
  );
  return sorted.map((w) => {
    const hasUpper = w.moreThanHoursBefore != null;
    const upperIsOpen =
      w.lessThanOrEqualHoursBefore >= Number.MAX_SAFE_INTEGER / 2;
    let when: string;
    if (hasUpper && upperIsOpen) {
      when = `More than ${formatHoursBound(w.moreThanHoursBefore!)} before the event`;
    } else if (hasUpper) {
      when = `Between ${formatHoursBound(w.moreThanHoursBefore!)} and ${formatHoursBound(w.lessThanOrEqualHoursBefore)} before the event`;
    } else {
      when = `Less than ${formatHoursBound(w.lessThanOrEqualHoursBefore)} before the event`;
    }
    if (!w.allowCancel || w.refundPercent <= 0) {
      return `${when}: Cancellation not permitted / no refund.`;
    }
    const fee =
      w.feeAmount > 0 ? ` (cancellation fee ${w.feeAmount.toLocaleString("en-NG")} NGN)` : "";
    return `${when}: ${w.refundPercent}% refund${fee}.`;
  });
}

function formatHoursBound(hours: number): string {
  if (hours >= 24 * 30 && hours % (24 * 30) === 0) {
    const m = hours / (24 * 30);
    return `${m} month${m === 1 ? "" : "s"}`;
  }
  if (hours >= 24 && hours % 24 === 0) {
    const d = hours / 24;
    return `${d} day${d === 1 ? "" : "s"}`;
  }
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

export type CancellationEval = {
  allowCancel: boolean;
  refundPercent: number;
  feeAmount: number;
  window: CancellationWindow | null;
  hoursUntilEvent: number;
  message: string;
};

/** Pick the matching cancellation window for now vs eventDate. */
export function evaluateCancellationPolicy(
  policy: CancellationPolicy | null | undefined,
  eventDate: Date,
  now = new Date()
): CancellationEval {
  const effective = policy ? normalizeCancellationPolicy(policy) : defaultModeratePolicy();
  const hoursUntilEvent = Math.max(0, (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60));

  const match =
    effective.windows.find((w) => {
      const aboveMin =
        w.moreThanHoursBefore == null ? true : hoursUntilEvent > w.moreThanHoursBefore;
      const belowMax = hoursUntilEvent <= w.lessThanOrEqualHoursBefore;
      return aboveMin && belowMax;
    }) ??
    effective.windows.find((w) => w.moreThanHoursBefore == null) ??
    null;

  if (!match) {
    return {
      allowCancel: false,
      refundPercent: 0,
      feeAmount: 0,
      window: null,
      hoursUntilEvent,
      message:
        "This booking can no longer be cancelled because the vendor's cancellation window has expired.",
    };
  }

  if (!match.allowCancel || match.refundPercent <= 0) {
    return {
      allowCancel: false,
      refundPercent: 0,
      feeAmount: match.feeAmount,
      window: match,
      hoursUntilEvent,
      message:
        "This booking can no longer be cancelled because the vendor's cancellation window has expired.",
    };
  }

  return {
    allowCancel: true,
    refundPercent: match.refundPercent,
    feeAmount: match.feeAmount,
    window: match,
    hoursUntilEvent,
    message: `You can cancel now for a ${match.refundPercent}% refund${
      match.feeAmount > 0 ? ` minus a ${match.feeAmount.toLocaleString("en-NG")} NGN fee` : ""
    }.`,
  };
}

export function computeCancelAmounts(opts: {
  paidAmount: number;
  refundPercent: number;
  feeAmount: number;
}) {
  const gross = Math.floor((opts.paidAmount * opts.refundPercent) / 100);
  const refundAmount = Math.max(0, gross - opts.feeAmount);
  const vendorRetain = Math.max(0, opts.paidAmount - refundAmount);
  return { refundAmount, vendorRetain, feeAmount: opts.feeAmount };
}

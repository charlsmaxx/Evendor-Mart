import type { AdminRole } from "@prisma/client";

export type AdminSection =
  | "dashboard"
  | "bookings"
  | "listings"
  | "vendors"
  | "users"
  | "verification"
  | "trust"
  | "escrow"
  | "reconciliation"
  | "rewards"
  | "messages"
  | "analytics"
  | "audit"
  | "roles";

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: "Super Admin",
  FINANCE: "Finance",
  SUPPORT: "Support",
  MODERATOR: "Moderator",
};

export const ADMIN_ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  SUPER_ADMIN: "Full platform access including role management",
  FINANCE: "Escrow, payouts, reconciliation, rewards, analytics",
  SUPPORT: "Bookings, customers, messages, disputes",
  MODERATOR: "Listings, vendors, verification, trust & audit",
};

const ROLE_SECTIONS: Record<AdminRole, AdminSection[]> = {
  SUPER_ADMIN: [
    "dashboard",
    "bookings",
    "listings",
    "vendors",
    "users",
    "verification",
    "trust",
    "escrow",
    "reconciliation",
    "rewards",
    "messages",
    "analytics",
    "audit",
    "roles",
  ],
  FINANCE: ["dashboard", "escrow", "reconciliation", "rewards", "analytics"],
  SUPPORT: ["dashboard", "bookings", "users", "messages", "trust"],
  MODERATOR: ["dashboard", "listings", "vendors", "verification", "trust", "audit"],
};

/** Bootstrap super admins from ADMIN_EMAILS when adminRole is unset in DB. */
function isBootstrapSuperAdminEmail(email: string): boolean {
  const allowlist = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.toLowerCase());
}

type AdminUserLike = {
  role: string;
  adminRole?: AdminRole | null;
  email?: string;
};

export function getEffectiveAdminRole(user: AdminUserLike): AdminRole | null {
  if (user.role !== "ADMIN") return null;
  if (user.adminRole) return user.adminRole;
  if (user.email && isBootstrapSuperAdminEmail(user.email)) return "SUPER_ADMIN";
  return "MODERATOR";
}

export function canAccessAdminSection(user: AdminUserLike, section: AdminSection) {
  const adminRole = getEffectiveAdminRole(user);
  if (!adminRole) return false;
  return ROLE_SECTIONS[adminRole].includes(section);
}

export function getAdminSections(user: AdminUserLike): AdminSection[] {
  const adminRole = getEffectiveAdminRole(user);
  if (!adminRole) return [];
  return ROLE_SECTIONS[adminRole];
}

/** Platform-wide revenue totals (analytics section). */
export function canViewPlatformRevenue(user: AdminUserLike): boolean {
  return canAccessAdminSection(user, "analytics");
}

/** Escrow balance totals (escrow section). */
export function canViewEscrowTotals(user: AdminUserLike): boolean {
  return canAccessAdminSection(user, "escrow");
}

export function hrefToAdminSection(href: string): AdminSection {
  if (href === "/admin") return "dashboard";
  if (href.startsWith("/admin/reconciliation")) return "reconciliation";
  if (href.startsWith("/admin/bookings")) return "bookings";
  if (href.startsWith("/admin/listings")) return "listings";
  if (href.startsWith("/admin/vendors")) return "vendors";
  if (href.startsWith("/admin/users")) return "users";
  if (href.startsWith("/admin/verification")) return "verification";
  if (href.startsWith("/admin/trust")) return "trust";
  if (href.startsWith("/admin/escrow")) return "escrow";
  if (href.startsWith("/admin/rewards")) return "rewards";
  if (href.startsWith("/admin/messages")) return "messages";
  if (href.startsWith("/admin/analytics")) return "analytics";
  if (href.startsWith("/admin/audit")) return "audit";
  if (href.startsWith("/admin/team")) return "roles";
  return "dashboard";
}

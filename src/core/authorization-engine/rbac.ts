import { UserRole } from "@prisma/client";
import { prisma } from "@/core/infrastructure/prisma";
import type { AdminSection } from "@/core/authorization-engine/permissions";
import { canAccessAdminSection, getEffectiveAdminRole } from "@/core/authorization-engine/permissions";

export type DbUser = NonNullable<Awaited<ReturnType<typeof getDbUser>>>;

export async function getDbUser(userId: string) {
  return prisma.user.findUnique({ where: { id: userId } });
}

export function hasRole(role: UserRole, allowed: UserRole[]) {
  return allowed.includes(role);
}

/** Comma-separated emails in ADMIN_EMAILS get admin access (dev / bootstrap). */
export function isAdminEmail(email: string): boolean {
  const allowlist = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.toLowerCase());
}

export function isAdminUser(user: { role: UserRole; email: string }) {
  return user.role === "ADMIN" || isAdminEmail(user.email);
}

/** Promote allowlisted email to ADMIN in DB (one-time sync). */
export async function ensureAdminRole(user: { id: string; email: string; role: UserRole }) {
  if (user.role === "ADMIN") return user;
  if (!isAdminEmail(user.email)) return user;
  return prisma.user.update({
    where: { id: user.id },
    data: { role: "ADMIN" },
  });
}

export async function requireRole(userId: string, allowed: UserRole[]) {
  const user = await getDbUser(userId);
  if (!user) throw new Error("UNAUTHORIZED");
  if (allowed.includes("ADMIN") && isAdminUser(user)) return user;
  if (!hasRole(user.role, allowed)) throw new Error("FORBIDDEN");
  return user;
}

function resolveAdminUser(userOrId: DbUser | string): Promise<DbUser | null> {
  return typeof userOrId === "string" ? getDbUser(userOrId) : Promise.resolve(userOrId);
}

/** Pass the user from requireAuth() to avoid a duplicate DB lookup. */
export async function requireAdminSection(
  userOrId: DbUser | string,
  section: AdminSection
): Promise<DbUser> {
  const user = await resolveAdminUser(userOrId);
  if (!user || !isAdminUser(user)) throw new Error("FORBIDDEN");
  if (!canAccessAdminSection(user, section)) throw new Error("FORBIDDEN");
  return user;
}

export async function requireSuperAdmin(userOrId: DbUser | string): Promise<DbUser> {
  const user = await resolveAdminUser(userOrId);
  if (!user || !isAdminUser(user)) throw new Error("FORBIDDEN");
  if (getEffectiveAdminRole(user) !== "SUPER_ADMIN") throw new Error("FORBIDDEN");
  return user;
}

export async function requireVendorOwnership(userId: string, vendorId: string) {
  const profile = await prisma.vendorProfile.findFirst({
    where: { id: vendorId, userId },
  });
  if (!profile) throw new Error("FORBIDDEN");
  return profile;
}

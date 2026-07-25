import { redirect } from "next/navigation";
import { requireAuth } from "@/core/identity-engine";
import { requireAdminSection } from "@/core/authorization-engine/rbac";
import type { AdminSection } from "@/core/authorization-engine/permissions";

/** Server-side guard for admin pages — enforces granular section RBAC. */
export async function requireAdminPage(section: AdminSection) {
  const user = await requireAuth();
  if (!user) redirect("/login?redirect=/admin");
  try {
    await requireAdminSection(user, section);
  } catch {
    redirect("/admin?forbidden=1");
  }
  return user;
}

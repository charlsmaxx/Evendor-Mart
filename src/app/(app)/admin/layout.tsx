import { requireAuth } from "@/lib/auth";
import { ensureAdminRole, isAdminUser, getDbUser } from "@/lib/rbac";
import { canAccessAdminSection, hrefToAdminSection } from "@/lib/admin-permissions";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();
  if (!user) redirect("/login?redirect=/admin");

  if (!isAdminUser(user)) {
    redirect("/marketplace");
  }

  await ensureAdminRole(user).catch(() => {});

  const pathname = (await headers()).get("x-pathname") ?? "/admin";
  const section = hrefToAdminSection(pathname);
  const dbUser = await getDbUser(user.id);
  if (dbUser && !canAccessAdminSection(dbUser, section)) {
    redirect("/admin?forbidden=1");
  }

  return <AdminShell>{children}</AdminShell>;
}

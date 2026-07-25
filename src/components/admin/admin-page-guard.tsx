import type { AdminSection } from "@/core/authorization-engine/permissions";
import { requireAdminPage } from "@/core/authorization-engine/admin-page-guard";

type AdminPageGuardProps = {
  section: AdminSection;
  children: React.ReactNode;
};

/** Wrap admin page content to enforce section RBAC on the server. */
export async function AdminPageGuard({ section, children }: AdminPageGuardProps) {
  await requireAdminPage(section);
  return <>{children}</>;
}

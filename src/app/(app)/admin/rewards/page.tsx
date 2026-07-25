import { requireAuth } from "@/lib/auth";
import { requireRole } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { AdminLegacyWrap } from "@/components/admin/admin-legacy-wrap";
import { AdminRewardsPanel } from "@/components/admin/admin-rewards-panel";

export default async function AdminRewardsPage() {
  const user = await requireAuth();
  if (!user) redirect("/login");
  try {
    await requireRole(user.id, ["ADMIN"]);
  } catch {
    redirect("/marketplace");
  }

  return (
    <AdminLegacyWrap>
      <AdminRewardsPanel />
    </AdminLegacyWrap>
  );
}

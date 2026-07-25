import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { isAdminUser } from "@/lib/rbac";
import { getEffectiveAdminRole, getAdminSections, ADMIN_ROLE_LABELS } from "@/lib/admin-permissions";

export async function GET() {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);
  if (!isAdminUser(user)) return jsonError("Forbidden", 403);

  const adminRole = getEffectiveAdminRole(user);
  return jsonOk({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    adminRole,
    adminRoleLabel: adminRole ? ADMIN_ROLE_LABELS[adminRole] : null,
    sections: getAdminSections(user),
    isSuperAdmin: adminRole === "SUPER_ADMIN",
  });
}

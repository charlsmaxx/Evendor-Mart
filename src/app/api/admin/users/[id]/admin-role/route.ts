import { NextRequest } from "next/server";
import type { AdminRole } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/rbac";
import { jsonOk, jsonError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/core/audit-engine";
import { ADMIN_ROLE_LABELS } from "@/lib/admin-permissions";

const adminRoleEnum = z.enum(["SUPER_ADMIN", "FINANCE", "SUPPORT", "MODERATOR"]);

const schema = z
  .object({
    adminRole: adminRoleEnum.nullable().optional(),
    promoteToAdmin: z.boolean().optional(),
    revokeAdminAccess: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.revokeAdminAccess) return;

    if (data.promoteToAdmin) {
      if (!data.adminRole) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select an admin role when promoting a user",
          path: ["adminRole"],
        });
      }
      return;
    }

    if (data.adminRole === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "adminRole is required",
        path: ["adminRole"],
      });
    }
  });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);
  try {
    await requireSuperAdmin(user);
  } catch {
    return jsonError("Only super admins can assign admin roles", 403);
  }

  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return jsonError("User not found", 404);

  if (parsed.data.revokeAdminAccess) {
    if (target.role !== "ADMIN") {
      return jsonError("User is not an admin", 400);
    }
    if (target.id === user.id) {
      return jsonError("You cannot revoke your own admin access", 400);
    }
    const updated = await prisma.user.update({
      where: { id },
      data: { role: "CUSTOMER", adminRole: null },
      select: { id: true, email: true, fullName: true, role: true, adminRole: true },
    });
    await writeAuditLog({
      actorId: user.id,
      action: "ADMIN_ACCESS_REVOKED",
      entityType: "User",
      entityId: id,
      metadata: { email: target.email },
    });
    return jsonOk(updated);
  }

  const promote = parsed.data.promoteToAdmin === true;
  if (!promote && target.role !== "ADMIN") {
    return jsonError("User must be promoted to admin first", 400);
  }
  if (promote && !parsed.data.adminRole) {
    return jsonError("Select an admin role when promoting a user", 400);
  }

  const adminRoleToSave: AdminRole | null =
    parsed.data.adminRole === undefined || parsed.data.adminRole === null
      ? "SUPER_ADMIN"
      : parsed.data.adminRole;

  if (
    target.id === user.id &&
    adminRoleToSave !== "SUPER_ADMIN"
  ) {
    return jsonError("You cannot demote your own super admin access", 400);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(promote ? { role: "ADMIN" as const } : {}),
      adminRole: adminRoleToSave,
    },
    select: { id: true, email: true, fullName: true, role: true, adminRole: true },
  });

  await writeAuditLog({
    actorId: user.id,
    action: promote ? "ADMIN_ACCESS_GRANTED" : "ADMIN_ROLE_UPDATED",
    entityType: "User",
    entityId: id,
    metadata: {
      adminRole: adminRoleToSave,
      label: ADMIN_ROLE_LABELS[adminRoleToSave],
      promoted: promote,
      previousRole: target.role,
    },
  });

  return jsonOk(updated);
}

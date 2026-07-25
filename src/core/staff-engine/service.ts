import "server-only";
import type { VendorStaffRole } from "@prisma/client";
import { prisma } from "@/core/infrastructure/prisma";

export type StaffPermissions = {
  viewCalendar: boolean;
  createManualBooking: boolean;
  manageCustomers: boolean;
  viewReports: boolean;
  manageBilling: boolean;
};

export const DEFAULT_STAFF_PERMISSIONS: Record<VendorStaffRole, StaffPermissions> = {
  MANAGER: {
    viewCalendar: true,
    createManualBooking: true,
    manageCustomers: true,
    viewReports: true,
    manageBilling: false,
  },
  RECEPTIONIST: {
    viewCalendar: true,
    createManualBooking: true,
    manageCustomers: true,
    viewReports: false,
    manageBilling: false,
  },
  ASSISTANT: {
    viewCalendar: true,
    createManualBooking: false,
    manageCustomers: true,
    viewReports: false,
    manageBilling: false,
  },
  OPERATIONS: {
    viewCalendar: true,
    createManualBooking: true,
    manageCustomers: false,
    viewReports: true,
    manageBilling: false,
  },
};

export function parseStaffPermissions(
  role: VendorStaffRole,
  raw?: unknown
): StaffPermissions {
  const defaults = DEFAULT_STAFF_PERMISSIONS[role];
  if (!raw || typeof raw !== "object") return defaults;
  const p = raw as Partial<StaffPermissions>;
  return {
    viewCalendar: p.viewCalendar ?? defaults.viewCalendar,
    createManualBooking: p.createManualBooking ?? defaults.createManualBooking,
    manageCustomers: p.manageCustomers ?? defaults.manageCustomers,
    viewReports: p.viewReports ?? defaults.viewReports,
    manageBilling: p.manageBilling ?? defaults.manageBilling,
  };
}

export async function listVendorStaff(vendorId: string) {
  return prisma.vendorStaff.findMany({
    where: { vendorId },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, email: true, fullName: true } } },
  });
}

export async function inviteVendorStaff(input: {
  vendorId: string;
  email: string;
  fullName: string;
  role: VendorStaffRole;
  permissions?: Partial<StaffPermissions>;
}) {
  const permissions = {
    ...DEFAULT_STAFF_PERMISSIONS[input.role],
    ...input.permissions,
  };
  return prisma.vendorStaff.upsert({
    where: {
      vendorId_email: { vendorId: input.vendorId, email: input.email.toLowerCase() },
    },
    create: {
      vendorId: input.vendorId,
      email: input.email.toLowerCase(),
      fullName: input.fullName,
      role: input.role,
      permissions,
    },
    update: {
      fullName: input.fullName,
      role: input.role,
      permissions,
    },
  });
}

export async function getStaffAccessForUser(userId: string, vendorId: string) {
  const staff = await prisma.vendorStaff.findFirst({
    where: { vendorId, userId, acceptedAt: { not: null } },
  });
  if (!staff) return null;
  return {
    staff,
    permissions: parseStaffPermissions(staff.role, staff.permissions),
  };
}

export async function assertStaffPermission(
  userId: string,
  vendorId: string,
  permission: keyof StaffPermissions
) {
  const owner = await prisma.vendorProfile.findFirst({
    where: { id: vendorId, userId },
  });
  if (owner) return true;

  const access = await getStaffAccessForUser(userId, vendorId);
  if (!access?.permissions[permission]) {
    throw new Error("FORBIDDEN");
  }
  return true;
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonNoStore, jsonError, handleApiRoute, jsonOk } from "@/lib/api-response";
import { createServiceClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/core/audit-engine";

const updateMeSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export async function GET() {
  return handleApiRoute(async () => {
    const user = await requireAuth();
    if (!user) return jsonError("Unauthorized", 401);

    let isVendor = false;
    try {
      const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } });
      isVendor = user.role === "VENDOR" && !!vendor;
    } catch {
      /* vendor lookup optional */
    }

    return jsonNoStore({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
      onboardingComplete: user.onboardingComplete,
      isVendor,
    });
  });
}

export async function PATCH(req: NextRequest) {
  return handleApiRoute(async () => {
    const user = await requireAuth();
    if (!user) return jsonError("Unauthorized", 401);

    const parsed = updateMeSchema.safeParse(await req.json());
    if (!parsed.success) return jsonError(parsed.error.message, 400);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(parsed.data.fullName !== undefined ? { fullName: parsed.data.fullName.trim() } : {}),
        ...(parsed.data.avatarUrl !== undefined ? { avatarUrl: parsed.data.avatarUrl } : {}),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        avatarUrl: true,
        role: true,
      },
    });

    return jsonNoStore(updated);
  });
}

export async function DELETE() {
  return handleApiRoute(async () => {
    const user = await requireAuth();
    if (!user) return jsonError("Unauthorized", 401);

    const userId = user.id;
    const email = user.email;

    await writeAuditLog({
      actorId: userId,
      action: "ACCOUNT_DELETE_REQUESTED",
      entityType: "User",
      entityId: userId,
      metadata: { email },
    });

    // Remove app data first (cascades related records).
    await prisma.user.delete({ where: { id: userId } });

    try {
      const admin = await createServiceClient();
      await admin.auth.admin.deleteUser(userId);
    } catch (e) {
      console.error("[Evendor:account-delete] Supabase auth delete failed", e);
      // Prisma user is already gone; client will sign out regardless.
    }

    return jsonOk({ deleted: true });
  });
}

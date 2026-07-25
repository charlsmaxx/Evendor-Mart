import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { requireAdminSection } from "@/lib/rbac";
import { jsonOk, jsonError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { writeAuditLog } from "@/core/audit-engine";
import { emitDomainEvent } from "@/core/events";

const schema = z.object({
  action: z.enum(["APPROVE", "REJECT", "REQUEST_MORE"]),
  adminNotes: z.string().max(500).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);
  try {
    await requireAdminSection(user, "verification");
  } catch {
    return jsonError("Forbidden", 403);
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const verReq = await prisma.verificationRequest.findUnique({ where: { id } });
  if (!verReq) return jsonError("Verification request not found", 404);

  const newStatus =
    parsed.data.action === "APPROVE"
      ? "VERIFIED"
      : parsed.data.action === "REJECT"
        ? "REJECTED"
        : "PENDING";

  await prisma.$transaction(async (tx) => {
    await tx.verificationRequest.update({
      where: { id },
      data: {
        status: newStatus,
        adminNotes: parsed.data.adminNotes,
        reviewedById: user.id,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    await tx.vendorProfile.update({
      where: { id: verReq.vendorId },
      data: {
        verificationStatus: newStatus,
        verified: newStatus === "VERIFIED",
        updatedAt: new Date(),
      },
    });
    await writeAuditLog(
      {
        actorId: user.id,
        action: `VERIFICATION_${parsed.data.action}`,
        entityType: "VerificationRequest",
        entityId: id,
        metadata: { vendorId: verReq.vendorId, adminNotes: parsed.data.adminNotes },
      },
      tx
    );
  });

  if (newStatus === "VERIFIED") {
    await emitDomainEvent({
      type: "VerificationApproved",
      payload: { vendorId: verReq.vendorId, verificationId: id },
    });
  } else {
    await emitDomainEvent({
      type: "VerificationStatusChanged",
      payload: {
        vendorId: verReq.vendorId,
        status: newStatus,
        adminNotes: parsed.data.adminNotes,
      },
    });
  }

  return jsonOk({ action: parsed.data.action, newStatus });
}

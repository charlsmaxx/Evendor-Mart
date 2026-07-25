import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/core/audit-engine";
import { z } from "zod";

export async function GET() {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } });
  if (!vendor) return jsonError("Vendor not found", 404);

  const disputes = await prisma.dispute.findMany({
    where: { booking: { vendorId: vendor.id } },
    include: {
      booking: {
        select: {
          id: true,
          eventDate: true,
          totalAmount: true,
          listing: { select: { title: true } },
          customer: { select: { fullName: true } },
        },
      },
      evidence: { select: { id: true, url: true, caption: true, createdAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return jsonOk(
    disputes.map((d) => ({
      id: d.id,
      status: d.status,
      reason: d.reason,
      resolution: d.resolution,
      adminNotes: d.adminNotes,
      createdAt: d.createdAt.toISOString(),
      resolvedAt: d.resolvedAt?.toISOString() ?? null,
      booking: d.booking,
      evidence: d.evidence,
    }))
  );
}

const evidenceSchema = z.object({
  disputeId: z.string().uuid(),
  url: z.string().url(),
  publicId: z.string().optional(),
  caption: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } });
  if (!vendor) return jsonError("Vendor not found", 404);

  const parsed = evidenceSchema.safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const dispute = await prisma.dispute.findFirst({
    where: { id: parsed.data.disputeId, booking: { vendorId: vendor.id } },
  });
  if (!dispute) return jsonError("Dispute not found", 404);

  const evidence = await prisma.disputeEvidence.create({
    data: {
      disputeId: parsed.data.disputeId,
      uploadedById: user.id,
      url: parsed.data.url,
      publicId: parsed.data.publicId,
      caption: parsed.data.caption,
    },
  });

  await writeAuditLog({
    actorId: user.id,
    action: "DISPUTE_EVIDENCE_UPLOADED",
    entityType: "Dispute",
    entityId: dispute.id,
  });

  return jsonOk(evidence, 201);
}

import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/core/audit-engine";
import { z } from "zod";

const evidenceSchema = z.object({
  url: z.string().url(),
  publicId: z.string().optional(),
  caption: z.string().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const { id: bookingId } = await params;
  const parsed = evidenceSchema.safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { dispute: true },
  });
  if (!booking) return jsonError("Booking not found", 404);
  if (booking.customerId !== user.id) return jsonError("Forbidden", 403);
  if (!booking.dispute) return jsonError("No dispute on this booking", 400);
  if (booking.dispute.status !== "OPEN") {
    return jsonError("Dispute is no longer open", 400);
  }

  const evidence = await prisma.disputeEvidence.create({
    data: {
      disputeId: booking.dispute.id,
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
    entityId: booking.dispute.id,
    metadata: { role: "customer" },
  });

  return jsonOk(evidence, 201);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const { id: bookingId } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      dispute: {
        include: {
          evidence: { orderBy: { createdAt: "desc" } },
        },
      },
    },
  });
  if (!booking) return jsonError("Not found", 404);
  if (booking.customerId !== user.id && user.role !== "ADMIN") {
    return jsonError("Forbidden", 403);
  }

  return jsonOk(booking.dispute?.evidence ?? []);
}

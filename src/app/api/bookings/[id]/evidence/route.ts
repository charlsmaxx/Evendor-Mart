import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/core/audit-engine";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { appendVendorEvidence, getVendorEvidence } from "@/lib/booking-evidence";
import { z } from "zod";

const evidenceSchema = z.object({
  url: z.string().url(),
  publicId: z.string().optional(),
  caption: z.string().max(500).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { vendor: { select: { userId: true } } },
  });
  if (!booking) return jsonError("Not found", 404);

  const isVendor = booking.vendor.userId === user.id;
  const isCustomer = booking.customerId === user.id;
  if (!isVendor && !isCustomer && user.role !== "ADMIN") {
    return jsonError("Forbidden", 403);
  }

  return jsonOk(getVendorEvidence(booking.bookingSnapshot));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const parsed = evidenceSchema.safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { vendor: { select: { userId: true, id: true } } },
  });
  if (!booking) return jsonError("Not found", 404);
  if (booking.vendor.userId !== user.id && user.role !== "ADMIN") {
    return jsonError("Only the vendor can upload booking evidence", 403);
  }

  const snapshot = appendVendorEvidence(booking.bookingSnapshot, parsed.data);

  const updated = await prisma.booking.update({
    where: { id },
    data: { bookingSnapshot: snapshot },
  });

  await writeAuditLog({
    actorId: user.id,
    action: "BOOKING_EVIDENCE_UPLOADED",
    entityType: "Booking",
    entityId: id,
    metadata: { url: parsed.data.url },
  });

  return jsonOk(getVendorEvidence(updated.bookingSnapshot), 201);
}

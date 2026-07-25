/**
 * POST /api/reviews
 * Only customers with a COMPLETED booking for the listing can submit a review.
 * One review per booking.
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/core/audit-engine";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { z } from "zod";

const schema = z.object({
  listingId: z.string().uuid(),
  bookingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const { listingId, bookingId, rating, comment } = parsed.data;

  // ── Gate: customer must have a COMPLETED booking for this listing ──
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, customerId: true, listingId: true, status: true },
  });

  if (!booking) return jsonError("Booking not found", 404);
  if (booking.customerId !== user.id) return jsonError("Forbidden", 403);
  if (booking.listingId !== listingId) return jsonError("Booking does not match listing", 400);
  if (booking.status !== "COMPLETED") {
    return jsonError(
      "You can only review a listing after your event is completed.",
      403
    );
  }

  // ── One review per booking ──────────────────────────────────────────
  const existing = await prisma.review.findFirst({
    where: { userId: user.id, listingId },
  });
  if (existing) return jsonError("You have already reviewed this listing.", 409);

  const review = await prisma.review.create({
    data: {
      listingId,
      userId: user.id,
      bookingId,
      rating,
      comment,
    },
  });

  // Update listing rating average
  const agg = await prisma.review.aggregate({
    where: { listingId },
    _avg: { rating: true },
    _count: true,
  });
  await prisma.listing.update({
    where: { id: listingId },
    data: { ratingAvg: agg._avg.rating ?? 0, reviewCount: agg._count },
  });

  await writeAuditLog({
    actorId: user.id,
    action: "REVIEW_CREATED",
    entityType: "Review",
    entityId: review.id,
    metadata: { listingId, bookingId, rating },
  });

  return jsonOk(review, 201);
}

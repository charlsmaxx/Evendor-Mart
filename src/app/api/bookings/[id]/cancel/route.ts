import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { cancelBookingSchema } from "@/lib/validations/booking";
import { cancelBooking, BookingCancelError } from "@/lib/booking-engine";
import {
  computeCancelAmounts,
  defaultModeratePolicy,
  evaluateCancellationPolicy,
  normalizeCancellationPolicy,
} from "@/lib/vendor-packages";

function userIsAdmin(user: { role: string }) {
  return user.role === "ADMIN" || user.role === "SUPER_ADMIN";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const parsed = cancelBookingSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  try {
    const result = await cancelBooking({
      bookingId: id,
      actorUserId: user.id,
      reason: parsed.data.reason,
      adminOverride: userIsAdmin(user) && parsed.data.adminOverride === true,
    });
    return jsonOk(result);
  } catch (err) {
    if (err instanceof BookingCancelError) {
      const status = err.message === "Forbidden" ? 403 : 409;
      return jsonError(err.message, status);
    }
    throw err;
  }
}

/** Preview cancel amounts without mutating — used by customer UI. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      payments: true,
      vendor: { select: { userId: true } },
    },
  });
  if (!booking) return jsonError("Booking not found", 404);
  if (
    booking.customerId !== user.id &&
    booking.vendor.userId !== user.id &&
    !userIsAdmin(user)
  ) {
    return jsonError("Forbidden", 403);
  }

  const snap = booking.bookingSnapshot as { cancellationPolicy?: unknown } | null;
  const policy = snap?.cancellationPolicy
    ? normalizeCancellationPolicy(snap.cancellationPolicy)
    : defaultModeratePolicy();
  const evaluation = evaluateCancellationPolicy(policy, booking.eventDate);
  const paid =
    booking.payments.find((p) => p.status === "SUCCESS")?.amount ??
    (["RESERVED", "PENDING_PAYMENT"].includes(booking.status) ? 0 : booking.depositAmount);
  const amounts = computeCancelAmounts({
    paidAmount: paid,
    refundPercent: evaluation.refundPercent,
    feeAmount: evaluation.feeAmount,
  });

  return jsonOk({
    ...evaluation,
    ...amounts,
    paidAmount: paid,
    status: booking.status,
    canCancelUi:
      evaluation.allowCancel &&
      !booking.completionConfirmedAt &&
      !["CANCELLED", "DECLINED", "EXPIRED", "COMPLETED"].includes(booking.status),
  });
}

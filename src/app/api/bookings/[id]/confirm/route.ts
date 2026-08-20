import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { EscrowRuleError, releaseEscrow } from "@/lib/escrow";
import { getCustomerBookingActions } from "@/lib/booking-customer-actions";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { dispute: { select: { status: true } } },
  });
  if (!booking) return jsonError("Booking not found", 404);
  if (booking.customerId !== user.id) return jsonError("Forbidden", 403);
  if (!["CONFIRMED", "IN_PROGRESS"].includes(booking.status)) {
    return jsonError("Booking cannot be confirmed at this stage", 400);
  }
  if (booking.dispute?.status === "OPEN" || booking.dispute?.status === "UNDER_REVIEW") {
    return jsonError("This booking has an open dispute. Support will resolve it.", 409);
  }

  const actions = getCustomerBookingActions(booking);
  if (!actions.canConfirm) {
    return jsonError(
      "You can approve after the vendor marks delivery complete or the event date has passed.",
      409
    );
  }

  try {
    await releaseEscrow(id, user.id, { source: "customer_confirm" });
  } catch (err) {
    if (err instanceof EscrowRuleError) return jsonError(err.message, 409);
    throw err;
  }

  return jsonOk({
    message:
      "Thank you! Earnings are now available for the vendor to withdraw after settlement checks.",
  });
}

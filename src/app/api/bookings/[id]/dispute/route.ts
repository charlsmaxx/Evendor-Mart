import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiRoute } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { EscrowRuleError, openDispute, cancelDispute } from "@/lib/escrow";
import { isOpenDispute } from "@/lib/booking-customer-actions";
import { z } from "zod";

const schema = z.object({
  reason: z
    .string()
    .min(10, "Please describe the issue in at least 10 characters.")
    .max(1000),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApiRoute(async () => {
  const { id } = await params;
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    select: { customerId: true, dispute: { select: { status: true } } },
  });
  if (!booking) return jsonError("Booking not found", 404);
  if (booking.customerId !== user.id) return jsonError("Forbidden", 403);
  if (isOpenDispute(booking.dispute)) {
    return jsonError("A dispute is already open for this booking.", 409);
  }

  try {
    await openDispute(id, user.id, parsed.data.reason);
  } catch (err) {
    if (err instanceof EscrowRuleError) return jsonError(err.message, 409);
    console.error("[Evendor:booking-dispute]", err);
    return jsonError("We couldn't open this dispute right now. Please try again.", 500);
  }

  return jsonOk({
    message:
      "Dispute opened. Your payment stays locked until our team resolves it, usually within 24–48 hours. Please upload evidence and check your chat with the vendor for an Evendor Admin notice.",
  });
  }, { route: "/api/bookings/[id]/dispute" });
}

/** Customer withdraws an open dispute they filed. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApiRoute(async () => {
  const { id } = await params;
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  try {
    await cancelDispute(id, user.id);
  } catch (err) {
    if (err instanceof EscrowRuleError) return jsonError(err.message, 409);
    console.error("[Evendor:booking-dispute-cancel]", err);
    return jsonError("We couldn't cancel this dispute right now. Please try again.", 500);
  }

  return jsonOk({
    message:
      "Dispute cancelled. Your payment remains locked until you confirm the job is done or the automatic release window ends.",
  });
  }, { route: "/api/bookings/[id]/dispute" });
}

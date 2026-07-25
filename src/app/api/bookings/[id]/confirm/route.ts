import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { EscrowRuleError, releaseEscrow } from "@/lib/escrow";

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
  if (booking.dispute?.status === "OPEN") {
    return jsonError("This booking has an open dispute. Support will resolve it.", 409);
  }

  try {
    await releaseEscrow(id, user.id);
  } catch (err) {
    if (err instanceof EscrowRuleError) return jsonError(err.message, 409);
    throw err;
  }

  return jsonOk({ message: "Thank you! Payout has been released to the vendor." });
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonNoStore, jsonError } from "@/lib/api-response";
import { initializeTransaction } from "@/lib/paystack";
import { z } from "zod";
import crypto from "crypto";
import { apiLimiter, checkRateLimit } from "@/lib/rate-limit";

const schema = z.object({ bookingId: z.string().uuid() });

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const rate = await checkRateLimit(apiLimiter, `payments:${user.id}`);
  if (!rate.success) return jsonError("Rate limit exceeded", 429);

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return jsonError("Invalid input", 400);

  const booking = await prisma.booking.findUnique({
    where: { id: parsed.data.bookingId },
    include: { payments: true },
  });

  if (!booking || booking.customerId !== user.id) {
    return jsonError("Booking not found", 404);
  }
  // Accept both RESERVED (new flow) and PENDING_PAYMENT (legacy)
  if (!["RESERVED", "PENDING_PAYMENT"].includes(booking.status)) {
    return jsonError("Booking not payable", 400);
  }
  // Check reservation hasn't expired
  if (booking.status === "RESERVED" && booking.reservationExpiresAt && booking.reservationExpiresAt < new Date()) {
    return jsonError("Your reservation expired. Please start a new booking.", 410);
  }

  const payment = booking.payments[0];
  if (!payment) return jsonError("Payment record missing", 500);

  const reference = `ev_${crypto.randomBytes(12).toString("hex")}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const tx = await initializeTransaction({
      email: user.email,
      amount: payment.amount * 100,
      reference,
      callback_url: `${appUrl}/bookings/${booking.id}?payment=success`,
      metadata: { bookingId: booking.id, paymentId: payment.id },
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { paystackRef: reference },
    });

    return jsonNoStore({
      authorization_url: tx.authorization_url,
      reference: tx.reference,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Payment init failed";
    return jsonError(message, 502);
  }
}

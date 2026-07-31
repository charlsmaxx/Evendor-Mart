import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { createQuoteSchema } from "@/lib/validations/quote";
import { apiLimiter, checkRateLimit } from "@/lib/rate-limit";
import { emitDomainEvent } from "@/core/events";
import type { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const rate = await checkRateLimit(apiLimiter, user.id);
  if (!rate.success) return jsonError("Rate limit exceeded", 429);

  const parsed = createQuoteSchema.safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const quote = await prisma.quoteRequest.create({
    data: {
      customerId: user.id,
      vendorId: parsed.data.vendorId,
      listingId: parsed.data.listingId,
      eventDate: parsed.data.eventDate ? new Date(parsed.data.eventDate) : undefined,
      budget: parsed.data.budget,
      message: parsed.data.message,
      ...(parsed.data.details
        ? { details: parsed.data.details as Prisma.InputJsonValue }
        : {}),
    } as Prisma.QuoteRequestUncheckedCreateInput,
  });

  await emitDomainEvent({
    type: "QuoteReceived",
    payload: {
      vendorId: parsed.data.vendorId,
      customerName: user.fullName ?? "A customer",
      quoteId: quote.id,
    },
  });

  return jsonOk(quote, 201);
}

export async function GET() {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  if (user.role === "VENDOR") {
    const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } });
    if (!vendor) return jsonOk([]);
    const quotes = await prisma.quoteRequest.findMany({
      where: { vendorId: vendor.id },
      include: { customer: { select: { fullName: true, email: true } }, listing: true },
      orderBy: { createdAt: "desc" },
    });
    return jsonOk(quotes);
  }

  const quotes = await prisma.quoteRequest.findMany({
    where: { customerId: user.id },
    include: { vendor: true, listing: true },
    orderBy: { createdAt: "desc" },
  });
  return jsonOk(quotes);
}

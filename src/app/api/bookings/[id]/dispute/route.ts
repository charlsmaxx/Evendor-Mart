import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { openDispute } from "@/lib/escrow";
import { z } from "zod";

const schema = z.object({ reason: z.string().min(10).max(1000) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return jsonError("Booking not found", 404);
  if (booking.customerId !== user.id) return jsonError("Forbidden", 403);

  await openDispute(id, user.id, parsed.data.reason);
  return jsonOk({ message: "Dispute opened. Our team will review within 24–48 hours." });
}

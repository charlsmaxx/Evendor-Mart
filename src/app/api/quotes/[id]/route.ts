import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/core/audit-engine";
import { emitDomainEvent } from "@/core/events";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["ACCEPTED", "DECLINED"]),
  response: z.string().max(1000).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } });
  if (!vendor) return jsonError("Vendor profile required", 403);

  const { id } = await params;
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const quote = await prisma.quoteRequest.findFirst({
    where: { id, vendorId: vendor.id },
    include: { customer: { select: { id: true, fullName: true } } },
  });
  if (!quote) return jsonError("Quote not found", 404);
  if (quote.status !== "PENDING") return jsonError("Quote already processed", 400);

  const updated = await prisma.quoteRequest.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  await emitDomainEvent({
    type: "QuoteStatusChanged",
    payload: {
      customerId: quote.customerId,
      status: parsed.data.status,
      vendorName: vendor.businessName,
      response: parsed.data.response?.trim() ?? null,
    },
  });

  await writeAuditLog({
    actorId: user.id,
    action: "QUOTE_STATUS_UPDATE",
    entityType: "QuoteRequest",
    entityId: id,
    metadata: { status: parsed.data.status },
  });

  return jsonOk(updated);
}

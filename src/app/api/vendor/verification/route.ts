import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/core/audit-engine";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { z } from "zod";

const schema = z.object({
  documents: z.array(z.string().url()).min(1).max(15),
  notes: z.string().max(4000).optional(),
});

export async function GET() {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } });
  if (!vendor) return jsonError("Vendor not found", 404);

  const req = await prisma.verificationRequest.findUnique({ where: { vendorId: vendor.id } });
  return jsonOk(req);
}

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } });
  if (!vendor) return jsonError("Vendor profile required", 404);

  if (vendor.verificationStatus === "VERIFIED") {
    return jsonError("Your account is already verified.", 400);
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  const result = await prisma.verificationRequest.upsert({
    where: { vendorId: vendor.id },
    update: { documents: parsed.data.documents, notes: parsed.data.notes, status: "PENDING", updatedAt: new Date() },
    create: { vendorId: vendor.id, documents: parsed.data.documents, notes: parsed.data.notes },
  });

  await prisma.vendorProfile.update({
    where: { id: vendor.id },
    data: { verificationStatus: "PENDING" },
  });

  await writeAuditLog({
    actorId: user.id,
    action: "VERIFICATION_REQUESTED",
    entityType: "VendorProfile",
    entityId: vendor.id,
  });

  return jsonOk(result, 201);
}

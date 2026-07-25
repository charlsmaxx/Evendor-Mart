import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({ acceptTerms: z.literal(true) });

/** Record platform terms acceptance for the current user. */
export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return jsonError("You must accept the terms to continue.", 400);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { termsAcceptedAt: new Date() },
    select: { id: true, termsAcceptedAt: true },
  });

  return jsonOk(updated);
}

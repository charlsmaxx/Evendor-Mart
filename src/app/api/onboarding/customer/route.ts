import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, hasCurrentLegalAcceptance } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { customerOnboardingSchema } from "@/lib/validations/auth";

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  if (!(await hasCurrentLegalAcceptance(user.id))) {
    return jsonError("Please review and accept Evendor's Terms of Service and Privacy Policy to continue.", 403);
  }

  const parsed = customerOnboardingSchema.safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  try {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        fullName: parsed.data.fullName,
        city: parsed.data.city,
        preferences: parsed.data.preferences,
        role: "CUSTOMER",
        onboardingComplete: true,
      },
    });

    return jsonOk(updated);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error";
    return jsonError(`Could not save profile: ${message}`, 500);
  }
}

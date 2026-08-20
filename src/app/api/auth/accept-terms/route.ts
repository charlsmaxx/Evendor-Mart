import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { z } from "zod";
import {
  applyLegalAcceptanceCookie,
  isLegalAcceptanceMethod,
  LEGAL_SIGNUP_ERROR_MESSAGE,
  PRIVACY_VERSION,
  TERMS_VERSION,
} from "@/lib/legal";
import {
  getRequestClientMeta,
  recordLegalAcceptance,
} from "@/core/identity-engine/legal-acceptance";

const schema = z.object({
  method: z.string().optional(),
});

/** Record current Terms / Privacy acceptance for the authenticated user. Versions come from the server. */
export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  let methodRaw: unknown = "reconsent";
  try {
    const parsed = schema.safeParse(await req.json());
    if (parsed.success && parsed.data.method) methodRaw = parsed.data.method;
  } catch {
    /* empty body is treated as reconsent */
  }

  if (!isLegalAcceptanceMethod(methodRaw)) {
    return jsonError("Invalid acceptance method.", 400);
  }

  try {
    const meta = getRequestClientMeta(req);
    await recordLegalAcceptance({
      userId: user.id,
      method: methodRaw,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  } catch (error) {
    console.error("[Evendor:legal] Failed to record acceptance", error);
    return jsonError(LEGAL_SIGNUP_ERROR_MESSAGE, 500);
  }

  const response = jsonOk({
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    acceptedAt: new Date().toISOString(),
    method: methodRaw,
  });
  applyLegalAcceptanceCookie(response);
  return response;
}

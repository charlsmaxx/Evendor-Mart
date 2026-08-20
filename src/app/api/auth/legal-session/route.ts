import { requireAuth, hasCurrentLegalAcceptance } from "@/lib/auth";
import { jsonError, jsonNoStore } from "@/lib/api-response";
import { applyLegalAcceptanceCookie, PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal";

/** Returns whether the signed-in user has accepted the current legal versions and mints the legal cookie. */
export async function GET() {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const accepted = await hasCurrentLegalAcceptance(user.id);
  const response = jsonNoStore({
    accepted,
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
  });
  if (accepted) applyLegalAcceptanceCookie(response);
  return response;
}

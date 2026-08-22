import { requireAuth, hasCurrentLegalAcceptance } from "@/lib/auth";
import { jsonError, jsonNoStore } from "@/lib/api-response";
import { applyLegalAcceptanceCookie, PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal";

/** Returns whether the signed-in user has accepted the current legal versions and mints the legal cookie. */
export async function GET() {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  let accepted = false;
  try {
    accepted = await hasCurrentLegalAcceptance(user.id);
  } catch (error) {
    console.error("[Evendor:legal] legal-session lookup failed", error);
  }
  const response = jsonNoStore({
    accepted,
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
  });
  if (accepted) applyLegalAcceptanceCookie(response);
  return response;
}

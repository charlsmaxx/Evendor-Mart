import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { loadVendorDraft, saveVendorDraft } from "@/lib/vendor-onboarding/persist";
import { profileDraftPatchForBusinessKind, vendorDraftPatchSchema } from "@/lib/vendor-onboarding/draft-patch";

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const businessKind = req.nextUrl.searchParams.get("businessKind");
  if (businessKind !== "VENUE" && businessKind !== "SERVICE") {
    return jsonError("businessKind required", 400);
  }

  try {
    const { draft } = await loadVendorDraft(user.id, businessKind);
    return jsonOk({ draft, savedAt: draft.updatedAt });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Could not load draft", 500);
  }
}

export async function PATCH(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const parsed = vendorDraftPatchSchema.safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  try {
    const { businessKind, ...patch } = parsed.data;
    const profilePatch = profileDraftPatchForBusinessKind(businessKind, patch);
    const { draft } = await saveVendorDraft(user.id, businessKind, profilePatch);
    return jsonOk({ draft, savedAt: draft.updatedAt });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Could not save draft", 500);
  }
}

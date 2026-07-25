import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { z } from "zod";
import { loadVendorDraft, saveVendorDraft } from "@/lib/vendor-onboarding/persist";
import type { VendorOnboardingDraft } from "@/lib/vendor-onboarding/types";

const patchSchema = z.object({
  businessKind: z.enum(["VENUE", "SERVICE"]),
  currentStep: z.number().int().min(1).max(8).optional(),
  step1: z.record(z.unknown()).optional(),
  step2: z.record(z.unknown()).optional(),
  step3: z.record(z.unknown()).optional(),
  step4: z.record(z.unknown()).optional(),
  step5: z.record(z.unknown()).optional(),
  step6: z.record(z.unknown()).optional(),
  step7: z.record(z.unknown()).optional(),
  step8: z.record(z.unknown()).optional(),
});

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

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  try {
    const { businessKind, ...patch } = parsed.data;
    const { draft } = await saveVendorDraft(user.id, businessKind, patch as Partial<VendorOnboardingDraft>);
    return jsonOk({ draft, savedAt: draft.updatedAt });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Could not save draft", 500);
  }
}

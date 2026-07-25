import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { requireAdminSection } from "@/lib/rbac";
import { jsonOk, jsonError } from "@/lib/api-response";
import { resolveDispute } from "@/lib/escrow";
import { z } from "zod";

const schema = z.object({
  resolution: z.enum(["FULL_REFUND", "FULL_PAYOUT", "PARTIAL"]),
  adminNotes: z.string().max(1000).optional(),
  partialVendorPercent: z.number().min(0).max(100).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);
  try { await requireAdminSection(user, "trust"); } catch { return jsonError("Forbidden", 403); }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.message, 400);

  await resolveDispute(
    id,
    user.id,
    parsed.data.resolution,
    parsed.data.adminNotes,
    parsed.data.partialVendorPercent
  );

  return jsonOk({ message: "Dispute resolved." });
}

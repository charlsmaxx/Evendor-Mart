import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { getUploadSignature, isCloudinaryConfigured } from "@/lib/cloudinary";
import { requireRole } from "@/lib/rbac";
import { z } from "zod";

const signSchema = z.object({
  purpose: z.enum(["portfolio", "verification", "profile", "evidence", "booking"]).optional(),
});

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  try {
    // Customers upload during onboarding (profile, cover, featured photos) before role becomes VENDOR.
    await requireRole(user.id, ["CUSTOMER", "VENDOR", "ADMIN"]);
  } catch {
    return jsonError("Forbidden", 403);
  }

  if (!isCloudinaryConfigured()) {
    return jsonError(
      "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to .env.local.",
      503,
      "CLOUDINARY_NOT_CONFIGURED"
    );
  }

  const parsed = signSchema.safeParse(await req.json().catch(() => ({})));
  const purpose = parsed.success ? parsed.data.purpose : "portfolio";
  const folder =
    purpose === "verification"
      ? `evendor/verification/${user.id}`
      : purpose === "profile"
        ? `evendor/profile/${user.id}`
        : purpose === "evidence"
          ? `evendor/evidence/${user.id}`
          : purpose === "booking"
            ? `evendor/bookings/${user.id}`
            : `evendor/${user.id}`;

  const sig = getUploadSignature(folder);
  return jsonOk(sig);
}

export async function GET() {
  return jsonOk({ configured: isCloudinaryConfigured() });
}

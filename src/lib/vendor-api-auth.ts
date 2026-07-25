import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api-response";

/** Resolve vendor profile for the authenticated owner (not staff — extend later). */
export async function requireVendorProfile() {
  const user = await requireAuth();
  if (!user) return { error: jsonError("Unauthorized", 401), user: null, vendor: null };

  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } });
  if (!vendor) {
    return { error: jsonError("Vendor not found", 404), user: null, vendor: null };
  }

  return { error: null, user, vendor };
}

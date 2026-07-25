import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonNoStore, jsonError, handleApiRoute } from "@/lib/api-response";

export async function GET() {
  return handleApiRoute(async () => {
    const user = await requireAuth();
    if (!user) return jsonError("Unauthorized", 401);

    let isVendor = false;
    try {
      const vendor = await prisma.vendorProfile.findUnique({ where: { userId: user.id } });
      isVendor = user.role === "VENDOR" && !!vendor;
    } catch {
      /* vendor lookup optional */
    }

    return jsonNoStore({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
      onboardingComplete: user.onboardingComplete,
      isVendor,
    });
  });
}

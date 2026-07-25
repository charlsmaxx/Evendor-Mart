import { z } from "zod";
import { jsonOk, jsonError, handleApiRoute } from "@/lib/api-response";
import { requireVendorProfile } from "@/lib/vendor-api-auth";
import { inviteVendorStaff, listVendorStaff } from "@/core/staff-engine";
import { requirePremium, PremiumRequiredError } from "@/core/subscription-engine";

export async function GET() {
  return handleApiRoute(async () => {
    const { error, vendor } = await requireVendorProfile();
    if (error) return error;

    try {
      await requirePremium(vendor!.id, "staff");
    } catch (err) {
      if (err instanceof PremiumRequiredError) {
        return jsonError("Premium subscription required", 402, err.feature);
      }
      throw err;
    }

    const staff = await listVendorStaff(vendor!.id);
    return jsonOk(staff);
  });
}

const inviteSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  role: z.enum(["MANAGER", "RECEPTIONIST", "ASSISTANT", "OPERATIONS"]),
});

export async function POST(req: Request) {
  return handleApiRoute(async () => {
    const { error, vendor } = await requireVendorProfile();
    if (error) return error;

    try {
      await requirePremium(vendor!.id, "staff");
    } catch (err) {
      if (err instanceof PremiumRequiredError) {
        return jsonError("Premium subscription required", 402, err.feature);
      }
      throw err;
    }

    const parsed = inviteSchema.safeParse(await req.json());
    if (!parsed.success) return jsonError(parsed.error.message, 400);

    const staff = await inviteVendorStaff({
      vendorId: vendor!.id,
      ...parsed.data,
    });
    return jsonOk(staff, 201);
  });
}

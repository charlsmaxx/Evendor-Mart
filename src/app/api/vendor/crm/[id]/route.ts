import { z } from "zod";
import { jsonOk, jsonError, handleApiRoute } from "@/lib/api-response";
import { requireVendorProfile } from "@/lib/vendor-api-auth";
import { getBusinessCustomer } from "@/core/crm-engine";
import { requirePremium, PremiumRequiredError } from "@/core/subscription-engine";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  return handleApiRoute(async () => {
    const { error, vendor } = await requireVendorProfile();
    if (error) return error;
    const { id } = await params;

    try {
      await requirePremium(vendor!.id, "crm");
    } catch (err) {
      if (err instanceof PremiumRequiredError) {
        return jsonError("Premium subscription required", 402, err.feature);
      }
      throw err;
    }

    const customer = await getBusinessCustomer(vendor!.id, id);
    if (!customer) return jsonError("Customer not found", 404);
    return jsonOk(customer);
  });
}

const patchSchema = z.object({
  internalNotes: z.string().optional(),
  favoriteListingId: z.string().uuid().optional().nullable(),
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional().nullable(),
});

export async function PATCH(req: Request, { params }: RouteParams) {
  return handleApiRoute(async () => {
    const { error, vendor } = await requireVendorProfile();
    if (error) return error;
    const { id } = await params;

    try {
      await requirePremium(vendor!.id, "crm");
    } catch (err) {
      if (err instanceof PremiumRequiredError) {
        return jsonError("Premium subscription required", 402, err.feature);
      }
      throw err;
    }

    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return jsonError(parsed.error.message, 400);

    const updated = await prisma.businessCustomer.updateMany({
      where: { id, vendorId: vendor!.id },
      data: parsed.data,
    });
    if (updated.count === 0) return jsonError("Customer not found", 404);

    const customer = await getBusinessCustomer(vendor!.id, id);
    return jsonOk(customer);
  });
}

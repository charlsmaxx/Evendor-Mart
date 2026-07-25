import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonOk, jsonError, handleApiRoute } from "@/lib/api-response";
import { requireVendorProfile } from "@/lib/vendor-api-auth";
import { listBusinessCustomers } from "@/core/crm-engine";
import { requirePremium, PremiumRequiredError } from "@/core/subscription-engine";

export async function GET(req: NextRequest) {
  return handleApiRoute(async () => {
    const { error, vendor } = await requireVendorProfile();
    if (error) return error;

    try {
      await requirePremium(vendor!.id, "crm");
    } catch (err) {
      if (err instanceof PremiumRequiredError) {
        return jsonError("Premium subscription required", 402, err.feature);
      }
      throw err;
    }

    const q = req.nextUrl.searchParams.get("q") ?? undefined;
    const customers = await listBusinessCustomers(vendor!.id, { q, limit: 100 });
    return jsonOk(customers);
  });
}

const createSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(7),
  email: z.string().email().optional(),
  internalNotes: z.string().optional(),
});

export async function POST(req: Request) {
  return handleApiRoute(async () => {
    const { error, vendor } = await requireVendorProfile();
    if (error) return error;

    try {
      await requirePremium(vendor!.id, "crm");
    } catch (err) {
      if (err instanceof PremiumRequiredError) {
        return jsonError("Premium subscription required", 402, err.feature);
      }
      throw err;
    }

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return jsonError(parsed.error.message, 400);

    const { upsertBusinessCustomer } = await import("@/core/crm-engine");
    const customer = await upsertBusinessCustomer({
      vendorId: vendor!.id,
      ...parsed.data,
    });
    return jsonOk(customer, 201);
  });
}

import { NextRequest, NextResponse } from "next/server";
import { jsonError, handleApiRoute } from "@/lib/api-response";
import { requireVendorProfile } from "@/lib/vendor-api-auth";
import { requirePremium, PremiumRequiredError } from "@/core/subscription-engine";
import {
  exportVendorBookingsCsv,
  exportVendorCustomersCsv,
} from "@/core/analytics-engine/vendor-business";

export async function GET(req: NextRequest) {
  return handleApiRoute(async () => {
    const { error, vendor } = await requireVendorProfile();
    if (error) return error;

    try {
      await requirePremium(vendor!.id, "exports");
    } catch (err) {
      if (err instanceof PremiumRequiredError) {
        return jsonError("Premium subscription required", 402, err.feature);
      }
      throw err;
    }

    const type = req.nextUrl.searchParams.get("type") ?? "bookings";
    const format = req.nextUrl.searchParams.get("format") ?? "csv";

    if (format !== "csv") {
      return jsonError("PDF and Excel exports coming soon — use CSV for now", 501);
    }

    let body: string;
    let filename: string;

    if (type === "customers") {
      body = await exportVendorCustomersCsv(vendor!.id);
      filename = "evendor-customers.csv";
    } else if (type === "bookings" || type === "revenue") {
      body = await exportVendorBookingsCsv(vendor!.id);
      filename = type === "revenue" ? "evendor-revenue.csv" : "evendor-bookings.csv";
    } else {
      return jsonError("Unknown export type", 400);
    }

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  });
}

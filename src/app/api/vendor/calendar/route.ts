import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { loadCalendarMonth } from "@/core/calendar-engine";
import { getVendorByUserId } from "@/core/identity-engine";

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const vendor = await getVendorByUserId(user.id);
  if (!vendor) return jsonError("Vendor profile not found", 404);

  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year") ?? new Date().getFullYear());
  const month = Number(url.searchParams.get("month") ?? new Date().getMonth() + 1);
  const listingId = url.searchParams.get("listingId") || undefined;

  const { bookings, blockedDates } = await loadCalendarMonth({
    vendorId: vendor.id,
    year,
    month,
    listingId,
  });

  return jsonOk({ bookings, blockedDates });
}

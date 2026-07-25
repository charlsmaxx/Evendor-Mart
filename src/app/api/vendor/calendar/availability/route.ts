import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { checkAvailability } from "@/lib/booking-engine";

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const url = new URL(req.url);
  const listingId = url.searchParams.get("listingId");
  const eventDate = url.searchParams.get("eventDate");
  const startTime = url.searchParams.get("startTime");
  const endTime = url.searchParams.get("endTime");

  if (!listingId || !eventDate) return jsonError("listingId and eventDate required", 400);

  const result = await checkAvailability(
    listingId,
    new Date(eventDate),
    startTime ? new Date(startTime) : undefined,
    endTime ? new Date(endTime) : undefined
  );

  return jsonOk(result);
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonOk, jsonError } from "@/lib/api-response";

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(
    req.headers.get("content-type")?.includes("application/json")
      ? await req.json()
      : Object.fromEntries((await req.formData()).entries())
  );
  if (!parsed.success) return jsonError("Invalid email", 400);
  // Stub: integrate Resend in Phase 2
  return jsonOk({ subscribed: true, email: parsed.data.email });
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiRoute } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { getVapidPublicKey } from "@/core/notification-engine/web-push";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(req: NextRequest) {
  return handleApiRoute(async () => {
    const user = await requireAuth();
    if (!user) return jsonError("Unauthorized", 401);
    if (!getVapidPublicKey()) {
      return jsonError("Web Push is not configured on this server.", 503);
    }

    const parsed = subscribeSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return jsonError("Invalid push subscription", 400);

    const userAgent = req.headers.get("user-agent")?.slice(0, 300) ?? null;

    await prisma.pushSubscription.upsert({
      where: { endpoint: parsed.data.endpoint },
      create: {
        userId: user.id,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        userAgent,
      },
      update: {
        userId: user.id,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        userAgent,
        updatedAt: new Date(),
      },
    });

    return jsonOk({ subscribed: true });
  }, { route: "POST /api/push/subscribe" });
}

export async function DELETE(req: NextRequest) {
  return handleApiRoute(async () => {
    const user = await requireAuth();
    if (!user) return jsonError("Unauthorized", 401);

    const body = (await req.json().catch(() => null)) as { endpoint?: string } | null;
    if (!body?.endpoint) return jsonError("endpoint required", 400);

    await prisma.pushSubscription.deleteMany({
      where: { userId: user.id, endpoint: body.endpoint },
    });

    return jsonOk({ unsubscribed: true });
  }, { route: "DELETE /api/push/subscribe" });
}

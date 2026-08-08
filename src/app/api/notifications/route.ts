import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiRoute } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  return handleApiRoute(async () => {
    const user = await requireAuth();
    if (!user) return jsonError("Unauthorized", 401);

    const unreadOnly = req.nextUrl.searchParams.get("unreadCount") === "1";
    if (unreadOnly) {
      const unreadCount = await prisma.notification.count({
        where: { userId: user.id, read: false },
      });
      return jsonOk({ unreadCount });
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.notification.count({
        where: { userId: user.id, read: false },
      }),
    ]);

    return jsonOk({ notifications, unreadCount });
  }, { route: "GET /api/notifications" });
}

export async function PATCH(req: NextRequest) {
  return handleApiRoute(async () => {
    const user = await requireAuth();
    if (!user) return jsonError("Unauthorized", 401);

    const body = (await req.json().catch(() => null)) as {
      id?: string;
      markAllRead?: boolean;
    } | null;

    if (body?.markAllRead) {
      await prisma.notification.updateMany({
        where: { userId: user.id, read: false },
        data: { read: true },
      });
      return jsonOk({ updated: true });
    }

    if (!body?.id) return jsonError("Notification id required", 400);

    await prisma.notification.updateMany({
      where: { id: body.id, userId: user.id },
      data: { read: true },
    });
    return jsonOk({ updated: true });
  }, { route: "PATCH /api/notifications" });
}

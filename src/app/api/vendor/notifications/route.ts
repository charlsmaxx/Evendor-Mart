import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return jsonOk(notifications);
}

export async function PATCH(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return jsonError("Unauthorized", 401);

  const body = (await req.json()) as { id?: string; markAllRead?: boolean };
  if (body.markAllRead) {
    await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });
    return jsonOk({ updated: true });
  }

  if (!body.id) return jsonError("Notification id required", 400);

  await prisma.notification.updateMany({
    where: { id: body.id, userId: user.id },
    data: { read: true },
  });

  return jsonOk({ updated: true });
}

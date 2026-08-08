import "server-only";
import webpush from "web-push";
import { prisma } from "@/core/infrastructure/prisma";

function vapidConfigured() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:hello@evendor.com";
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

let vapidReady = false;

function ensureVapid() {
  const cfg = vapidConfigured();
  if (!cfg) return null;
  if (!vapidReady) {
    webpush.setVapidDetails(cfg.subject, cfg.publicKey, cfg.privateKey);
    vapidReady = true;
  }
  return cfg;
}

export function getVapidPublicKey() {
  return vapidConfigured()?.publicKey ?? null;
}

export async function sendWebPushToUser(params: {
  userId: string;
  title: string;
  body: string;
  link?: string;
}) {
  if (!ensureVapid()) return { sent: 0, skipped: true as const };

  const subs = await prisma.pushSubscription.findMany({
    where: { userId: params.userId },
  });
  if (subs.length === 0) return { sent: 0, skipped: false as const };

  const payload = JSON.stringify({
    title: params.title,
    body: params.body,
    link: params.link ?? "/notifications",
  });

  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload
      );
      sent++;
    } catch (err) {
      const status = (err as { statusCode?: number })?.statusCode;
      // Gone / expired subscription — clean up.
      if (status === 404 || status === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => null);
      } else {
        console.error("[web-push] send failed:", err);
      }
    }
  }

  return { sent, skipped: false as const };
}

/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig, RuntimeCaching } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * Never cache API / auth / payment traffic. Money and session paths must always
 * hit the network so a stale SW cannot serve outdated booking or wallet data.
 */
const networkOnlyApis: RuntimeCaching = {
  matcher: ({ sameOrigin, url }) =>
    sameOrigin &&
    (url.pathname.startsWith("/api/") ||
      url.pathname.startsWith("/auth/") ||
      url.pathname.startsWith("/login") ||
      url.pathname.startsWith("/register")),
  handler: new NetworkOnly(),
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    cleanupOutdatedCaches: true,
  },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  disableDevLogs: true,
  runtimeCaching: [networkOnlyApis, ...defaultCache],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

/**
 * Web Push — show an OS notification even when no Evendor tab is open.
 * Payload shape: { title, body, link? }
 */
self.addEventListener("push", (event) => {
  let title = "Evendor";
  let body = "You have a new update.";
  let link = "/notifications";

  try {
    if (event.data) {
      const data = event.data.json() as { title?: string; body?: string; link?: string };
      if (data.title) title = data.title;
      if (data.body) body = data.body;
      if (data.link) link = data.link;
    }
  } catch {
    try {
      body = event.data?.text() || body;
    } catch {
      /* keep defaults */
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { link },
      tag: `evendor-${link}`,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link =
    typeof event.notification.data?.link === "string"
      ? event.notification.data.link
      : "/notifications";
  const url = new URL(link, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of windows) {
        if ("focus" in client && client.url.startsWith(self.location.origin)) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await (client as WindowClient).navigate(url);
            } catch {
              /* older browsers */
            }
          }
          return;
        }
      }
      await self.clients.openWindow(url);
    })()
  );
});

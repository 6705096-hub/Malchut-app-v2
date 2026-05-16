/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import { Serwist, NetworkFirst, StaleWhileRevalidate } from "serwist";
import type { PrecacheEntry, SerwistGlobalConfig, RuntimeCaching } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const apiCache: RuntimeCaching = {
  matcher: ({ request, url }) => request.method === 'GET' && url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/auth/'),
  handler: new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 5,
    plugins: [
      {
         cacheWillUpdate: async ({ response }) => {
            return response && response.status === 200 ? response : null;
         }
      }
    ]
  }),
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [apiCache, ...defaultCache],
});

serwist.addEventListeners();

self.addEventListener('push', function (event: PushEvent) {
  if (event.data) {
    const data = event.data.json();
    const title = data.title || 'הודעה חדשה';
    const options: any = {
      body: data.body || '',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/',
      },
    };
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

self.addEventListener('notificationclick', function (event: NotificationEvent) {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        // If so, just focus it.
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, then open the target URL in a new window/tab.
      if (self.clients.openWindow) {
        return self.clients.openWindow(event.notification.data.url);
      }
    })
  );
});

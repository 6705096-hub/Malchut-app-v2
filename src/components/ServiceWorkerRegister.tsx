'use client';
import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js').then(
        async function (registration) {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);

          // Try to auto-subscribe if permission is already granted, or ask for it
          try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
              const sub = await registration.pushManager.getSubscription();
              if (!sub) {
                const newSub = await registration.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
                });
                await fetch('/api/push/subscribe', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(newSub)
                });
                console.log('Push notification subscribed!');
              }
            }
          } catch (e) {
            console.error('Failed to subscribe to push notifications:', e);
          }
        },
        function (err) {
          console.log('ServiceWorker registration failed: ', err);
        }
      );
    }
  }, []);
  return null;
}

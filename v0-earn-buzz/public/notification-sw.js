/**
 * PWA Notification Service Worker
 * Handles push notifications and notification clicks
 */

const CACHE_NAME = 'pwa-notification-v1';
const ASSETS_TO_CACHE = ['/icons/icon-192x192.png', '/icons/icon-512x512.png'];

// Service Worker Installation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {
        console.log('Some assets could not be cached');
      });
    })
  );
  self.skipWaiting();
});

// Service Worker Activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Handle Push Notifications
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('Push event but no data');
    return;
  }

  const data = event.data.json();
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/badge-96x96.png',
    tag: data.tag || 'notification',
    requireInteraction: data.requireInteraction !== false,
    data: {
      url: data.clickUrl || '/',
      timestamp: data.timestamp || Date.now(),
    },
    actions: [
      {
        action: 'open',
        title: 'Open',
      },
      {
        action: 'close',
        title: 'Close',
      },
    ],
  };

  // Check browser type for notification styling
  if (typeof navigator !== 'undefined' && navigator.userAgent) {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      // iOS specific styling (applied via CSS in main thread)
      options.timestamp = Date.now();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Notification', options)
  );
});

// Handle Notification Clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((clientList) => {
      // Check if app is already open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not open, open new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle Notification Close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed', event.notification.tag);
});

// Background Sync (optional, for offline notifications)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

// Periodically sync subscriptions (optional)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-subscriptions') {
    event.waitUntil(syncSubscriptions());
  }
});

// Helper: Sync queued notifications
async function syncNotifications() {
  try {
    const cache = await caches.open(CACHE_NAME);
    // Implement sync logic if needed
    console.log('Syncing notifications');
  } catch (error) {
    console.error('Sync error:', error);
  }
}

// Helper: Sync subscriptions
async function syncSubscriptions() {
  try {
    const cache = await caches.open(CACHE_NAME);
    // Implement subscription sync if needed
    console.log('Syncing subscriptions');
  } catch (error) {
    console.error('Sync error:', error);
  }
}

// Message handler for client-server communication
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const notification = event.data.notification || {};
    event.waitUntil(
      self.registration.showNotification(notification.title || 'Notification', {
        body: notification.body || '',
        icon: notification.icon || '/icons/icon-192x192.png',
        badge: notification.badge || '/icons/icon-192x192.png',
        data: {
          url: notification.clickUrl || notification.link || '/',
          timestamp: Date.now(),
        },
      })
    );
  }
  
  if (event.data && event.data.type === 'NOTIFICATION_CHECK') {
    event.ports[0].postMessage({
      type: 'NOTIFICATION_CHECK_RESPONSE',
      hasNotificationAPI: typeof Notification !== 'undefined',
    });
  }
});

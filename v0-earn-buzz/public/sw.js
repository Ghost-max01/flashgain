const CACHE_NAME = "earn-buzz-v3"
const urlsToCache = [
  "/",
  "/manifest.webmanifest?v=20260317",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
]

// Load Firebase Messaging inside the same SW so FCM background delivery and
// generic Web Push share one stable "/" scope.
try {
  importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js")
  importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js")

  if (typeof firebase !== "undefined" && firebase.apps && !firebase.apps.length) {
    firebase.initializeApp({
      apiKey: "AIzaSyAXHBpjh7TfRHoOdxduMaxbACLmKhc10Ts",
      authDomain: "basework-76679.firebaseapp.com",
      projectId: "basework-76679",
      storageBucket: "basework-76679.firebasestorage.app",
      messagingSenderId: "776150811852",
      appId: "1:776150811852:web:f0c69a11487993e5cd6e69",
    })
  }

  if (typeof firebase !== "undefined" && firebase.messaging) {
    const messaging = firebase.messaging()
    messaging.onBackgroundMessage((payload) => {
      const title = payload.notification?.title || payload.data?.title || "FlashGain 9ja"
      const body = payload.notification?.body || payload.data?.body || "You have a new alert"
      const clickUrl = payload.data?.clickUrl || payload.fcmOptions?.link || "/dashboard"

      self.registration.showNotification(title, {
        body,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-192x192.png",
        vibrate: [200, 100, 200],
        tag: payload.data?.tag || "flashgain-fcm",
        renotify: true,
        data: { url: clickUrl, messageId: payload.messageId },
        actions: [
          { action: "open", title: "Open App" },
          { action: "close", title: "Dismiss" },
        ],
      })
    })
  }
} catch (error) {
  console.warn("[sw] Firebase messaging unavailable in service worker", error)
}

// Install event
self.addEventListener("install", (event) => {
  self.skipWaiting()
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)))
})

self.addEventListener("activate", (event) => {
  // Remove old caches
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

function isNavigationRequest(request) {
  return (
    request.mode === "navigate" ||
    (request.method === "GET" && request.headers.get("accept")?.includes("text/html"))
  )
}

// Fetch event — network-first for navigation, cache-first for static assets
self.addEventListener("fetch", (event) => {
  const url = event.request.url
  if (
    url.includes("/api/") ||
    url.includes("/_next/") ||
    url.includes("/firebase-messaging-sw.js") ||
    !url.startsWith(self.location.origin)
  ) {
    return
  }

  if (isNavigationRequest(event.request)) {
    // Stale-while-revalidate: respond with cache if available, update cache in background
    event.respondWith(
      (async function () {
        const cache = await caches.open(CACHE_NAME)
        const cached = await cache.match(event.request)

        const networkFetch = fetch(event.request)
          .then((response) => {
            if (response && response.ok) {
              const clone = response.clone()
              cache.put(event.request, clone)
            }
            return response
          })
          .catch(() => null)

        if (cached) {
          // update cache in background, but return cached immediately
          event.waitUntil(networkFetch)
          return cached
        }

        // No cached entry — wait for network, fallback to root cached page
        const netRes = await networkFetch
        if (netRes) return netRes
        return caches.match("/")
      })(),
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  )
})

// Push event — handles VAPID / native Web Push (iOS PWA + web-push library)
self.addEventListener("push", (event) => {
  let payload = {}
  if (event.data) {
    try {
      payload = event.data.json()
    } catch {
      payload = { body: event.data.text() }
    }
  }

  // Support both flat payload and nested notification object
  const title = payload.title || payload.notification?.title || "FlashGain 9ja"
  const body = payload.body || payload.notification?.body || "You have a new alert"
  const icon = payload.icon || payload.notification?.icon || "/icons/icon-192x192.png"
  const clickUrl = payload.clickUrl || payload.data?.url || "/dashboard"

  const options = {
    body,
    icon,
    badge: "/icons/icon-192x192.png",
    vibrate: [200, 100, 200],
    tag: payload.tag || "flashgain-push",
    renotify: true,
    requireInteraction: false,
    data: { url: clickUrl },
    actions: [
      { action: "open", title: "Open App" },
      { action: "close", title: "Dismiss" },
    ],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Notification click — open or focus the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  if (event.action === "close") return

  const targetUrl = event.notification?.data?.url || "/dashboard"

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if already open
      for (const client of clientList) {
        try {
          const clientPath = new URL(client.url).pathname
          const targetPath = new URL(targetUrl, self.location.origin).pathname
          if (clientPath === targetPath && "focus" in client) {
            return client.focus()
          }
        } catch (_) { /* ignore URL parse errors */ }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    }),
  )
})

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SHOW_NOTIFICATION") {
    const notification = event.data.notification || {}
    event.waitUntil(
      self.registration.showNotification(notification.title || "Earn Buzz", {
        body: notification.body || "",
        icon: notification.icon || "/icons/icon-192x192.png",
        badge: notification.badge || "/icons/icon-192x192.png",
        data: {
          url: notification.clickUrl || notification.link || "/",
        },
      }),
    )
  }

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})

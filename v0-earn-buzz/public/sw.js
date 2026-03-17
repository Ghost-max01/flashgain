const CACHE_NAME = "earn-buzz-v1"
const urlsToCache = [
  "/",
  "/dashboard",
  "/profile",
  "/airtime",
  "/data",
  "/withdraw",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
]

// Install event
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)))
})

// Fetch event
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      return response || fetch(event.request)
    }),
  )
})

// Push event
self.addEventListener("push", (event) => {
  let payload = {}
  if (event.data) {
    try {
      payload = event.data.json()
    } catch {
      payload = { body: event.data.text() }
    }
  }

  const options = {
    body: payload.body || "New notification from Earn Buzz",
    icon: payload.icon || "/icons/icon-192x192.png",
    badge: payload.badge || "/icons/icon-192x192.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
      url: payload.clickUrl || "/",
    },
    actions: [
      {
        action: "explore",
        title: "Open App",
        icon: "/icons/icon-192x192.png",
      },
      {
        action: "close",
        title: "Close",
        icon: "/icons/icon-192x192.png",
      },
    ],
  }

  event.waitUntil(self.registration.showNotification(payload.title || "Earn Buzz", options))
})

// Notification click event
self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const targetUrl = event.notification?.data?.url || "/"
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client && (client.url === targetUrl || targetUrl === "/")) {
          return client.focus()
        }
      }
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
})

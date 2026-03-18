// ─── Platform detection ──────────────────────────────────────────────────────

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false
  return /ipad|iphone|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false
  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia("(display-mode: standalone)").matches
}

// ─── VAPID public key ────────────────────────────────────────────────────────

const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BLBi1so_KpGJtCt25Jpdq44NVgIrfSCPoGqE0jxw_dI5JVL59OqK3ODtuphKetG8VtM4vGUNFdXdMLOb0_dFsIA"

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// ─── Service Worker Registration ─────────────────────────────────────────────

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null
  try {
    // Register main SW that handles caching + generic push events
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" })
    await reg.update()
    return reg
  } catch (error) {
    console.error("[notification-service] SW registration failed:", error)
    return null
  }
}

async function getFirebaseMessagingSW(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null
  try {
    // FCM requires its own SW file at /firebase-messaging-sw.js
    const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" })
    await reg.update()
    return reg
  } catch (error) {
    console.error("[notification-service] Firebase SW registration failed:", error)
    return null
  }
}

// ─── Permission ──────────────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if ("Notification" in window) {
    return Notification.requestPermission()
  }
  return "denied"
}

// ─── Local in-app notification ───────────────────────────────────────────────

export function showLocalNotification(title: string, options?: NotificationOptions): void {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, {
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      ...options,
    })
  }
}

// ─── iOS native Web Push (VAPID) ─────────────────────────────────────────────
// On iOS 16.4+ the app must be installed (standalone) for Web Push to work.
// We subscribe using PushManager and POST the subscription to the server.

async function registerIOSWebPush(uid: string): Promise<boolean> {
  console.log("[notification-service] iOS standalone detected — attempting native Web Push")

  const sw = await registerServiceWorker()
  if (!sw) return false

  try {
    const existing = await sw.pushManager.getSubscription()
    const subscription = existing ?? await sw.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
    })

    await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, type: "webpush", subscription: subscription.toJSON() }),
    })

    try {
      localStorage.setItem("tivexx-notification-optin", "1")
      localStorage.setItem("tivexx-notification-channel", "webpush")
      localStorage.setItem("tivexx-notification-registered-at", Date.now().toString())
    } catch {}

    console.log("[notification-service] iOS Web Push subscription saved")
    return true
  } catch (error) {
    console.error("[notification-service] iOS Web Push subscription failed:", error)
    return false
  }
}

// ─── FCM (Chrome / Android / Edge / Firefox) ─────────────────────────────────

async function registerFCMPush(uid: string): Promise<boolean> {
  console.log("[notification-service] Non-iOS browser — attempting FCM registration")

  const sw = await getFirebaseMessagingSW()
  if (!sw) return false

  try {
    const { initializeApp, getApps } = await import("firebase/app")
    const { getMessaging, getToken } = await import("firebase/messaging")

    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAXHBpjh7TfRHoOdxduMaxbACLmKhc10Ts",
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "basework-76679.firebaseapp.com",
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "basework-76679",
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "basework-76679.firebasestorage.app",
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "776150811852",
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:776150811852:web:f0c69a11487993e5cd6e69",
    }

    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
    const messaging = getMessaging(app)

    const token = await getToken(messaging, {
      vapidKey: VAPID_PUBLIC_KEY,
      serviceWorkerRegistration: sw,
    })

    if (!token) {
      console.warn("[notification-service] FCM returned empty token")
      return false
    }

    await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, type: "fcm", token }),
    })

    try {
      localStorage.setItem("tivexx-notification-optin", "1")
      localStorage.setItem("tivexx-notification-channel", "fcm")
      localStorage.setItem("tivexx-notification-registered-at", Date.now().toString())
      localStorage.setItem("tivexx-fcm-token", token)
    } catch {}

    console.log("[notification-service] FCM token saved")
    return true
  } catch (error) {
    console.error("[notification-service] FCM registration failed:", error)
    return false
  }
}

// ─── Main registration entry point ───────────────────────────────────────────
// Call this after login, passing the user's UID.
// Detects platform and registers the appropriate push channel.

export async function registerForFCM(uid: string): Promise<boolean> {
  if (typeof window === "undefined") return false
  if (!uid || uid === "anonymous") return false

  try {
    const permission = await requestNotificationPermission()
    if (permission !== "granted") {
      console.warn("[notification-service] Notification permission not granted")
      return false
    }

    // iOS PWA — use native Web Push (VAPID), not FCM
    if (isIOS()) {
      if (!isStandalone()) {
        // iOS Safari tab — Web Push requires standalone (Add to Home Screen)
        console.warn("[notification-service] iOS Safari tab mode — Web Push requires standalone install")
        return false
      }
      return registerIOSWebPush(uid)
    }

    // All other browsers — use FCM
    return registerFCMPush(uid)
  } catch (error) {
    console.error("[notification-service] registerForFCM error:", error)
    return false
  }
}

export async function getSubscriptionStatus(uid: string): Promise<{
  hasAny: boolean
  hasFcm: boolean
  hasWebpush: boolean
}> {
  if (!uid || typeof window === "undefined") {
    return { hasAny: false, hasFcm: false, hasWebpush: false }
  }

  try {
    const response = await fetch("/api/notifications/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid }),
    })

    if (!response.ok) {
      return { hasAny: false, hasFcm: false, hasWebpush: false }
    }

    const data = await response.json()
    return {
      hasAny: Boolean(data?.hasAny),
      hasFcm: Boolean(data?.hasFcm),
      hasWebpush: Boolean(data?.hasWebpush),
    }
  } catch (error) {
    console.error("[notification-service] Failed to fetch subscription status:", error)
    return { hasAny: false, hasFcm: false, hasWebpush: false }
  }
}

export async function ensurePushRegistrationIntegrity(uid: string): Promise<boolean> {
  if (!uid || typeof window === "undefined") return false

  const optedIn = localStorage.getItem("tivexx-notification-optin") === "1"
  const legacyWelcomeSeen = localStorage.getItem("tivexx-welcome-popup-shown") === "true"
  const permissionGranted = "Notification" in window && Notification.permission === "granted"

  if (!permissionGranted || (!optedIn && !legacyWelcomeSeen)) {
    return false
  }

  const status = await getSubscriptionStatus(uid)

  if (status.hasAny) {
    return true
  }

  console.log("[notification-service] Missing subscription on server, auto re-subscribing")
  return registerForFCM(uid)
}

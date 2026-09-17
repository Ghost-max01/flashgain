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

function getVapidPublicKey(): string {
  const k = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!k) throw new Error("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY");
  return k;
}

// Static public-env table. Bare `process` does NOT exist in browsers and
// Next.js only inlines STATIC process.env.NEXT_PUBLIC_* accesses at build
// time — dynamic (process.env as any)?.[name] reads crash client-side
// (ReferenceError) even when the var is configured. Never read env dynamically.
function publicEnv(name: string): string | undefined {
  try {
    const table: Record<string, string | undefined> = {
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
    return table[name];
  } catch {
    return undefined;
  }
}

function requiredEnv(name: string): string {
  const v = publicEnv(name);
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

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

// ─── Offline-push ownership token ──────────────────────────────────────────
// Issued at login/signup (see /api/login) and stored inside tivexx-user.
// The app has no Supabase Auth JWT, so subscribe/status endpoints accept
// this HMAC token as proof of uid ownership instead.

export function getNotifyToken(): string | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem("tivexx-user")
    if (!raw) return null
    const t = (JSON.parse(raw) as any)?.notifyToken
    return typeof t === "string" && t.length > 0 ? t : null
  } catch {
    return null
  }
}

// Returns the minted token on success, null on failure (reason in getLastPushError()).
export async function mintNotifyToken(uid: string, password: string): Promise<string | null> {
  if (typeof window === "undefined") return null
  if (!uid || !password) return null
  try {
    const res = await fetch("/api/notify/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: uid, password }),
    })
    const j = await res.json().catch(() => ({} as any))
    const token = typeof j?.notifyToken === "string" && j.notifyToken ? j.notifyToken : null
    if (!res.ok || !j?.success || !token) {
      setPushError(
        res.status === 429 ? "token-rate-limited"
        : res.status === 500 ? "token-server-error"
        : "token-rejected",
      )
      return null
    }
    try {
      const raw = localStorage.getItem("tivexx-user")
      const u = raw ? JSON.parse(raw) : {}
      u.notifyToken = token
      const { persistUserSession } = await import("@/lib/session-client")
      persistUserSession(u)
    } catch {
      return null
    }
    setPushError(null)
    return token
  } catch (error) {
    console.error("[notification-service] mintNotifyToken failed:", error)
    setPushError("register-failed")
    return null
  }
}

// ─── Last-error surfacing (failures were silent before) ─────────────────────
// Every registration step records WHY it failed here so the dashboard can
// show an actionable message instead of a dead "fcm no / webpush no" card.
let lastPushError: string | null = null

export function getLastPushError(): string | null {
  return lastPushError
}

function setPushError(reason: string | null) {
  lastPushError = reason
}

function classifyError(err: unknown): string {
  const msg = String((err as any)?.message || err || "")
  if (/NEXT_PUBLIC_VAPID_PUBLIC_KEY/i.test(msg)) return "missing-vapid-key"
  if (/NEXT_PUBLIC_FIREBASE_/i.test(msg)) return "missing-firebase-config"
  if (/permission|denied|not allowed/i.test(msg)) return "permission-denied"
  if (/pushmanager|push service|not supported/i.test(msg)) return "push-unsupported"
  return "register-failed"
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
  // Important: do NOT register a second worker on the same "/" scope.
  // Use the main /sw.js registration for FCM as well, otherwise the workers
  // replace each other and background delivery becomes unreliable.
  return registerServiceWorker()
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
  if (!sw) {
    setPushError("no-sw")
    return false
  }

  try {
    const existing = await sw.pushManager.getSubscription()
    const subscription = existing ?? await sw.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(getVapidPublicKey()) as unknown as BufferSource,
    })

    const res = await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, type: "webpush", subscription: subscription.toJSON(), notifyToken: getNotifyToken() }),
    })
    if (!res.ok) {
      // 401 almost always = session predates the offline-push token.
      setPushError(res.status === 401 && !getNotifyToken() ? "no-token" : `subscribe-rejected:${res.status}`)
      console.warn("[notification-service] iOS Web Push subscribe rejected:", res.status)
      return false
    }

    try {
      localStorage.setItem("tivexx-notification-optin", "1")
      localStorage.setItem("tivexx-notification-channel", "webpush")
      localStorage.setItem("tivexx-notification-registered-at", Date.now().toString())
    } catch {}

    console.log("[notification-service] iOS Web Push subscription saved")
    setPushError(null)
    return true
  } catch (error) {
    setPushError(classifyError(error))
    console.error("[notification-service] iOS Web Push subscription failed:", error)
    return false
  }
}

// ─── Native Web Push for ALL platforms (VAPID, no Firebase needed) ─────────
// Same PushManager flow as iOS, but usable on Android/desktop too. This is
// the channel that keeps working when the app is closed or minimized:
// pushes are delivered by the OS/browser push service to /sw.js, which shows
// the notification even with no tab open.

export async function registerNativeWebPush(uid: string): Promise<boolean> {
  if (typeof window === "undefined") return false
  if (!uid || uid === "anonymous") return false
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushError("push-unsupported")
      return false
    }
    const sw = await registerServiceWorker()
    if (!sw) {
      setPushError("no-sw")
      return false
    }
    const existing = await sw.pushManager.getSubscription()
    const subscription =
      existing ??
      (await sw.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(getVapidPublicKey()) as unknown as BufferSource,
      }))
    const res = await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, type: "webpush", subscription: subscription.toJSON(), notifyToken: getNotifyToken() }),
    })
    if (!res.ok) {
      setPushError(res.status === 401 && !getNotifyToken() ? "no-token" : `subscribe-rejected:${res.status}`)
      console.warn("[notification-service] Native Web Push subscribe rejected:", res.status)
      return false
    }
    try {
      localStorage.setItem("tivexx-notification-optin", "1")
      const prev = localStorage.getItem("tivexx-notification-channel")
      localStorage.setItem("tivexx-notification-channel", prev === "fcm" ? "fcm+webpush" : "webpush")
      localStorage.setItem("tivexx-notification-registered-at", Date.now().toString())
    } catch {}
    console.log("[notification-service] Native Web Push subscription saved")
    setPushError(null)
    return true
  } catch (error) {
    setPushError(classifyError(error))
    console.error("[notification-service] Native Web Push subscription failed:", error)
    return false
  }
}

// ─── FCM (Chrome / Android / Edge / Firefox) ─────────────────────────────────

async function registerFCMPush(uid: string): Promise<boolean> {
  console.log("[notification-service] Non-iOS browser — attempting FCM registration")

  const sw = await getFirebaseMessagingSW()
  if (!sw) {
    setPushError("no-sw")
    return false
  }

  try {
    const { initializeApp, getApps } = await import("firebase/app")
    const { getMessaging, getToken } = await import("firebase/messaging")

    const firebaseConfig = {
      apiKey: requiredEnv("NEXT_PUBLIC_FIREBASE_API_KEY"),
      authDomain: requiredEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
      projectId: requiredEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
      storageBucket: requiredEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
      messagingSenderId: requiredEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
      appId: requiredEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
    }

    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
    const messaging = getMessaging(app)

    const token = await getToken(messaging, {
      vapidKey: getVapidPublicKey(),
      serviceWorkerRegistration: sw,
    })

    if (!token) {
      console.warn("[notification-service] FCM returned empty token")
      setPushError("fcm-token-failed")
      return false
    }

    // NOTE: the server rejects without uid ownership (401) — verify, or the
    // app reports "enabled" while nothing was saved (silent dead channel).
    const res = await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, type: "fcm", token, notifyToken: getNotifyToken() }),
    })
    if (!res.ok) {
      setPushError(res.status === 401 && !getNotifyToken() ? "no-token" : `subscribe-rejected:${res.status}`)
      console.warn("[notification-service] FCM subscribe rejected:", res.status)
      return false
    }

    try {
      localStorage.setItem("tivexx-notification-optin", "1")
      localStorage.setItem("tivexx-notification-channel", "fcm")
      localStorage.setItem("tivexx-notification-registered-at", Date.now().toString())
      localStorage.setItem("tivexx-fcm-token", token)
    } catch {}

    console.log("[notification-service] FCM token saved")
    setPushError(null)
    return true
  } catch (error) {
    setPushError(classifyError(error))
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
      setPushError("permission-denied")
      console.warn("[notification-service] Notification permission not granted")
      return false
    }

    // iOS PWA — use native Web Push (VAPID), not FCM
    if (isIOS()) {
      if (!isStandalone()) {
        // iOS Safari tab — Web Push requires standalone (Add to Home Screen)
        setPushError("ios-needs-install")
        console.warn("[notification-service] iOS Safari tab mode — Web Push requires standalone install")
        return false
      }
      return registerIOSWebPush(uid)
    }

    // All other browsers — FCM first (legacy channel), then native Web Push
    // (VAPID) as the always-on offline channel. Either success counts.
    let ok = false
    try {
      ok = (await registerFCMPush(uid)) || ok
    } catch (error) {
      console.error("[notification-service] FCM step failed, continuing to Web Push:", error)
    }
    try {
      ok = (await registerNativeWebPush(uid)) || ok
    } catch (error) {
      console.error("[notification-service] Web Push step failed:", error)
    }
    return ok
  } catch (error) {
    console.error("[notification-service] registerForFCM error:", error)
    return false
  }
}

// ─── In-app diagnostics (read-only — changes nothing) ────────────────────────
// Exposes every pipeline stage so a dead "fcm no / webpush no" card can be
// traced to its exact cause on the device itself. The marker proves which
// build is running (stale builds show an older marker).

export const PUSH_BUILD_MARKER = "push-2026-09-17f"

export type PushDiagRow = { key: string; label: string; ok: boolean; detail: string }

export async function runPushDiagnostics(uid: string | null): Promise<{ marker: string; rows: PushDiagRow[] }> {
  const rows: PushDiagRow[] = []
  const push = (key: string, label: string, ok: boolean, detail: string) => rows.push({ key, label, ok, detail })
  try {
    if (typeof window === "undefined") {
      push("env", "Browser", false, "no window")
      return { marker: PUSH_BUILD_MARKER, rows }
    }
    // 1. Permission (reads state only — never prompts here)
    const perm = "Notification" in window ? Notification.permission : "unsupported";
    push("permission", "Phone permission", perm === "granted", perm === "unsupported" ? "no Notification API" : perm)
    // 2. Service worker
    if (!("serviceWorker" in navigator)) {
      push("sw", "Service worker", false, "not supported")
    } else {
      try {
        const reg = await navigator.serviceWorker.getRegistration("/")
        const active = Boolean(reg?.active)
        push("sw", "Service worker", Boolean(reg) && active, reg ? (active ? "registered + active" : "registered, not active yet") : "NOT registered (/sw.js missing?)")
      } catch (e: any) {
        push("sw", "Service worker", false, String(e?.message || e || "error").slice(0, 80))
      }
    }
    // 3. PushManager + existing subscription (read-only)
    if (!("PushManager" in window)) {
      push("pushmanager", "Push manager", false, "not supported on this browser")
    } else {
      try {
        const reg = await navigator.serviceWorker.getRegistration("/")
        const sub = await reg?.pushManager.getSubscription().catch(() => null)
        push("pushmanager", "Push manager", true, sub ? "device already has a push subscription" : "available, no device subscription yet")
      } catch (e: any) {
        push("pushmanager", "Push manager", false, String(e?.message || e || "error").slice(0, 80))
      }
    }
    // 4. VAPID public key (client env)
    try {
      const k = getVapidPublicKey()
      push("vapid", "VAPID key (server config)", k.length > 20, k.length > 20 ? "present" : "present but looks short")
    } catch {
      push("vapid", "VAPID key (server config)", false, "NEXT_PUBLIC_VAPID_PUBLIC_KEY missing")
    }
    // 5. Ownership token (proves this login can save subscriptions)
    const tok = getNotifyToken()
    push("token", "Login token", Boolean(tok), tok ? "present" : "MISSING — log out/in once, or unlock with password")
    // 6. Firebase config (legacy FCM channel only; native push doesn't need it)
    const fcmKeys = ["NEXT_PUBLIC_FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", "NEXT_PUBLIC_FIREBASE_APP_ID"]
    const missingFcm = fcmKeys.filter((k) => !publicEnv(k))
    push("fcm-config", "Google (FCM) config", missingFcm.length === 0, missingFcm.length === 0 ? "present (legacy channel)" : `missing — legacy FCM off, native push unaffected`)
    // 7. Server-saved subscriptions
    if (!uid) {
      push("server", "Saved on server", false, "no uid (not logged in?)")
    } else {
      try {
        const st = await getSubscriptionStatus(uid)
        push("server", "Saved on server", st.hasAny, st.hasAny ? `FCM:${st.hasFcm ? "yes" : "no"} WebPush:${st.hasWebpush ? "yes" : "no"}` : "none saved (subscribe step never landed — tap Enable)")
      } catch (e: any) {
        push("server", "Saved on server", false, String(e?.message || e || "status check failed").slice(0, 80))
      }
    }
    // 8. Server push config (private key + subject live in server env only —
    // without them EVERY send throws, even with a perfect device setup).
    try {
      const r = await fetch("/api/notify/env-check", { cache: "no-store" })
      const j = await r.json().catch(() => ({} as any))
      const vapidOk = (j as any)?.vapid === true
      push("server-env", "Server can send", vapidOk, vapidOk ? "VAPID sender configured" : "VAPID PRIVATE KEY / SUBJECT missing on server — no push can go out")
    } catch {
      push("server-env", "Server can send", false, "env check unreachable")
    }
  } catch (e: any) {
    push("fatal", "Diagnostics", false, String(e?.message || e || "failed").slice(0, 80))
  }
  return { marker: PUSH_BUILD_MARKER, rows }
}
// ─── Background reminder scheduling + foreground expedite ────────────────────
// scheduleReminder registers a server-side timer (auto finish / tap refill)
// so /api/timer/cron can push it even when the app is closed. Best-effort:
// failures never break the calling flow.
// pingDueNotifications asks the cron to flush THIS user's due rows now
// (used while a session is open; the scheduled cron covers offline users).

export async function scheduleReminder(
  input:
    | { kind: "auto_finish"; userId: string; planId: string; startedAt: number }
    | { kind: "tap_refill"; userId: string; endsAt: number },
): Promise<boolean> {
  try {
    const res = await fetch("/api/notify/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function pingDueNotifications(uid: string): Promise<boolean> {
  if (!uid || typeof window === "undefined") return false
  try {
    const res = await fetch("/api/timer/cron", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: uid }),
    })
    return res.ok
  } catch {
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
      body: JSON.stringify({ uid, notifyToken: getNotifyToken() }),
    })

    if (!response.ok) {
      return { hasAny: false, hasFcm: false, hasWebpush: false }
    }

    let data: any = {}
    try {
      data = await response.json()
    } catch {
      const txt = await response.text().catch(() => "")
      console.warn("[notification-service] status non-JSON:", txt.slice(0, 200))
      return { hasAny: false, hasFcm: false, hasWebpush: false }
    }
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

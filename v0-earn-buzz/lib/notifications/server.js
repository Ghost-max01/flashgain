import { getFirebaseMessaging } from "@/lib/notifications/firebase-admin.js"

let _webpush = null
let _webpushConfigured = false

function getWebPush() {
  if (!process.env.VAPID_PRIVATE_KEY) return null
  if (!_webpush) {
    const wp = eval("require")("web-push")
    wp.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:admin@example.com",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    )
    _webpush = wp
  }
  return _webpush
}

const DEFAULT_ICON = "/icons/icon-192x192.png"
const DEFAULT_BADGE = "/icons/icon-192x192.png"
const DEFAULT_CLICK_URL = "/"
const DEFAULT_TITLE = "Helping Hands Notification"

function getSupabaseRestConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase REST env vars")
  }

  return { url, serviceRoleKey }
}

function hasSupabaseRestConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

async function supabaseRest(path, init) {
  const { url, serviceRoleKey } = getSupabaseRestConfig()

  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  })

  const text = await response.text()
  let data = null

  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }

  if (!response.ok) {
    const message = data?.message || data?.error || response.statusText
    throw new Error(message)
  }

  return data
}

function buildDeleteInFilter(ids) {
  return ids.join(",")
}

export async function saveNotificationSubscription(payload) {
  if (!payload?.uid) {
    throw new Error("Missing uid")
  }

  if (!hasSupabaseRestConfig()) {
    return { type: payload.type, message: "Notification storage skipped (Supabase env not configured)" }
  }

  if (payload.type === "fcm") {
    if (!payload.token) {
      throw new Error("Missing FCM token")
    }

    try {
      await supabaseRest("notification_fcm_tokens?on_conflict=token", {
        method: "POST",
        headers: {
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify({
          user_id: payload.uid,
          token: payload.token,
        }),
      })
    } catch (error) {
      return { type: "fcm", message: `FCM token received but not stored: ${error instanceof Error ? error.message : "unknown error"}` }
    }

    return { type: "fcm", message: "FCM token saved" }
  }

  const endpoint = payload.subscription?.endpoint
  const p256dh = payload.subscription?.keys?.p256dh || null
  const auth = payload.subscription?.keys?.auth || null

  if (!endpoint || !p256dh || !auth) {
    throw new Error("Missing webpush endpoint or keys")
  }

  try {
    await supabaseRest("notification_webpush_subscriptions?on_conflict=endpoint", {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        user_id: payload.uid,
        endpoint,
        p256dh_key: p256dh,
        auth_key: auth,
        expiration_time: payload.subscription?.expirationTime || null,
      }),
    })
  } catch (error) {
    return { type: "webpush", message: `Web Push subscription received but not stored: ${error instanceof Error ? error.message : "unknown error"}` }
  }

  return { type: "webpush", message: "Web Push subscription saved" }
}

export async function sendNotificationToUser(payload) {
  if (!payload?.uid) {
    throw new Error("Missing uid")
  }

  const title = payload.title || DEFAULT_TITLE
  const body = payload.body || ""
  const icon = payload.icon || DEFAULT_ICON
  const badge = payload.badge || DEFAULT_BADGE
  const clickUrl = payload.clickUrl || DEFAULT_CLICK_URL

  const stats = {
    fcmAttempted: 0,
    fcmSent: 0,
    fcmFailed: 0,
    webpushAttempted: 0,
    webpushSent: 0,
    webpushFailed: 0,
    cleaned: 0,
    skipped: false,
    reason: "",
  }

  if (!hasSupabaseRestConfig()) {
    stats.skipped = true
    stats.reason = "Supabase env not configured"
    return stats
  }

  let fcmRows = []
  let webpushRows = []

  try {
    fcmRows =
      (await supabaseRest(
        `notification_fcm_tokens?select=id,token&user_id=eq.${encodeURIComponent(payload.uid)}`,
        { method: "GET", headers: { Prefer: "return=representation" } },
      )) || []
  } catch (error) {
    stats.reason = `FCM token lookup failed: ${error instanceof Error ? error.message : "unknown error"}`
  }

  try {
    webpushRows =
      (await supabaseRest(
        `notification_webpush_subscriptions?select=id,endpoint,p256dh_key,auth_key&user_id=eq.${encodeURIComponent(payload.uid)}`,
        { method: "GET", headers: { Prefer: "return=representation" } },
      )) || []
  } catch (error) {
    stats.reason = stats.reason || `Web Push lookup failed: ${error instanceof Error ? error.message : "unknown error"}`
  }

  if (fcmRows?.length) {
    const messaging = getFirebaseMessaging()
    const deadTokenIds = []

    for (const row of fcmRows) {
      stats.fcmAttempted += 1
      try {
        await messaging.send({
          token: row.token,
          notification: { title, body },
          webpush: {
            notification: { title, body, icon },
            fcmOptions: { link: clickUrl },
          },
          android: { priority: "high" },
        })
        stats.fcmSent += 1
      } catch (error) {
        stats.fcmFailed += 1
        const code = error?.code || ""
        if (code.includes("registration-token-not-registered") || code.includes("invalid-argument")) {
          deadTokenIds.push(row.id)
        }
      }
    }

    if (deadTokenIds.length) {
      try {
        await supabaseRest(`notification_fcm_tokens?id=in.(${buildDeleteInFilter(deadTokenIds)})`, {
          method: "DELETE",
        })
        stats.cleaned += deadTokenIds.length
      } catch (error) {
        console.error("[notifications] Failed to delete dead FCM tokens:", error)
      }
    }
  }

  const wp = getWebPush()
  if (wp && webpushRows?.length) {
    const deadEndpointIds = []

    for (const row of webpushRows) {
      stats.webpushAttempted += 1
      try {
        await wp.sendNotification(
          {
            endpoint: row.endpoint,
            keys: {
              p256dh: row.p256dh_key,
              auth: row.auth_key,
            },
          },
          JSON.stringify({ title, body, icon, badge, clickUrl }),
        )
        stats.webpushSent += 1
      } catch (error) {
        stats.webpushFailed += 1
        const statusCode = error?.statusCode || 0
        if (statusCode === 404 || statusCode === 410) {
          deadEndpointIds.push(row.id)
        }
      }
    }

    if (deadEndpointIds.length) {
      try {
        await supabaseRest(`notification_webpush_subscriptions?id=in.(${buildDeleteInFilter(deadEndpointIds)})`, {
          method: "DELETE",
        })
        stats.cleaned += deadEndpointIds.length
      } catch (error) {
        console.error("[notifications] Failed to delete dead webpush endpoints:", error)
      }
    }
  }

  return stats
}

export async function hasNotificationSubscription(uid) {
  if (!uid) {
    throw new Error("Missing uid")
  }

  if (!hasSupabaseRestConfig()) {
    return {
      hasAny: false,
      hasFcm: false,
      hasWebpush: false,
      reason: "Supabase env not configured",
    }
  }

  let fcmRows = []
  let webpushRows = []

  try {
    fcmRows =
      (await supabaseRest(
        `notification_fcm_tokens?select=id&user_id=eq.${encodeURIComponent(uid)}&limit=1`,
        { method: "GET", headers: { Prefer: "return=representation" } },
      )) || []
  } catch (error) {
    console.error("[notifications] FCM status lookup failed:", error)
  }

  try {
    webpushRows =
      (await supabaseRest(
        `notification_webpush_subscriptions?select=id&user_id=eq.${encodeURIComponent(uid)}&limit=1`,
        { method: "GET", headers: { Prefer: "return=representation" } },
      )) || []
  } catch (error) {
    console.error("[notifications] Webpush status lookup failed:", error)
  }

  const hasFcm = Array.isArray(fcmRows) && fcmRows.length > 0
  const hasWebpush = Array.isArray(webpushRows) && webpushRows.length > 0

  return {
    hasAny: hasFcm || hasWebpush,
    hasFcm,
    hasWebpush,
  }
}

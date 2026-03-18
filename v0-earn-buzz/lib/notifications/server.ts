import { getFirebaseMessaging } from "@/lib/notifications/firebase-admin"
import { configureWebPush, webpush } from "@/lib/notifications/web-push"
import type { NotificationSendPayload, NotificationSubscribePayload } from "@/lib/notifications/types"

const DEFAULT_ICON = "/icons/icon-192x192.png"
const DEFAULT_BADGE = "/icons/icon-192x192.png"
const DEFAULT_CLICK_URL = "/"
const DEFAULT_TITLE = "Helping Hands Notification"

type FcmTokenRow = {
  id: number
  token: string
}

type WebPushRow = {
  id: number
  endpoint: string
  p256dh_key: string
  auth_key: string
}

function getSupabaseRestConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase REST env vars")
  }

  return { url, serviceRoleKey }
}

async function supabaseRest(path: string, init?: RequestInit) {
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
  let data: any = null

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

function buildDeleteInFilter(ids: number[]) {
  return ids.join(",")
}

export async function saveNotificationSubscription(payload: NotificationSubscribePayload) {
  if (!payload.uid) {
    throw new Error("Missing uid")
  }

  if (payload.type === "fcm") {
    if (!payload.token) {
      throw new Error("Missing FCM token")
    }

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

    return { type: "fcm", message: "FCM token saved" }
  }

  const endpoint = payload.subscription?.endpoint
  const p256dh = payload.subscription?.keys?.p256dh || null
  const auth = payload.subscription?.keys?.auth || null

  if (!endpoint || !p256dh || !auth) {
    throw new Error("Missing webpush endpoint or keys")
  }

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

  return { type: "webpush", message: "Web Push subscription saved" }
}

export async function sendNotificationToUser(payload: NotificationSendPayload) {
  if (!payload.uid) {
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
  }

  const fcmRows = (await supabaseRest(
    `notification_fcm_tokens?select=id,token&user_id=eq.${encodeURIComponent(payload.uid)}`,
    { method: "GET", headers: { Prefer: "return=representation" } },
  )) as FcmTokenRow[]

  const webpushRows = (await supabaseRest(
    `notification_webpush_subscriptions?select=id,endpoint,p256dh_key,auth_key&user_id=eq.${encodeURIComponent(payload.uid)}`,
    { method: "GET", headers: { Prefer: "return=representation" } },
  )) as WebPushRow[]

  if (fcmRows?.length) {
    const messaging = getFirebaseMessaging()
    const deadTokenIds: number[] = []

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
      } catch (error: any) {
        stats.fcmFailed += 1
        const code = error?.code || ""
        if (code.includes("registration-token-not-registered") || code.includes("invalid-argument")) {
          deadTokenIds.push(row.id)
        }
      }
    }

    if (deadTokenIds.length) {
      await supabaseRest(`notification_fcm_tokens?id=in.(${buildDeleteInFilter(deadTokenIds)})`, {
        method: "DELETE",
      })
      stats.cleaned += deadTokenIds.length
    }
  }

  if (webpushRows?.length) {
    configureWebPush()
    const deadEndpointIds: number[] = []

    for (const row of webpushRows) {
      stats.webpushAttempted += 1
      try {
        await webpush.sendNotification(
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
      } catch (error: any) {
        stats.webpushFailed += 1
        const statusCode = error?.statusCode || 0
        if (statusCode === 404 || statusCode === 410) {
          deadEndpointIds.push(row.id)
        }
      }
    }

    if (deadEndpointIds.length) {
      await supabaseRest(`notification_webpush_subscriptions?id=in.(${buildDeleteInFilter(deadEndpointIds)})`, {
        method: "DELETE",
      })
      stats.cleaned += deadEndpointIds.length
    }
  }

  return stats
}

export async function hasNotificationSubscription(uid: string) {
  if (!uid) {
    throw new Error("Missing uid")
  }

  let hasFcm = false
  let hasWebpush = false

  try {
    const fcmRows = (await supabaseRest(
      `notification_fcm_tokens?select=id&user_id=eq.${encodeURIComponent(uid)}&limit=1`,
      { method: "GET", headers: { Prefer: "return=representation" } },
    )) as Array<{ id: number }>
    hasFcm = Array.isArray(fcmRows) && fcmRows.length > 0
  } catch (error) {
    console.error("[notifications] FCM status lookup failed:", error)
  }

  try {
    const webpushRows = (await supabaseRest(
      `notification_webpush_subscriptions?select=id&user_id=eq.${encodeURIComponent(uid)}&limit=1`,
      { method: "GET", headers: { Prefer: "return=representation" } },
    )) as Array<{ id: number }>
    hasWebpush = Array.isArray(webpushRows) && webpushRows.length > 0
  } catch (error) {
    console.error("[notifications] Webpush status lookup failed:", error)
  }

  return {
    hasAny: hasFcm || hasWebpush,
    hasFcm,
    hasWebpush,
  }
}

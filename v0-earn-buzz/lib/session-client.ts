const SESSION_COOKIE_KEY = "tivexx-session"
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30
const LOCAL_KEY = "tivexx-user"

export type SessionUser = {
  id?: string
  userId?: string
  name?: string
  email?: string
  balance?: number
  hasMomoNumber?: boolean
  [key: string]: unknown
}

function encode(value: string) {
  return btoa(unescape(encodeURIComponent(value)))
}

function decode(value: string) {
  return decodeURIComponent(escape(atob(value)))
}

function cookieFlags() {
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : ""
  return `${secure}`
}

export function persistUserSession(user: SessionUser) {
  if (typeof window === "undefined") return

  const serialized = JSON.stringify(user)
  try {
    localStorage.setItem(LOCAL_KEY, serialized)
  } catch {}
  try {
    let cookiePayload = serialized
    if (serialized.length > 3500) {
      const minimal = JSON.stringify({
        id: user.id,
        userId: user.userId,
        email: user.email,
        name: user.name,
      })
      cookiePayload = minimal
    }
    document.cookie = `${SESSION_COOKIE_KEY}=${encode(cookiePayload)}; Max-Age=${SESSION_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${cookieFlags()}`
  } catch {}
}

export function restoreUserSessionFromCookie(): SessionUser | null {
  if (typeof window === "undefined") return null

  const cookies = document.cookie.split(";").map((cookie) => cookie.trim())
  const sessionCookie = cookies.find((cookie) => cookie.startsWith(`${SESSION_COOKIE_KEY}=`))

  if (!sessionCookie) return null

  try {
    const encoded = sessionCookie.slice(SESSION_COOKIE_KEY.length + 1) || ""
    const decoded = decode(encoded)
    const user = JSON.parse(decoded) as SessionUser

    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(user))
    } catch {}
    return user
  } catch (error) {
    console.error("[session] Failed to restore cookie session:", error)
    return null
  }
}

const EXACT_KEYS = [
  "tivexx-user",
  "tivexx-bank-details",
  "bank_details",
  "tivexx-referral-vip",
  "tivexx-vip-redeemed",
  "tivexx-referral-withdraws",
  "tivexx-trust-meta",
  "tivexx-trust-time-ms",
  "tivexx-pending-ref",
  "tivexx-last-synced-referrals",
  "tivexx-just-authenticated",
  "tivexx-auth-time",
  "tivexx-welcome-popup-shown",
  "pwa_install_dismissed_at",
  "sw-last-reload",
  "auto_tap_ref_code",
  "auto_tap_state",
  "auto_tap_plan_cooldowns",
]

const PREFIX_KEYS = [
  "auto_ref_count_",
  "mt-",
  "mu-",
  "tivexx-completed",
  "tivexx-task-cooldowns",
  "tivexx-claim",
  "tivexx-timer",
  "tivexx-pause",
]

export function clearUserSession() {
  if (typeof window === "undefined") return

  try {
    for (const key of EXACT_KEYS) {
      try {
        localStorage.removeItem(key)
      } catch {}
    }
    try {
      const toRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && PREFIX_KEYS.some((p) => k.startsWith(p))) toRemove.push(k)
      }
      for (const k of toRemove) {
        try {
          localStorage.removeItem(k)
        } catch {}
      }
    } catch {}
  } catch {}

  try {
    document.cookie = `${SESSION_COOKIE_KEY}=; Max-Age=0; Path=/; SameSite=Lax`
  } catch {}
  try {
    document.cookie = `pending_ref=; Max-Age=0; Path=/; SameSite=Lax`
  } catch {}

  // Best-effort Supabase sign-out (do not block logout on failure)
  try {
    void import("@/lib/supabase/client")
      .then((mod) => {
        try {
          const sb = (mod as any)?.supabase
          if (sb?.auth?.signOut) void sb.auth.signOut().catch(() => {})
        } catch {}
      })
      .catch(() => {})
  } catch {}
}

export function initSessionSync(onChange: (user: SessionUser | null) => void) {
  if (typeof window === "undefined") return () => {}
  const handler = (e: StorageEvent) => {
    if (e.key !== LOCAL_KEY) return
    try {
      if (!e.newValue) {
        onChange(null)
        return
      }
      onChange(JSON.parse(e.newValue) as SessionUser)
    } catch {
      onChange(null)
    }
  }
  window.addEventListener("storage", handler)
  return () => window.removeEventListener("storage", handler)
}

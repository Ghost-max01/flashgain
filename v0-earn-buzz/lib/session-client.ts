const SESSION_COOKIE_KEY = "tivexx-session"
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30
const LOCAL_KEY = "tivexx-user"
// Dedicated picture store — survives user-object overwrites (balance syncs,
// server refreshes, cookie restores). Scoped per user so accounts don't leak.
// Picture stays until cookies/storage are cleared or user changes it.
const PICTURE_KEY = "tivexx-profile-picture"

function pictureKeyFor(user?: SessionUser | null): string {
  try {
    const id = String(
      (user as any)?.userId || (user as any)?.id || (user as any)?.email || "",
    ).trim().toLowerCase()
    return id ? `${PICTURE_KEY}:${id}` : PICTURE_KEY
  } catch {
    return PICTURE_KEY
  }
}

export function getPersistedProfilePicture(user?: SessionUser | null): string | null {
  if (typeof window === "undefined") return null
  try {
    // Per-user scoped key first (no cross-account leaks).
    const scoped = localStorage.getItem(pictureKeyFor(user))
    if (scoped && scoped.startsWith("data:image")) return scoped
    // Generic fallback ONLY when user identity matches or is unknown —
    // prevents a previous account's photo leaking into a new signup/login.
    try {
      const raw = localStorage.getItem(LOCAL_KEY)
      const existing = raw ? (JSON.parse(raw) as any) : null
      const newId = String((user as any)?.userId || (user as any)?.id || (user as any)?.email || "").trim().toLowerCase()
      const existId = String(existing?.userId || existing?.id || existing?.email || "").trim().toLowerCase()
      if (!newId || !existId || newId === existId) {
        const generic = localStorage.getItem(PICTURE_KEY)
        if (generic && generic.startsWith("data:image")) return generic
      }
    } catch {}
    const inline = String((user as any)?.profilePicture || "")
    if (inline.startsWith("data:image")) return inline
  } catch {}
  return null
}

function stashProfilePicture(user: SessionUser) {
  try {
    const pic = String((user as any)?.profilePicture || "")
    if (pic.startsWith("data:image")) {
      try { localStorage.setItem(PICTURE_KEY, pic) } catch {}
      try { localStorage.setItem(pictureKeyFor(user), pic) } catch {}
    }
  } catch {}
}

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

  // Never drop an existing picture when caller passes a fresh object without one.
  try {
    if (!(user as any)?.profilePicture) {
      const kept = getPersistedProfilePicture(user)
      if (kept) (user as any).profilePicture = kept
    } else {
      stashProfilePicture(user)
    }
  } catch {}

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
    const cookieUser = JSON.parse(decoded) as SessionUser

    // MERGE — never wipe picture: cookie is minimal (no picture) by design.
    // Preserve picture from localStorage / dedicated picture key.
    try {
      const existingRaw = localStorage.getItem(LOCAL_KEY)
      const existing = existingRaw ? (JSON.parse(existingRaw) as SessionUser) : null
      const keptPic = getPersistedProfilePicture(cookieUser) || getPersistedProfilePicture(existing)
      const merged: SessionUser = { ...(existing || {}), ...cookieUser }
      if (keptPic) (merged as any).profilePicture = keptPic
      // If cookie names a DIFFERENT account, don't leak the old picture.
      try {
        const cookieId = String((cookieUser as any)?.userId || (cookieUser as any)?.id || (cookieUser as any)?.email || "").trim().toLowerCase()
        const existId = String((existing as any)?.userId || (existing as any)?.id || (existing as any)?.email || "").trim().toLowerCase()
        if (cookieId && existId && cookieId !== existId) {
          const scoped = localStorage.getItem(pictureKeyFor(cookieUser))
          if (scoped && scoped.startsWith("data:image")) (merged as any).profilePicture = scoped
          else delete (merged as any).profilePicture
        }
      } catch {}
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(merged))
      } catch {}
      return merged
    } catch {
      return cookieUser
    }
  } catch (error) {
    console.error("[session] Failed to restore cookie session:", error)
    return null
  }
}

const EXACT_KEYS = [
  "tivexx-user",
  "tivexx-profile-picture",
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
    // Per-user scoped picture keys (tivexx-profile-picture:*) — fresh start clears all.
    try {
      const scoped: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith(`${PICTURE_KEY}:`)) scoped.push(k)
      }
      for (const k of scoped) {
        try { localStorage.removeItem(k) } catch {}
      }
    } catch {}
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

const SESSION_COOKIE_KEY = "tivexx-session"
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

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

export function persistUserSession(user: SessionUser) {
  if (typeof window === "undefined") return

  const serialized = JSON.stringify(user)
  localStorage.setItem("tivexx-user", serialized)

  document.cookie = `${SESSION_COOKIE_KEY}=${encode(serialized)}; Max-Age=${SESSION_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`
}

export function restoreUserSessionFromCookie(): SessionUser | null {
  if (typeof window === "undefined") return null

  const cookies = document.cookie.split(";").map((cookie) => cookie.trim())
  const sessionCookie = cookies.find((cookie) => cookie.startsWith(`${SESSION_COOKIE_KEY}=`))

  if (!sessionCookie) return null

  try {
    const encoded = sessionCookie.split("=")[1] || ""
    const decoded = decode(encoded)
    const user = JSON.parse(decoded) as SessionUser

    localStorage.setItem("tivexx-user", JSON.stringify(user))
    return user
  } catch (error) {
    console.error("[session] Failed to restore cookie session:", error)
    return null
  }
}

export function clearUserSession() {
  if (typeof window === "undefined") return

  localStorage.removeItem("tivexx-user")
  document.cookie = `${SESSION_COOKIE_KEY}=; Max-Age=0; Path=/; SameSite=Lax`
}

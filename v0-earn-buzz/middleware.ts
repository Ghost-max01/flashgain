import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const url = new URL(request.url)
  if (url.pathname.startsWith('/_next') || url.pathname === '/favicon.ico') return NextResponse.next()

  // Capture referral code from any page (?ref=, ?referral=, ?code=, ?r=) and persist in cookie for 30 days
  // Only accept /^[A-Z0-9-]{4,32}$/ after trim/uppercase (AUTO codes accepted for compat, capped at 32).
  const refKeys = ["ref", "referral", "referral_code", "code", "r"]
  let pendingRef: string | null = null
  for (const k of refKeys) {
    const v = url.searchParams.get(k)
    if (v && v.trim()) {
      const candidate = v.trim().toUpperCase().slice(0, 32)
      if (/^[A-Z0-9-]{4,32}$/.test(candidate)) { pendingRef = candidate; break }
    }
  }

  const buildResponse = (res: NextResponse) => {
    if (pendingRef) {
      const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase()
      const isHttps = forwardedProto === "https" || url.protocol === "https:"
      res.cookies.set("pending_ref", encodeURIComponent(pendingRef), {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        sameSite: "lax",
        ...(isHttps ? { secure: true } : {}),
      })
    }
    return res
  }

  return buildResponse(NextResponse.next())
}

export const config = {
  matcher: ['/register/:path*', '/login/:path*', '/refer', '/refer/:path*', '/api/:path*'],
}

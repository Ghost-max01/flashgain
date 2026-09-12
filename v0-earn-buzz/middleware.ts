import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const url = new URL(request.url)
  if (url.pathname.startsWith('/_next') || url.pathname === '/favicon.ico') return NextResponse.next()

  // Capture referral code from any page (?ref=, ?referral=, ?code=, ?r=) and persist in cookie for 30 days
  const refKeys = ["ref", "referral", "referral_code", "code", "r"]
  let pendingRef: string | null = null
  for (const k of refKeys) {
    const v = url.searchParams.get(k)
    if (v && v.trim()) { pendingRef = v.trim().toUpperCase(); break }
  }

  const buildResponse = (res: NextResponse) => {
    if (pendingRef) {
      res.cookies.set("pending_ref", encodeURIComponent(pendingRef), {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        sameSite: "lax",
      })
    }
    return res
  }

  // Only fix API routes
  if (url.pathname.startsWith('/api/')) {
    const headers = new Headers(request.headers)
    const token = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    const res = NextResponse.next({ request: { headers } })
    return buildResponse(res)
  }

  return buildResponse(NextResponse.next())
}

export const config = {
  matcher: ['/register/:path*', '/login/:path*', '/refer', '/refer/:path*', '/api/:path*'],
}

"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { CheckCircle, Loader2, Home } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { persistUserSession } from "@/lib/session-client"

function CallbackInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const [status, setStatus] = useState<"verifying" | "success" | "failed">("verifying")
  const [msg, setMsg] = useState("Verifying your payment...")
  const reference = searchParams.get("reference") || searchParams.get("trxref") || ""

  useEffect(() => {
    if (!reference) {
      setStatus("failed")
      setMsg("Missing payment reference.")
      return
    }
    let cancelled = false
    async function verify() {
      try {
        const res = await fetch(`/api/paystack/verify?reference=${encodeURIComponent(reference)}`)
        const data = await res.json()
        if (!data?.success) {
          if (!cancelled) { setStatus("failed"); setMsg(data?.error || "Payment not successful") }
          return
        }
        const amount = Number(data.amount || 0)
        const metadata = data.metadata || {}
        const type = metadata.type

        // Update local balance immediately (mirror server-side increment)
        // Server already credited Supabase; also update localStorage for instant UI
        try {
          const raw = localStorage.getItem("tivexx-user")
          if (raw) {
            const u = JSON.parse(raw)
            // Avoid double credit if callback is revisited — check processed reference
            const seenKey = `paystack_ref_${reference}`
            if (!localStorage.getItem(seenKey)) {
              // Server already credited, but local still needs sync — fetch latest or increment
              // Fetch latest balance from server if userId known
              const uid = u.id || u.userId
              if (uid) {
                try {
                  const r = await fetch(`/api/user-balance?userId=${uid}`)
                  const j = await r.json()
                  if (j?.success && typeof j.balance === "number") u.balance = j.balance
                  else u.balance = Number(u.balance || 0) + amount
                } catch { u.balance = Number(u.balance || 0) + amount }
              } else {
                u.balance = Number(u.balance || 0) + amount
              }
              localStorage.setItem("tivexx-user", JSON.stringify(u))
              persistUserSession(u)
              localStorage.setItem(seenKey, "1")
            }
          }
        } catch {}

        // Activate auto tap if this was an auto_tap payment
        if (type === "auto_tap" && metadata.planId) {
          try {
            const planId = metadata.planId
            const durationMap: Record<string, number> = { "24h": 86400000, "2d": 172800000, "3d": 259200000, "1w": 604800000, free1h: 3600000 }
            const duration = durationMap[planId] || 86400000
            const tapsMap: Record<string, number> = { "24h": 1500, "2d": 3500, "3d": 5500, "1w": 10000, free1h: 600 }
            localStorage.setItem("auto_tap_state", JSON.stringify({
              active: true,
              planId,
              expiresAt: Date.now() + duration,
              tapsDone: 0,
              firstFreeUsed: planId === "free1h" ? true : JSON.parse(localStorage.getItem("auto_tap_state") || "null")?.firstFreeUsed || false,
            }))
            // 1-week lock per paid plan
            if (planId !== "free1h") {
              const cdRaw = JSON.parse(localStorage.getItem("auto_tap_plan_cooldowns") || "{}")
              cdRaw[planId] = Date.now() + 7*24*60*60*1000
              localStorage.setItem("auto_tap_plan_cooldowns", JSON.stringify(cdRaw))
            }
            // Store proof that this plan was paid
            localStorage.setItem(`auto_tap_paid_${planId}`, reference)
          } catch {}
        }

        // Investment: amount already added to balance; optional flag
        if (type === "investment") {
          try {
            const existing = JSON.parse(localStorage.getItem("investment_history") || "[]")
            existing.unshift({ reference, amount, plan: metadata.plan, at: Date.now() })
            localStorage.setItem("investment_history", JSON.stringify(existing))
          } catch {}
        }

        if (!cancelled) {
          setStatus("success")
          const extra = type === "auto_tap" ? `Auto Tap ${metadata.planId} activated!` : type === "investment" ? `Investment ₦${amount.toLocaleString()} activated!` : `₦${amount.toLocaleString()} added to balance!`
          setMsg(extra)
          toast({ title: "Payment verified ✓", description: extra })
          setTimeout(() => router.replace(type === "investment" ? "/dashboard" : "/dashboard"), 2500)
        }
      } catch (e) {
        if (!cancelled) { setStatus("failed"); setMsg("Verification error — contact support with ref " + reference) }
      }
    }
    verify()
    return () => { cancelled = true }
  }, [reference])

  return (
    <div className="hh-root min-h-screen flex items-center justify-center p-6">
      <div className="hh-bubbles-container" aria-hidden="true">{[...Array(6)].map((_, i) => <div key={i} className={`hh-bubble hh-bubble-${i+1}`}></div>)}</div>
      <div className="hh-mesh-overlay" aria-hidden="true"></div>
      <div className="max-w-md w-full hh-card text-center relative z-10">
        {status === "verifying" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-emerald-400" />
            <h2 className="mt-4 font-black text-lg">Verifying payment...</h2>
            <p className="text-sm text-white/60 mt-1">Ref: {reference}</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="h-12 w-12 mx-auto text-emerald-400" />
            <h2 className="mt-3 font-black text-xl">Payment successful ✓</h2>
            <p className="text-sm text-white/70 mt-2">{msg}</p>
            <p className="text-xs text-white/50 mt-1">Redirecting...</p>
            <Link href="/dashboard" className="mt-4 inline-flex items-center gap-2 rounded-full hh-btn-primary px-6 py-2.5 font-black"><Home className="h-4 w-4" /> Dashboard</Link>
          </>
        )}
        {status === "failed" && (
          <>
            <h2 className="mt-2 font-black text-lg">Verification failed</h2>
            <p className="text-sm text-white/60 mt-2">{msg}</p>
            <p className="text-xs text-white/40 mt-1 break-all">Ref: {reference || "—"}</p>
            <div className="mt-4 flex gap-2 justify-center">
              <Link href="/dashboard" className="rounded-full border border-white/10 px-5 py-2.5 font-bold text-sm">Dashboard</Link>
              <a href="mailto:support@flashgain.online" className="rounded-full hh-btn-primary px-5 py-2.5 font-black text-sm">Contact support</a>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function PaystackCallbackPage() {
  return (
    <Suspense fallback={<div className="hh-root min-h-screen flex items-center justify-center text-white/60 text-sm">Loading...</div>}>
      <CallbackInner />
    </Suspense>
  )
}

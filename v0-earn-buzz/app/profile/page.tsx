"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Camera, User, Landmark, History, HelpCircle, ChevronRight, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { loadMeta, computeScore, getLevel } from "@/lib/trust-score"
import { safeParse } from "@/lib/safe-storage"
import { BottomNav } from "@/components/bottom-nav"

interface UserData {
  name: string
  email: string
  balance: number
  profilePicture?: string
  id?: string
  userId?: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [showBeginnerPopup, setShowBeginnerPopup] = useState(false)
  const [trustScore, setTrustScore] = useState(0)

  useEffect(() => {
    const storedUser = localStorage.getItem("tivexx-user")
    if (!storedUser) {
      router.push("/login")
      return
    }
    const user = safeParse<any>(storedUser, null)
    if (!user) {
      router.push("/login")
      return
    }
    // Re-attach persisted picture (survives reloads unless storage cleared).
    import("@/lib/session-client").then((s) => {
      try {
        const kept = (s as any).getPersistedProfilePicture?.(user)
        if (kept && !user.profilePicture) {
          user.profilePicture = kept
          try { localStorage.setItem("tivexx-user", JSON.stringify(user)) } catch {}
        }
      } catch {}
    }).catch(() => {})
    setUserData(user)
    try { setTrustScore(computeScore(loadMeta())) } catch {}
    // Live-sync if dashboard/other tab updates picture or name.
    let unsub: (() => void) | undefined
    import("@/lib/profile-picture").then((m) => {
      try { unsub = m.subscribeToUserUpdates((u: any) => { if (u) setUserData((prev) => ({ ...(prev || {} as UserData), ...u })) }) } catch {}
    }).catch(() => {})
    return () => { try { unsub?.() } catch {} }
  }, [router])

  // Photo + password live inside Edit details (/profile/information).
  const goEditDetails = () => router.push("/profile/information")

  // Change account number is gated at Beginner (trust score 30+).
  const handleChangeAccountNumber = () => {
    if (trustScore >= 30) {
      router.push("/setup-bank?edit=1")
    } else {
      setShowBeginnerPopup(true)
    }
  }

  if (!userData) {
    return <div className="p-6 text-center text-white">Loading...</div>
  }

  const level = getLevel(trustScore)
  const initial = String(userData.name || "U").trim().charAt(0).toUpperCase()

  const rows: {
    icon: React.ElementType
    tint: string
    title: string
    sub: string
    action: "link" | "account"
    href?: string
  }[] = [
    { icon: User, tint: "pf-tint-emerald", title: "Edit details", sub: "Photo, name, info and password", action: "link", href: "/profile/information" },
    { icon: Landmark, tint: "pf-tint-amber", title: "Change account number", sub: trustScore >= 30 ? "Update your payout account" : "Reach Beginner to unlock", action: "account" },
    { icon: History, tint: "pf-tint-cyan", title: "History", sub: "Tasks, referrals, withdrawals, purchases", action: "link", href: "/history" },
    { icon: HelpCircle, tint: "pf-tint-blue", title: "Help & Support", sub: "Chat with support", action: "link", href: "/chats" },
  ]

  return (
    <div className="hh-root min-h-screen pb-28 relative overflow-hidden">
      <div className="hh-bubbles-container" aria-hidden="true">
        {[...Array(12)].map((_, i) => (
          <div key={i} className={`hh-bubble hh-bubble-${i + 1}`}></div>
        ))}
      </div>
      <div className="hh-mesh-overlay" aria-hidden="true"></div>

      {/* Header */}
      <div className="sticky top-0 z-10 hh-header">
        <div className="max-w-md mx-auto px-6 pt-8 pb-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <button className="hh-back-btn" aria-label="Back">
                <ArrowLeft className="h-5 w-5" />
              </button>
            </Link>
            <div>
              <h1 className="hh-title">Profile</h1>
              <p className="hh-subtitle">Manage your account</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 space-y-4 pt-2 relative z-10 pb-6">
        {/* Identity card */}
        <div className="hh-card hh-entry-1">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0 cursor-pointer" onClick={goEditDetails} title="Edit details">
              {userData.profilePicture ? (
                <img src={userData.profilePicture} alt={userData.name} className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 border-2 border-emerald-500/50 flex items-center justify-center">
                  <span className="text-2xl font-black text-emerald-300">{initial}</span>
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#050d14] flex items-center justify-center">
                <Camera className="h-3 w-3 text-white" />
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-lg font-black text-white truncate">{userData.name}</div>
              <div className="text-xs text-white/50 truncate">{userData.email}</div>
              <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-black px-2.5 py-0.5 rounded-full border" style={{ color: level.color, borderColor: `${level.color}55`, background: `${level.color}18` }}>
                <ShieldCheck className="h-3 w-3" /> {level.label} • {trustScore}
              </span>
            </div>
          </div>
        </div>

        {/* Menu rows */}
        <div className="space-y-3 hh-entry-2">
          {rows.map((r) => {
            const Ico = r.icon
            const inner = (
              <div className="hh-card !p-4 flex items-center gap-3 hover:border-emerald-500/30 transition cursor-pointer">
                <span className={`pf-ico ${r.tint}`}>
                  <Ico className="h-5 w-5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-white">{r.title}</span>
                  <span className="block text-xs text-white/50">{r.sub}</span>
                </span>
                <ChevronRight className="h-5 w-5 text-white/30" />
              </div>
            )
            if (r.action === "link") return <Link key={r.title} href={r.href!}>{inner}</Link>
            return <button key={r.title} onClick={handleChangeAccountNumber} className="w-full text-left">{inner}</button>
          })}
        </div>
      </div>

      {/* Beginner gate popup */}
      {showBeginnerPopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="hh-popup max-w-sm w-full mx-4 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-3">
              <Landmark className="h-7 w-7 text-amber-300" />
            </div>
            <h2 className="text-xl font-black text-white">Beginner level required</h2>
            <p className="text-sm text-white/70 mt-2 leading-relaxed">
              You need to reach <span className="font-black text-emerald-300">Beginner</span> (trust score {trustScore}/30) to change your account number. Keep tapping, doing tasks and inviting friends.
            </p>
            <button onClick={() => setShowBeginnerPopup(false)} className="hh-popup-btn hh-popup-btn-confirm w-full mt-5">
              Got it
            </button>
          </div>
        </div>
      )}

      <BottomNav />

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800;900&display=swap');
        .hh-root { font-family: 'Syne', sans-serif; background: #050d14; color: white; min-height: 100vh; }
        .hh-bubbles-container { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
        .hh-bubble { position: absolute; border-radius: 50%; opacity: 0; animation: hh-bubble-rise linear infinite; }
        .hh-bubble-1 { width: 8px; height: 8px; left: 10%; background: radial-gradient(circle, rgba(16,185,129,0.6), transparent); animation-duration: 8s; }
        .hh-bubble-2 { width: 14px; height: 14px; left: 25%; background: radial-gradient(circle, rgba(59,130,246,0.5), transparent); animation-duration: 11s; animation-delay: 1.5s; }
        .hh-bubble-3 { width: 6px; height: 6px; left: 40%; background: radial-gradient(circle, rgba(16,185,129,0.7), transparent); animation-duration: 9s; animation-delay: 3s; }
        .hh-bubble-4 { width: 18px; height: 18px; left: 55%; background: radial-gradient(circle, rgba(139,92,246,0.4), transparent); animation-duration: 13s; animation-delay: 0.5s; }
        .hh-bubble-5 { width: 10px; height: 10px; left: 70%; background: radial-gradient(circle, rgba(16,185,129,0.5), transparent); animation-duration: 10s; animation-delay: 2s; }
        .hh-bubble-6 { width: 5px; height: 5px; left: 82%; background: radial-gradient(circle, rgba(52,211,153,0.8), transparent); animation-duration: 7s; animation-delay: 4s; }
        .hh-bubble-7 { width: 12px; height: 12px; left: 15%; background: radial-gradient(circle, rgba(59,130,246,0.4), transparent); animation-duration: 12s; animation-delay: 5s; }
        .hh-bubble-8 { width: 7px; height: 7px; left: 35%; background: radial-gradient(circle, rgba(16,185,129,0.6), transparent); animation-duration: 9.5s; animation-delay: 2.5s; }
        .hh-bubble-9 { width: 20px; height: 20px; left: 60%; background: radial-gradient(circle, rgba(16,185,129,0.2), transparent); animation-duration: 15s; animation-delay: 1s; }
        .hh-bubble-10 { width: 9px; height: 9px; left: 88%; background: radial-gradient(circle, rgba(139,92,246,0.5), transparent); animation-duration: 10.5s; animation-delay: 6s; }
        .hh-bubble-11 { width: 4px; height: 4px; left: 5%; background: radial-gradient(circle, rgba(52,211,153,0.9), transparent); animation-duration: 6.5s; animation-delay: 3.5s; }
        .hh-bubble-12 { width: 16px; height: 16px; left: 48%; background: radial-gradient(circle, rgba(59,130,246,0.3), transparent); animation-duration: 14s; animation-delay: 7s; }
        @keyframes hh-bubble-rise { 0% { transform: translateY(100vh) scale(0.5); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 0.6; } 100% { transform: translateY(-10vh) scale(1.2); opacity: 0; } }
        .hh-mesh-overlay { position: fixed; inset: 0; background: radial-gradient(ellipse 60% 40% at 20% 80%, rgba(16,185,129,0.07) 0%, transparent 60%), radial-gradient(ellipse 50% 50% at 80% 20%, rgba(59,130,246,0.06) 0%, transparent 60%); pointer-events: none; z-index: 0; }
        .hh-header { background: linear-gradient(180deg, rgba(5,13,20,0.95) 0%, rgba(5,13,20,0.8) 100%); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(16,185,129,0.15); }
        .hh-back-btn { width: 40px; height: 40px; border-radius: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; color: white; }
        .hh-title { font-size: 20px; font-weight: 800; color: white; line-height: 1.2; }
        .hh-subtitle { font-size: 12px; color: rgba(16,185,129,0.8); }
        .hh-card { background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 20px; backdrop-filter: blur(12px); position: relative; overflow: hidden; }
        .pf-ico { width: 42px; height: 42px; border-radius: 13px; display: flex; align-items: center; justify-content: center; shrink-0; border: 1px solid; }
        .pf-tint-emerald { background: rgba(16,185,129,0.12); border-color: rgba(16,185,129,0.3); color: #34d399; }
        .pf-tint-violet { background: rgba(139,92,246,0.12); border-color: rgba(139,92,246,0.3); color: #a78bfa; }
        .pf-tint-amber { background: rgba(245,158,11,0.12); border-color: rgba(245,158,11,0.3); color: #fbbf24; }
        .pf-tint-cyan { background: rgba(6,182,212,0.12); border-color: rgba(6,182,212,0.3); color: #22d3ee; }
        .pf-tint-blue { background: rgba(59,130,246,0.12); border-color: rgba(59,130,246,0.3); color: #60a5fa; }
        .hh-popup { background: linear-gradient(135deg, #0d1f2d, #0a1628); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 24px; box-shadow: 0 30px 60px rgba(0,0,0,0.5); }
        .hh-popup-btn { display: block; width: 100%; padding: 15px 16px; border-radius: 14px; font-weight: 800; font-size: 15px; border: none; cursor: pointer; }
        .hh-popup-btn-confirm { background: linear-gradient(135deg, #10b981, #059669); color: #fff; }
      `}</style>
    </div>
  )
}

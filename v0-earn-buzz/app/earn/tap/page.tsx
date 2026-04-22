"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Zap, HandCoins, Sparkles, TrendingUp, Crown, Star, CircleDollarSign } from "lucide-react"

const MAX_ENERGY = 100
const EARN_PER_TAP = 100
const ENERGY_REGEN_MS = 60000
const STORAGE_KEY = "tap_earn_state"

interface TapParticle {
  id: number
  x: number
  y: number
  emoji: string
}

const TAP_EMOJIS = ["💰", "⚡", "✨", "💎", "🔥"]

const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { energy: MAX_ENERGY, earned: 0, lastTime: Date.now() }
    const s = JSON.parse(raw)
    const elapsed = Date.now() - (s.lastTime || Date.now())
    const regen = Math.floor(elapsed / ENERGY_REGEN_MS)
    const energy = Math.min(MAX_ENERGY, (s.energy || 0) + regen)
    return { energy, earned: s.earned || 0, lastTime: Date.now() }
  } catch {
    return { energy: MAX_ENERGY, earned: 0, lastTime: Date.now() }
  }
}

export default function TapAndEarnPage() {
  const router = useRouter()
  const [state, setState] = useState(loadState)
  const [particles, setParticles] = useState<TapParticle[]>([])
  const [tapping, setTapping] = useState(false)
  const [tapCount, setTapCount] = useState(0)
  const [showPrompt, setShowPrompt] = useState(false)
  const particleId = useRef(0)
  const syncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, lastTime: Date.now() }))
  }, [state])

  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        if (prev.energy >= MAX_ENERGY) return prev
        return { ...prev, energy: Math.min(MAX_ENERGY, prev.energy + 1) }
      })
    }, ENERGY_REGEN_MS)
    return () => clearInterval(interval)
  }, [])

  const syncToDb = useCallback((earnedAmount: number) => {
    if (syncTimeout.current) clearTimeout(syncTimeout.current)
    syncTimeout.current = setTimeout(() => {
      try {
        const storedUser = localStorage.getItem("tivexx-user")
        if (storedUser) {
          const currentUser = JSON.parse(storedUser)
          if (currentUser.id) {
            // Add the earned amount to balance
            currentUser.balance = (currentUser.balance || 0) + earnedAmount
            localStorage.setItem("tivexx-user", JSON.stringify(currentUser))
            console.log(`[Tap Earn] Synced ₦${earnedAmount} to balance. New balance: ₦${currentUser.balance}`)
          }
        }
      } catch (error) {
        console.error("Sync error:", error)
      }
    }, 1500)
  }, [])

  const handleTap = useCallback(
    (e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
      if (state.energy <= 0) {
        setShowPrompt(true)
        return
      }

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      let clientX: number, clientY: number
      if ("touches" in e) {
        clientX = e.touches[0].clientX
        clientY = e.touches[0].clientY
      } else {
        clientX = e.clientX
        clientY = e.clientY
      }

      const id = particleId.current++
      const emoji = TAP_EMOJIS[id % TAP_EMOJIS.length]
      setParticles(prev => [...prev, { id, x: clientX - rect.left, y: clientY - rect.top, emoji }])
      setTimeout(() => setParticles(prev => prev.filter(p => p.id !== id)), 900)

      setTapping(true)
      setTapCount(prev => prev + 1)
      setTimeout(() => setTapping(false), 120)

      setState(prev => ({
        ...prev,
        energy: prev.energy - 1,
        earned: prev.earned + EARN_PER_TAP,
      }))

      // Sync the earned amount immediately to user balance
      syncToDb(EARN_PER_TAP)
    },
    [state.energy, syncToDb]
  )

  const energyPercent = (state.energy / MAX_ENERGY) * 100

  if (!mounted) return null

  return (
    <div className="min-h-screen pb-28 relative overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="hh-bubbles-container">
          {[...Array(8)].map((_, i) => (
            <div key={i} className={`hh-bubble hh-bubble-${i + 1}`}></div>
          ))}
        </div>
        <div className="hh-mesh-overlay"></div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 px-6 py-6 flex items-center gap-4 bg-gradient-to-b from-[#050d14]/95 to-[#050d14]/80 backdrop-blur-md border-b border-emerald-500/15 animate-fadeIn">
        <button
          onClick={() => router.push("/dashboard")}
          className="p-2.5 rounded-12 bg-white/5 hover:bg-white/10 transition-all duration-200 hover:scale-105 active:scale-95"
          title="Go back to dashboard"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-black tracking-tight text-white">Tap & Earn</h1>
          <p className="text-xs text-emerald-400/80 tracking-wide flex items-center gap-1 font-semibold">
            <Sparkles className="w-3 h-3" />
            ₦{EARN_PER_TAP} per tap
          </p>
        </div>
      </header>

      {/* Stats Row */}
      <div className="relative z-10 px-4 mb-6 mt-4 grid grid-cols-3 gap-3 animate-slideUp">
        <div className="glass-card p-4 text-center rounded-16 border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
          <CircleDollarSign className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
          <p className="text-xl font-black text-white">₦{state.earned.toLocaleString()}</p>
          <p className="text-xs uppercase tracking-wider text-emerald-300/60 font-bold mt-1">Earned</p>
        </div>
        <div className="glass-card p-4 text-center rounded-16 border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-amber-500/5">
          <TrendingUp className="w-5 h-5 text-amber-400 mx-auto mb-2" />
          <p className="text-xl font-black text-white">{tapCount}</p>
          <p className="text-xs uppercase tracking-wider text-amber-300/60 font-bold mt-1">Taps</p>
        </div>
        <div className="glass-card p-4 text-center rounded-16 border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-violet-500/5">
          <Crown className="w-5 h-5 text-violet-400 mx-auto mb-2" />
          <p className="text-xl font-black text-white">₦{EARN_PER_TAP}</p>
          <p className="text-xs uppercase tracking-wider text-violet-300/60 font-bold mt-1">Per Tap</p>
        </div>
      </div>

      {/* Main tap area */}
      <div className="flex-1 relative z-10 flex items-center justify-center px-4 py-8">
        <div className="relative">
          {/* Rotating rings */}
          <div className="absolute rounded-full animate-spin" style={{ inset: "-40px", border: "2px dashed rgba(16, 185, 129, 0.2)", animationDuration: "20s" }} />
          <div className="absolute rounded-full animate-spin" style={{ inset: "-25px", border: "1px solid rgba(16, 185, 129, 0.15)", animationDuration: "15s", animationDirection: "reverse" }} />

          {/* The orb */}
          <button
            onClick={handleTap}
            className={`relative w-56 h-56 rounded-full select-none outline-none border-none font-black transition-transform ${
              state.energy > 0 ? "cursor-pointer" : "cursor-not-allowed"
            } ${tapping ? "scale-90" : "scale-100"}`}
            style={{
              background:
                state.energy > 0
                  ? "radial-gradient(circle at 38% 32%, rgba(16, 185, 129, 0.9), rgb(16, 185, 129) 45%, rgba(16, 185, 129, 0.8) 100%)"
                  : "radial-gradient(circle at 38% 32%, rgba(107, 114, 128, 0.6), rgba(55, 65, 81, 0.8) 100%)",
              boxShadow:
                state.energy > 0
                  ? "inset 0 -10px 25px rgba(16, 185, 129, 0.6), inset 0 5px 20px rgba(52, 211, 153, 0.3), 0 0 60px rgba(16, 185, 129, 0.4)"
                  : "inset 0 -8px 20px rgba(0, 0, 0, 0.5)",
              opacity: state.energy > 0 ? 1 : 0.5,
            }}
            title="Tap to earn coins"
          >
            {/* Glass shine */}
            <div className="absolute top-5 left-10 w-20 h-10 rounded-full opacity-30" style={{background: "linear-gradient(180deg, rgba(255, 255, 255, 0.8), transparent)", filter: "blur(8px)"}} />

            {/* Center icon */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <div className="animate-bounce">
                <HandCoins className="w-16 h-16 text-white" strokeWidth={1.5} />
              </div>
              <span className="text-xs font-black text-white/70 uppercase tracking-widest animate-pulse">TAP</span>
            </div>

            {/* Orbiting stars */}
            {[0, 120, 240].map((deg) => (
              <div key={deg} className="absolute animate-spin" style={{ top: "50%", left: "50%", animationDuration: "8s" }}>
                <Star
                  className="text-amber-400/40"
                  size={12}
                  fill="currentColor"
                  style={{
                    transform: `rotate(${deg}deg) translateX(90px) rotate(-${deg}deg)`,
                  }}
                />
              </div>
            ))}

            {/* Tap particles */}
            {particles.map((p) => (
              <div
                key={p.id}
                className="absolute pointer-events-none flex flex-col items-center animate-particle"
                style={{
                  left: `${p.x}px`,
                  top: `${p.y}px`,
                }}
              >
                <span className="font-black text-lg text-emerald-400">+₦{EARN_PER_TAP}</span>
                <span className="text-lg">{p.emoji}</span>
              </div>
            ))}
          </button>
        </div>
      </div>

      {/* Energy bar section */}
      <div className="relative z-10 px-4 pb-8 pt-4 animate-slideUp" style={{animationDelay: "0.1s"}}>
        <div className="rounded-20 p-6 border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-emerald-500/0 backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="animate-pulse">
                <Zap className="w-5 h-5 text-amber-400" fill="currentColor" />
              </div>
              <span className="text-sm text-white font-bold">Energy</span>
            </div>
            <span className="font-black text-lg">
              <span className={state.energy <= 10 ? "text-red-400" : state.energy <= 30 ? "text-amber-400" : "text-emerald-400"}>
                {state.energy}
              </span>
              <span className="text-white/50"> / {MAX_ENERGY}</span>
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-4 rounded-full bg-white/5 overflow-hidden relative border border-white/10">
            <div
              className="h-full rounded-full relative overflow-hidden transition-all"
              style={{
                width: `${energyPercent}%`,
                background:
                  energyPercent > 30
                    ? "linear-gradient(90deg, rgb(16, 185, 129), rgb(52, 211, 153))"
                    : energyPercent > 10
                    ? "linear-gradient(90deg, rgb(251, 191, 36), rgb(245, 158, 11))"
                    : "linear-gradient(90deg, rgb(239, 68, 68), rgb(220, 38, 38))",
              }}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-white/60 font-semibold">
              Earning Rate:{" "}
              <span className="text-emerald-400 font-black">₦{EARN_PER_TAP.toLocaleString()}</span> per tap
            </p>
            {state.energy < MAX_ENERGY && (
              <p className="text-xs text-amber-400 flex items-center gap-1 font-bold">
                <Sparkles className="w-3 h-3" />
                Recharging...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Energy Depleted Modal */}
      {showPrompt && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fadeIn" onClick={() => setShowPrompt(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 max-w-[90%] z-50 animate-slideUp">
            <div className="rounded-24 p-6 border border-amber-500/30 bg-gradient-to-br from-[#050d14] via-[#051118] to-[#050d14] shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="w-6 h-6 text-amber-400" fill="currentColor" />
                <h2 className="text-2xl font-black text-white">Energy Depleted!</h2>
              </div>
              <p className="text-sm text-white/70 mb-6 leading-relaxed">
                You've used all your taps. Complete tasks to earn more energy or wait for it to recharge automatically!
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowPrompt(false)
                    router.push("/task")
                  }}
                  className="w-full py-3 rounded-14 font-black text-sm tracking-wide text-white flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg"
                  title="Complete tasks to earn more energy"
                >
                  <Star className="w-4 h-4" /> Complete Tasks
                </button>
                <button
                  onClick={() => setShowPrompt(false)}
                  className="w-full py-3 rounded-14 font-black text-sm tracking-wide border-2 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 transition-all"
                  title="Close this dialog"
                >
                  Come Back Later
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800;900&display=swap");

        .hh-bubbles-container {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }

        .hh-bubble {
          position: absolute;
          border-radius: 50%;
          opacity: 0;
          animation: hh-bubble-rise linear infinite;
        }

        .hh-bubble-1 { width: 8px; height: 8px; left: 10%; background: radial-gradient(circle, rgba(16,185,129,0.6), transparent); animation-duration: 8s; animation-delay: 0s; }
        .hh-bubble-2 { width: 14px; height: 14px; left: 25%; background: radial-gradient(circle, rgba(16,185,129,0.5), transparent); animation-duration: 11s; animation-delay: 1.5s; }
        .hh-bubble-3 { width: 6px; height: 6px; left: 40%; background: radial-gradient(circle, rgba(16,185,129,0.7), transparent); animation-duration: 9s; animation-delay: 3s; }
        .hh-bubble-4 { width: 18px; height: 18px; left: 55%; background: radial-gradient(circle, rgba(251,191,36,0.4), transparent); animation-duration: 13s; animation-delay: 0.5s; }
        .hh-bubble-5 { width: 10px; height: 10px; left: 70%; background: radial-gradient(circle, rgba(16,185,129,0.5), transparent); animation-duration: 10s; animation-delay: 2s; }
        .hh-bubble-6 { width: 5px; height: 5px; left: 82%; background: radial-gradient(circle, rgba(52,211,153,0.8), transparent); animation-duration: 7s; animation-delay: 4s; }
        .hh-bubble-7 { width: 12px; height: 12px; left: 15%; background: radial-gradient(circle, rgba(251,191,36,0.4), transparent); animation-duration: 12s; animation-delay: 5s; }
        .hh-bubble-8 { width: 7px; height: 7px; left: 35%; background: radial-gradient(circle, rgba(16,185,129,0.6), transparent); animation-duration: 9.5s; animation-delay: 2.5s; }

        @keyframes hh-bubble-rise {
          0% { transform: translateY(100vh) scale(0.5); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 0.6; }
          100% { transform: translateY(-10vh) scale(1.2); opacity: 0; }
        }

        .hh-mesh-overlay {
          position: fixed;
          inset: 0;
          background: radial-gradient(ellipse 60% 40% at 20% 80%, rgba(16,185,129,0.07) 0%, transparent 60%),
            radial-gradient(ellipse 50% 50% at 80% 20%, rgba(251,191,36,0.04) 0%, transparent 60%);
          pointer-events: none;
          z-index: 0;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes particle {
          0% { opacity: 1; transform: translateY(0) scale(0.6); }
          100% { opacity: 0; transform: translateY(-60px) scale(1.3); }
        }

        .animate-fadeIn { animation: fadeIn 0.5s ease-out; }
        .animate-slideUp { animation: slideUp 0.5s ease-out; }
        .animate-particle { animation: particle 0.8s ease-out forwards; }
      `}</style>
    </div>
  )
}

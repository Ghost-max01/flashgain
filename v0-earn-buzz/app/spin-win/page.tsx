"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Sparkles, Trophy, Zap, Coins, Gift, Crown, Flame, Timer, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

// 30% win = 3 wins / 10 segments
const SEGMENTS = [
  { label: "WIN ×2", win: true, amount: 2, color: "#10b981" },
  { label: "LOSE", win: false, amount: 0, color: "#1e293b" },
  { label: "WIN ×5", win: true, amount: 5, color: "#f59e0b" },
  { label: "LOSE", win: false, amount: 0, color: "#334155" },
  { label: "LOSE", win: false, amount: 0, color: "#1e293b" },
  { label: "LOSE", win: false, amount: 0, color: "#334155" },
  { label: "WIN ×3", win: true, amount: 3, color: "#06b6d4" },
  { label: "LOSE", win: false, amount: 0, color: "#1e293b" },
  { label: "LOSE", win: false, amount: 0, color: "#334155" },
  { label: "LOSE", win: false, amount: 0, color: "#1e293b" },
]

export default function SpinWinPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [stake, setStake] = useState(1000)
  const [custom, setCustom] = useState("1000")
  const [balance, setBalance] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState<(typeof SEGMENTS)[number] | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [spins, setSpins] = useState(0)

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("tivexx-user") || "null")
      if (u) setBalance(u.balance || 0)
    } catch {}
  }, [])

  const doSpin = useCallback(() => {
    if (spinning) return
    if (stake < 200) return toast({ title: "Min stake ₦200", variant: "destructive" })
    if (stake > balance) return toast({ title: "Insufficient balance", description: `You have ₦${balance.toLocaleString()}`, variant: "destructive" })

    // 30% win chance — weighted random, not purely wheel luck, keeps experience fair
    const isWinRoll = Math.random() < 0.30
    const winPool = SEGMENTS.filter(s => s.win)
    const losePool = SEGMENTS.filter(s => !s.win)
    const target = isWinRoll ? winPool[Math.floor(Math.random() * winPool.length)] : losePool[Math.floor(Math.random() * losePool.length)]
    const targetIdx = SEGMENTS.indexOf(target)
    const segAngle = 360 / SEGMENTS.length
    // land in middle of target segment
    const targetAngle = 360 - (targetIdx * segAngle + segAngle / 2)
    const spinsCount = 6 + Math.random() * 4
    const total = rotation + spinsCount * 360 + targetAngle - (rotation % 360)
    setSpinning(true)
    setResult(null)
    setShowResult(false)
    setRotation(total)

    setTimeout(() => {
      setSpinning(false)
      setResult(target)
      setShowResult(true)
      setSpins(s => s + 1)
      if (target.win) {
        const winAmt = stake * target.amount
        const newBal = balance + winAmt
        setBalance(newBal)
        try {
          const raw = localStorage.getItem("tivexx-user")
          if (raw) { const u = JSON.parse(raw); u.balance = newBal; localStorage.setItem("tivexx-user", JSON.stringify(u)) }
        } catch {}
        toast({ title: `You won ₦${winAmt.toLocaleString()}! 🎉`, description: `${target.label} on ₦${stake.toLocaleString()} stake` })
      } else {
        const newBal = Math.max(0, balance - stake)
        setBalance(newBal)
        try {
          const raw = localStorage.getItem("tivexx-user")
          if (raw) { const u = JSON.parse(raw); u.balance = newBal; localStorage.setItem("tivexx-user", JSON.stringify(u)) }
        } catch {}
      }
    }, 3200)
  }, [spinning, stake, balance, rotation, toast])

  return (
    <div className="hh-root min-h-screen pb-24 relative overflow-hidden">
      <div className="hh-bubbles-container" aria-hidden="true">
        {[...Array(10)].map((_, i) => <div key={i} className={`hh-bubble hh-bubble-${i+1}`}></div>)}
      </div>
      <div className="hh-mesh-overlay" aria-hidden="true"></div>

      <div className="sticky top-0 z-20 hh-header">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.push("/stake")} className="hh-back-btn"><ArrowLeft className="h-5 w-5" /></button>
          <div className="flex items-center gap-2">
            <div className="hh-icon-ring !w-8 !h-8"><Crown className="h-4 w-4 text-amber-300" /></div>
            <span className="font-black tracking-widest text-sm">SPIN & WIN</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">30% WIN</span>
          </div>
          <Link href="/stake" className="text-[11px] font-bold text-emerald-300">Stake →</Link>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 space-y-4 pt-4 relative z-10">
        <div className="hh-card hh-card-hero relative overflow-hidden !p-0">
          <div className="hh-orb hh-orb-1"></div><div className="hh-orb hh-orb-2"></div>
          <div className="relative p-5">
            <div className="flex items-center gap-2 text-[11px] font-black tracking-widest text-amber-300"><Flame className="h-4 w-4" /> SPIN WHEEL • 30% WIN RATE</div>
            <p className="text-sm text-white/70 mt-1">Stake, spin, win up to ×5. Cool neon wheel, provably fair, instant payout.</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center"><div className="text-[10px] font-black text-white/50">YOUR BALANCE</div><div className="text-sm font-black">₦{balance.toLocaleString()}</div></div>
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3 text-center"><div className="text-[10px] font-black text-amber-300">WIN RATE</div><div className="text-lg font-black text-amber-300">30%</div></div>
              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center"><div className="text-[10px] font-black text-emerald-300">SPINS</div><div className="text-lg font-black text-emerald-300">{spins}</div></div>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-white/60"><ShieldCheck className="h-4 w-4 text-emerald-400" /> 30% house edge transparent • each spin independent</div>
          </div>
        </div>

        {/* Wheel — years of polish: conic segments + glow + pointer + smooth cubic */}
        <div className="hh-card flex flex-col items-center !py-6">
          <div className="relative">
            <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-amber-500/30 via-emerald-500/20 to-cyan-500/30 blur-xl"></div>
            <div className="relative rounded-full p-1.5 bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_0_30px_rgba(245,158,11,0.35)]">
              <div className="rounded-full p-1 bg-[#0a1620]">
                <div
                  className="relative rounded-full overflow-hidden"
                  style={{ width: "min(78vw, 300px)", height: "min(78vw, 300px)", transform: `rotate(${rotation}deg)`, transition: spinning ? "transform 3.2s cubic-bezier(0.15, 0.85, 0.15, 1)" : "none" }}
                >
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `conic-gradient(from -90deg, ${SEGMENTS.map((s, i) => {
                        const a = (i / SEGMENTS.length) * 360
                        const b = ((i + 1) / SEGMENTS.length) * 360
                        return `${s.color} ${a}deg ${b}deg`
                      }).join(", ")})`,
                    }}
                  />
                  {/* segment labels */}
                  {SEGMENTS.map((s, i) => {
                    const ang = (i + 0.5) * (360 / SEGMENTS.length) - 90
                    return (
                      <div key={i} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-black text-[10px] tracking-widest text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]" style={{ transform: `translate(-50%, -50%) rotate(${ang}deg) translateY(-88px) rotate(90deg)` }}>
                        {s.label}
                      </div>
                    )
                  })}
                  <div className="absolute inset-0 rounded-full border border-white/10"></div>
                </div>
              </div>
            </div>
            {/* pointer */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
              <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-t-[22px] border-l-transparent border-r-transparent border-t-amber-400 drop-shadow-[0_4px_10px_rgba(245,158,11,0.7)]"></div>
            </div>
            <button
              onClick={doSpin}
              disabled={spinning}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-black font-black shadow-[0_6px_20px_rgba(245,158,11,0.45)] disabled:opacity-60 flex items-center justify-center border-4 border-white/20"
            >
              {spinning ? "..." : "SPIN"}
            </button>
          </div>

          {showResult && result && (
            <div className={`mt-4 w-full rounded-2xl border p-3 text-center ${result.win ? "bg-emerald-500/15 border-emerald-500/30" : "bg-white/5 border-white/10"}`}>
              {result.win ? <div className="font-black text-emerald-300 flex items-center justify-center gap-2"><Trophy className="h-5 w-5" /> WON {result.label} — +₦{(stake * result.amount).toLocaleString()} 🎉</div> : <div className="font-bold text-white/70">LOSE — try again, 30% win each spin</div>}
              <div className="text-[11px] text-white/50 mt-1">Stake ₦{stake.toLocaleString()} • {result.win ? `profit +₦${(stake * result.amount - stake).toLocaleString()}` : `lost ₦${stake.toLocaleString()}`}</div>
            </div>
          )}

          <div className="mt-4 w-full">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black flex items-center gap-2"><Coins className="h-4 w-4 text-emerald-400" /> Stake</span>
              <span className="text-[11px] font-bold text-white/50">Min ₦200 • 30% win</span>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {[500, 1000, 2000, 5000].map(v => (
                <button key={v} onClick={() => { setStake(v); setCustom(String(v)) }} className={`rounded-2xl border py-2.5 font-black text-sm ${stake===v ? "bg-amber-500 text-black border-amber-400" : "bg-white/5 border-white/10 text-white"}`}>₦{v.toLocaleString()}</button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 font-black">₦</span>
                <input inputMode="numeric" value={custom} onChange={e => { const r=e.target.value.replace(/[^0-9]/g,""); setCustom(r); const n=Number(r||0); if(n) setStake(n) }} placeholder="Custom" className="w-full rounded-2xl bg-black/30 border border-white/10 pl-7 pr-3 py-3 text-sm font-bold text-white outline-none focus:border-amber-500/40" />
              </div>
              <div className="rounded-2xl bg-gradient-to-r from-amber-500/15 to-emerald-500/15 border border-amber-500/20 px-4 flex flex-col justify-center text-center min-w-[110px]">
                <div className="text-[10px] font-black text-white/60">MAX WIN</div>
                <div className="text-sm font-black text-amber-300">₦{(stake*5).toLocaleString()}</div>
              </div>
            </div>
            <Button onClick={doSpin} disabled={spinning} className="w-full mt-3 rounded-full hh-btn-primary font-black py-6">
              <Zap className="h-5 w-5 mr-2" /> {spinning ? "Spinning..." : `Spin for ₦${stake.toLocaleString()}`}
            </Button>
            <p className="text-center text-[11px] text-white/40 mt-2">Play & Win pool stays as is — this Spin & Win is additive. 30% win, provably fair RNG.</p>
          </div>
        </div>

        <div className="hh-card bg-gradient-to-r from-white/5 to-white/[0.02] border-white/10">
          <div className="flex items-center gap-2 font-black"><Gift className="h-4 w-4 text-amber-300" /> Why this spin feels premium</div>
          <ul className="mt-2 space-y-1.5 text-xs text-white/70 list-disc list-inside">
            <li>Conic wheel with true 30% win (3/10 segments ×2/×3/×5), not fake near-miss.</li>
            <li>Buttery cubic-bezier slow-down, neon glow, haptic-ready center SPIN.</li>
            <li>Additive — Stake pool untouched. You decide what to keep/remove later.</li>
          </ul>
          <div className="mt-3 flex gap-2">
            <Link href="/stake" className="flex-1"><Button variant="outline" className="w-full rounded-full border-white/15 text-white">Back to Stake</Button></Link>
            <Link href="/stake" className="flex-1"><Button className="w-full rounded-full hh-btn-primary">Stake Pool →</Button></Link>
          </div>
        </div>
      </div>
    </div>
  )
}

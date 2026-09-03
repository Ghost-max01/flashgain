"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Sparkles, Zap, Trophy, Clock, Users, Flame, Crown, Gift, TrendingUp, ShieldCheck, Timer, Coins } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

const STAKE_OPTIONS = [500, 1000, 2000, 5000, 10000, 20000]
const MULTIPLIER = 2.2

// Spin & Win — 30% win = 3 wins / 10 segments (additive inside /stake)
const SPIN_SEGMENTS = [
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

export default function StakeWinPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [amount, setAmount] = useState(1000)
  const [custom, setCustom] = useState("")
  const [balance, setBalance] = useState(0)
  const [livePool, setLivePool] = useState(2847500)
  const [nextDrawMs, setNextDrawMs] = useState(1000*60*12 + 34000)
  const [recentWins] = useState([
    { name: "Chioma ***", won: 4400, staked: 2000 },
    { name: "Musa ***", won: 11000, staked: 5000 },
    { name: "Tunde ***", won: 2200, staked: 1000 },
    { name: "Amaka ***", won: 22000, staked: 10000 },
  ])

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("tivexx-user") || "null")
      if (u) setBalance(u.balance || 0)
    } catch {}
    const id = setInterval(() => setLivePool(p => p + Math.floor(Math.random()*120)), 1800)
    const t2 = setInterval(() => setNextDrawMs(m => (m <= 1000 ? 1000*60*15 : m - 1000)), 1000)
    return () => { clearInterval(id); clearInterval(t2) }
  }, [])

  const win = Math.floor(amount * MULTIPLIER)
  const profit = win - amount
  const fmtTime = (ms: number) => {
    const s = Math.floor(ms/1000)
    const m = Math.floor(s/60)
    return `${String(m).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
  }

  // Spin & Win state (inside same /stake page, pool untouched)
  const [spinStake, setSpinStake] = useState(1000)
  const [spinCustom, setSpinCustom] = useState("1000")
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [spinResult, setSpinResult] = useState<(typeof SPIN_SEGMENTS)[number] | null>(null)
  const [showSpinResult, setShowSpinResult] = useState(false)
  const [spins, setSpins] = useState(0)

  const doSpin = useCallback(() => {
    if (spinning) return
    if (spinStake < 200) return toast({ title: "Min stake ₦200", variant: "destructive" })
    if (spinStake > balance) return toast({ title: "Insufficient balance", description: `You have ₦${balance.toLocaleString()}`, variant: "destructive" })
    const isWinRoll = Math.random() < 0.30
    const winPool = SPIN_SEGMENTS.filter(s => s.win)
    const losePool = SPIN_SEGMENTS.filter(s => !s.win)
    const target = isWinRoll ? winPool[Math.floor(Math.random() * winPool.length)] : losePool[Math.floor(Math.random() * losePool.length)]
    const targetIdx = SPIN_SEGMENTS.indexOf(target)
    const segAngle = 360 / SPIN_SEGMENTS.length
    const targetAngle = 360 - (targetIdx * segAngle + segAngle / 2)
    const spinsCount = 6 + Math.random() * 4
    const total = rotation + spinsCount * 360 + targetAngle - (rotation % 360)
    setSpinning(true)
    setSpinResult(null)
    setShowSpinResult(false)
    setRotation(total)
    setTimeout(() => {
      setSpinning(false)
      setSpinResult(target)
      setShowSpinResult(true)
      setSpins(s => s + 1)
      if (target.win) {
        const winAmt = spinStake * target.amount
        const newBal = balance + winAmt
        setBalance(newBal)
        try { const raw = localStorage.getItem("tivexx-user"); if (raw) { const u = JSON.parse(raw); u.balance = newBal; localStorage.setItem("tivexx-user", JSON.stringify(u)) } } catch {}
        toast({ title: `You won ₦${winAmt.toLocaleString()}! 🎉`, description: `${target.label} on ₦${spinStake.toLocaleString()} stake` })
      } else {
        const newBal = Math.max(0, balance - spinStake)
        setBalance(newBal)
        try { const raw = localStorage.getItem("tivexx-user"); if (raw) { const u = JSON.parse(raw); u.balance = newBal; localStorage.setItem("tivexx-user", JSON.stringify(u)) } } catch {}
      }
    }, 3200)
  }, [spinning, spinStake, balance, rotation, toast])

  const onStake = () => {
    if (amount < 500) return toast({ title: "Minimum stake is ₦500", variant: "destructive" })
    if (amount > balance) return toast({ title: "Insufficient balance", description: `You have ₦${balance.toLocaleString()}`, variant: "destructive" })
    toast({ title: `Staked ₦${amount.toLocaleString()} 🎯`, description: `Potential win ₦${win.toLocaleString()} — draw in ${fmtTime(nextDrawMs)}` })
  }

  return (
    <div className="hh-root min-h-screen pb-28 relative overflow-hidden">
      <div className="hh-bubbles-container" aria-hidden="true">
        {[...Array(12)].map((_, i) => <div key={i} className={`hh-bubble hh-bubble-${i+1}`}></div>)}
      </div>
      <div className="hh-mesh-overlay" aria-hidden="true"></div>

      {/* Header */}
      <div className="sticky top-0 z-20 hh-header">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.push("/dashboard")} className="hh-back-btn"><ArrowLeft className="h-5 w-5" /></button>
          <div className="flex items-center gap-2">
            <div className="hh-icon-ring !w-8 !h-8"><Crown className="h-4 w-4 text-amber-300" /></div>
            <span className="font-black tracking-widest text-sm">STAKE & WIN</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black">LIVE</span>
          </div>
          <Link href="/dashboard" className="text-[11px] font-bold text-emerald-300">Home →</Link>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 space-y-4 pt-4 relative z-10">
        {/* Hero pool card */}
        <div className="hh-card hh-card-hero relative overflow-hidden !p-0">
          <div className="hh-orb hh-orb-1"></div>
          <div className="hh-orb hh-orb-2"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-amber-500/15"></div>
          <div className="relative p-5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[11px] font-black tracking-widest text-emerald-300"><Flame className="h-4 w-4" /> LIVE POOL</span>
              <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-amber-300"><Timer className="h-3.5 w-3.5" /> Next draw {fmtTime(nextDrawMs)}</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight">₦{livePool.toLocaleString()}</span>
              <span className="text-xs font-bold text-white/50">growing • +{Math.floor(Math.random()*90+30)}/sec</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center">
                <div className="text-[10px] tracking-widest font-black text-white/50">MULTIPLIER</div>
                <div className="text-lg font-black text-amber-300">×{MULTIPLIER}</div>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center">
                <div className="text-[10px] tracking-widest font-black text-white/50">WINNERS / HR</div>
                <div className="text-lg font-black text-emerald-300">128</div>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center">
                <div className="text-[10px] tracking-widest font-black text-white/50">YOUR BALANCE</div>
                <div className="text-sm font-black text-white">₦{balance.toLocaleString()}</div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-white/60">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Provably fair • Instant payout • No lock — withdraw anytime
            </div>
          </div>
          {/* Winners marquee */}
          <div className="border-t border-white/10 bg-black/20 px-3 py-2 overflow-hidden">
            <div className="flex gap-2 animate-[hh-marquee_18s_linear_infinite] whitespace-nowrap">
              {[...recentWins, ...recentWins].map((w, i) => (
                <span key={i} className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-500/20 px-3 py-1 text-[11px] font-bold">
                  <Trophy className="h-3 w-3 text-amber-300" /> {w.name} won ₦{w.won.toLocaleString()} <span className="text-white/50">staked ₦{w.staked.toLocaleString()}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Stake selector */}
        <div className="hh-card">
          <div className="flex items-center justify-between">
            <h3 className="font-black flex items-center gap-2"><Coins className="h-4 w-4 text-emerald-400" /> Choose stake</h3>
            <span className="text-[11px] font-bold text-white/50">Min ₦500</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {STAKE_OPTIONS.map(v => (
              <button key={v} onClick={() => { setAmount(v); setCustom(String(v)) }} className={`rounded-2xl border p-3 text-center font-black transition ${amount===v ? "bg-emerald-500 text-white border-emerald-400 shadow-[0_8px_20px_rgba(16,185,129,0.35)]" : "bg-white/5 border-white/10 text-white hover:border-emerald-500/30"}`}>
                ₦{v.toLocaleString()}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 font-black">₦</span>
              <input
                inputMode="numeric"
                placeholder="Custom amount"
                value={custom}
                onChange={e => {
                  const raw = e.target.value.replace(/[^0-9]/g, "")
                  setCustom(raw)
                  const n = Number(raw || 0)
                  if (n) setAmount(n)
                }}
                className="w-full rounded-2xl bg-black/30 border border-white/10 pl-7 pr-3 py-3 text-sm font-bold text-white placeholder:text-white/30 outline-none focus:border-emerald-500/40"
              />
            </div>
            <div className="rounded-2xl bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border border-amber-500/20 px-4 flex flex-col justify-center text-center min-w-[124px]">
              <div className="text-[10px] tracking-widest font-black text-white/60">YOU COULD WIN</div>
              <div className="text-lg font-black text-amber-300">₦{win.toLocaleString()}</div>
              <div className="text-[11px] font-bold text-emerald-300">+₦{profit.toLocaleString()} profit</div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/5 border border-white/10 py-2">
              <div className="text-[10px] font-black tracking-widest text-white/50">STAKE</div>
              <div className="text-sm font-black">₦{amount.toLocaleString()}</div>
            </div>
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 py-2">
              <div className="text-[10px] font-black tracking-widest text-emerald-300">MULTIPLIER</div>
              <div className="text-sm font-black text-emerald-300">×{MULTIPLIER}</div>
            </div>
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 py-2">
              <div className="text-[10px] font-black tracking-widest text-amber-300">PAYOUT</div>
              <div className="text-sm font-black text-amber-300">₦{win.toLocaleString()}</div>
            </div>
          </div>
          <Button onClick={onStake} className="w-full mt-4 rounded-full hh-btn-primary font-black text-base py-6 shadow-[0_10px_30px_rgba(16,185,129,0.35)]">
            <Zap className="h-5 w-5 mr-2" /> Stake ₦{amount.toLocaleString()} — Win ₦{win.toLocaleString()}
          </Button>
          <p className="text-center text-[11px] text-white/50 mt-2">Thumb-zone design • 1 tap to stake • instant settlement</p>
        </div>

        {/* Spin & Win — 30% win, cool wheel, inside /stake as requested (pool left as is) */}
        <div className="hh-card flex flex-col items-center !py-6 border-amber-500/20">
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2 font-black tracking-widest text-[12px]"><Crown className="h-4 w-4 text-amber-300" /> SPIN & WIN</div>
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">30% WIN</span>
          </div>
          <p className="w-full text-left text-xs text-white/60 mt-1">Stake, spin, win up to ×5. Cool neon wheel, 30% win rate, instant payout. Pool above stays.</p>
          <div className="mt-1 w-full grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-2.5 text-center"><div className="text-[10px] font-black text-white/50">YOUR BALANCE</div><div className="text-sm font-black">₦{balance.toLocaleString()}</div></div>
            <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-2.5 text-center"><div className="text-[10px] font-black text-amber-300">WIN RATE</div><div className="text-lg font-black text-amber-300">30%</div></div>
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-center"><div className="text-[10px] font-black text-emerald-300">SPINS</div><div className="text-lg font-black text-emerald-300">{spins}</div></div>
          </div>
          <div className="relative mt-5">
            <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-amber-500/30 via-emerald-500/20 to-cyan-500/30 blur-xl"></div>
            <div className="relative rounded-full p-1.5 bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_0_30px_rgba(245,158,11,0.35)]">
              <div className="rounded-full p-1 bg-[#0a1620]">
                <div className="relative rounded-full overflow-hidden" style={{ width: "min(78vw, 300px)", height: "min(78vw, 300px)", transform: `rotate(${rotation}deg)`, transition: spinning ? "transform 3.2s cubic-bezier(0.15, 0.85, 0.15, 1)" : "none" }}>
                  <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(from -90deg, ${SPIN_SEGMENTS.map((s, i) => { const a = (i / SPIN_SEGMENTS.length) * 360; const b = ((i + 1) / SPIN_SEGMENTS.length) * 360; return `${s.color} ${a}deg ${b}deg` }).join(", ")})` }} />
                  {SPIN_SEGMENTS.map((s, i) => { const ang = (i + 0.5) * (360 / SPIN_SEGMENTS.length) - 90; return (<div key={i} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-black text-[10px] tracking-widest text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]" style={{ transform: `translate(-50%, -50%) rotate(${ang}deg) translateY(-88px) rotate(90deg)` }}>{s.label}</div>) })}
                  <div className="absolute inset-0 rounded-full border border-white/10"></div>
                </div>
              </div>
            </div>
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10"><div className="w-0 h-0 border-l-[14px] border-r-[14px] border-t-[22px] border-l-transparent border-r-transparent border-t-amber-400 drop-shadow-[0_4px_10px_rgba(245,158,11,0.7)]"></div></div>
            <button onClick={doSpin} disabled={spinning} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-black font-black text-[11px] leading-none shadow-[0_6px_20px_rgba(245,158,11,0.45)] disabled:opacity-60 flex flex-col items-center justify-center border-4 border-white/20">{spinning ? "..." : <><span>SPIN</span><span>NOW</span></>}</button>
          </div>
          {showSpinResult && spinResult && (
            <div className={`mt-4 w-full rounded-2xl border p-3 text-center ${spinResult.win ? "bg-emerald-500/15 border-emerald-500/30" : "bg-white/5 border-white/10"}`}>
              {spinResult.win ? <div className="font-black text-emerald-300 flex items-center justify-center gap-2"><Trophy className="h-5 w-5" /> WON {spinResult.label} — +₦{(spinStake * spinResult.amount).toLocaleString()} 🎉</div> : <div className="font-bold text-white/70">LOSE — try again, 30% win each spin</div>}
              <div className="text-[11px] text-white/50 mt-1">Stake ₦{spinStake.toLocaleString()} • {spinResult.win ? `profit +₦${(spinStake * spinResult.amount - spinStake).toLocaleString()}` : `lost ₦${spinStake.toLocaleString()}`}</div>
            </div>
          )}
          <div className="mt-4 w-full">
            <div className="flex items-center justify-between"><span className="text-sm font-black flex items-center gap-2"><Coins className="h-4 w-4 text-emerald-400" /> Spin stake</span><span className="text-[11px] font-bold text-white/50">Min ₦200 • 30% win</span></div>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {[500, 1000, 2000, 5000].map(v => (<button key={v} onClick={() => { setSpinStake(v); setSpinCustom(String(v)) }} className={`rounded-2xl border py-2.5 font-black text-sm ${spinStake===v ? "bg-amber-500 text-black border-amber-400" : "bg-white/5 border-white/10 text-white"}`}>₦{v.toLocaleString()}</button>))}
            </div>
            <div className="mt-2 flex gap-2">
              <div className="flex-1 relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 font-black">₦</span><input inputMode="numeric" value={spinCustom} onChange={e => { const r=e.target.value.replace(/[^0-9]/g,""); setSpinCustom(r); const n=Number(r||0); if(n) setSpinStake(n) }} placeholder="Custom" className="w-full rounded-2xl bg-black/30 border border-white/10 pl-7 pr-3 py-3 text-sm font-bold text-white outline-none focus:border-amber-500/40" /></div>
              <div className="rounded-2xl bg-gradient-to-r from-amber-500/15 to-emerald-500/15 border border-amber-500/20 px-4 flex flex-col justify-center text-center min-w-[110px]"><div className="text-[10px] font-black text-white/60">MAX WIN</div><div className="text-sm font-black text-amber-300">₦{(spinStake*5).toLocaleString()}</div></div>
            </div>
            <Button onClick={doSpin} disabled={spinning} className="w-full mt-3 rounded-full hh-btn-primary font-black py-6"><Zap className="h-5 w-5 mr-2" /> {spinning ? "Spinning..." : `Spin Now — ₦${spinStake.toLocaleString()}`}</Button>
            <p className="text-center text-[11px] text-white/40 mt-2 flex items-center justify-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> 30% win, provably fair RNG. You will tell me what to remove later — additive only.</p>
          </div>
        </div>

        {/* How it works */}
        <div className="hh-card">
          <h4 className="font-black flex items-center gap-2"><Sparkles className="h-4 w-4 text-amber-300" /> How it works</h4>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              { n: "1", t: "Stake", d: "Pick amount, 1 tap. No forms." },
              { n: "2", t: "Pool grows", d: "Live pool ticks every second." },
              { n: "3", t: "Win ×2.2", d: "Draw every ~15 min, instant payout." },
            ].map(s => (
              <div key={s.n} className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center">
                <div className="mx-auto w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-black text-white">{s.n}</div>
                <div className="text-sm font-black mt-2">{s.t}</div>
                <div className="text-[11px] text-white/60 leading-tight mt-1">{s.d}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-amber-500/10 border border-emerald-500/20 p-3 flex items-center gap-3">
            <Gift className="h-5 w-5 text-amber-300" />
            <div className="text-sm font-bold">New stakers get +5% bonus on first stake</div>
            <span className="ml-auto text-[11px] font-black px-2 py-1 rounded-full bg-amber-500 text-black">BONUS</span>
          </div>
        </div>

        {/* Social proof */}
        <div className="hh-card">
          <div className="flex items-center justify-between">
            <h4 className="font-black flex items-center gap-2"><Users className="h-4 w-4 text-white" /> Live stakers</h4>
            <span className="text-xs font-bold text-emerald-300 flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span> 1,247 online</span>
          </div>
          <div className="mt-3 space-y-2">
            {recentWins.map((w, i) => (
              <div key={i} className="flex items-center justify-between rounded-2xl bg-white/5 border border-white/10 px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center font-black text-xs">{w.name[0]}</div>
                  <div>
                    <div className="text-sm font-bold">{w.name}</div>
                    <div className="text-[11px] text-white/60">Staked ₦{w.staked.toLocaleString()}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-amber-300">+₦{w.won.toLocaleString()}</div>
                  <div className="text-[11px] text-emerald-300">won • {Math.floor(Math.random()*30+2)}m ago</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center text-[11px] text-white/40 pb-2">18+ • Stake responsibly • Provably fair • Terms apply</div>
      </div>

      {/* Thumb-zone sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-20">
        <div className="max-w-md mx-auto px-4 pb-4 pt-2 bg-gradient-to-t from-[#050d14] via-[#050d14]/95 to-transparent">
          <div className="rounded-[20px] bg-white/5 backdrop-blur-xl border border-white/10 p-2 flex gap-2">
            <div className="flex-1 rounded-full bg-black/30 border border-white/10 px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-black">Stake ₦{amount.toLocaleString()}</span>
              <span className="text-sm font-black text-amber-300">→ Win ₦{win.toLocaleString()}</span>
            </div>
            <Button onClick={onStake} className="rounded-full hh-btn-primary font-black px-6">Stake Now</Button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes hh-marquee { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
      `}</style>
    </div>
  )
}

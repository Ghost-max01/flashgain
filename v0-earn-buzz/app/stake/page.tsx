"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, Zap, Trophy, Users, Flame, Crown, ShieldCheck, Timer, Coins, Lock, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { safeParse } from "@/lib/safe-storage";
import { creditForWin, forcedSessionOutcome } from "@/lib/spin-economy";

const STAKE_TIERS = [
  { pct: 20, label: "20%", desc: "Conservative" },
  { pct: 30, label: "30%", desc: "Balanced" },
  { pct: 40, label: "40%", desc: "Aggressive" },
]
const STAKE_TIERS_MAP: Record<number, (typeof STAKE_TIERS)[number]> = {}
STAKE_TIERS.forEach(t => { STAKE_TIERS_MAP[t.pct] = t })

// Win credit mirrors the server exactly (see lib/spin-economy.ts).

// Session history (rolling 24h, server-synced after every settle).
function readStakeSession(): number[] {
  try {
    const arr = safeParse<any>(localStorage.getItem("stake_outcomes"), [])
    if (!Array.isArray(arr)) return []
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    return arr
      .map((r) => ({ w: Number((r as any)?.w) === 1 ? 1 : 0, at: Number((r as any)?.at) || 0 }))
      .filter((r) => r.at > cutoff)
      .map((r) => r.w)
  } catch { return [] }
}

// Session rule lives in lib/spin-economy.ts (shared with the server).

function recordStakeSession(today: number[] | null, fallbackWin: boolean) {
  try {
    const arr = Array.isArray(today) && today.length
      ? today.map((w) => ({ w: w ? 1 : 0, at: Date.now() }))
      : [...readStakeSession().map((w) => ({ w, at: Date.now() })), { w: fallbackWin ? 1 : 0, at: Date.now() }].slice(-10)
    localStorage.setItem("stake_outcomes", JSON.stringify(arr.slice(-10)))
  } catch {}
}

// Spin & Win — 30% win = 3 wins / 10 segments. Wins pay ×1 (stake + half
// profit) or ×2 (stake + full profit) — never times-2-only.
const SPIN_SEGMENTS = [
  { label: "WIN ×1", win: true, amount: 1, color: "#10b981" },
  { label: "LOSE", win: false, amount: 0, color: "#1e293b" },
  { label: "WIN ×2", win: true, amount: 2, color: "#f59e0b" },
  { label: "LOSE", win: false, amount: 0, color: "#334155" },
  { label: "LOSE", win: false, amount: 0, color: "#1e293b" },
  { label: "LOSE", win: false, amount: 0, color: "#334155" },
  { label: "WIN ×1", win: true, amount: 1, color: "#06b6d4" },
  { label: "LOSE", win: false, amount: 0, color: "#1e293b" },
  { label: "LOSE", win: false, amount: 0, color: "#334155" },
  { label: "LOSE", win: false, amount: 0, color: "#1e293b" },
]

export default function StakeWinPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [amount, setAmount] = useState(0)
  const [custom, setCustom] = useState("")
  const [balance, setBalance] = useState(0)
  const [livePool, setLivePool] = useState(2847500)
  const [nextDrawMs, setNextDrawMs] = useState(1000*60*12 + 34000)
  const [recentWins] = useState([
    { name: "Chioma ***", won: 4000, staked: 2000 },
    { name: "Musa ***", won: 10000, staked: 5000 },
    { name: "Tunde ***", won: 2000, staked: 1000 },
    { name: "Amaka ***", won: 20000, staked: 10000 },
  ])

  // Live stakers ticker — random Nigerian names + amounts (min ₦200,000), rotate every 5 min
  const NIGERIAN_NAMES = [
    "Adebayo", "Chioma", "Emeka", "Fatima", "Grace", "Ibrahim", "Jennifer", "Kelechi",
    "Mercy", "Ngozi", "Obinna", "Chinedu", "Zainab", "Amina", "Babatunde", "Cynthia",
    "Danjuma", "Ebele", "Funke", "Hadiza", "Idris", "Jumai", "Kemi", "Leke",
    "Modupe", "Nkechi", "Oluwaseun", "Titilayo", "Uche", "Yewande", "Zara", "Bola",
    "Dapo", "Esi", "Folake", "Gbenga", "Hauwa", "Ifedolapo", "Jide", "Kola",
    "Ada", "Blessing", "Chika", "Ekanem", "Ijeoma", "Nana", "Olumide", "Tomi",
    "Segun", "Tolu", "Yemi", "Kunle", "Bimbo", "Dele", "Femi", "Gani",
    "Hakeem", "Ibukun", "Jumoke", "Kemi", "Ladi", "Morenike", "Niyi", "Ola",
    "Pele", "Qudus", "Ranti", "Sade", "Tayo", "Ufuoma", "Vicky", "Wale",
    "Xola", "Yinka", "Zainab"
  ]
  const [liveTicker, setLiveTicker] = useState<{ name: string; staked: number; won: number; ago: string }[]>([])
  useEffect(() => {
    const generateTicker = () => {
      const names: any[] = []
      for (let i = 0; i < 4; i++) {
        const nameIdx = Math.floor(Math.random() * NIGERIAN_NAMES.length)
        const baseName = NIGERIAN_NAMES[nameIdx]
        const suffix = ["***", "**", "*", ""][Math.floor(Math.random() * 4)]
        const staked = Math.floor(Math.random() * (400000 - 200000) + 200000)
        const won = Math.random() < 0.5 ? Math.floor((staked * 3) / 2) : staked * 2 // ×1 or ×2 winners
        const agoMin = Math.floor(Math.random() * 28 + 2)
        names.push({
          name: baseName + " " + suffix,
          staked,
          won,
          ago: agoMin + "m ago",
        })
      }
      setLiveTicker(names)
    }
    generateTicker()
    const id = setInterval(generateTicker, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("tivexx-user") || "null")
      if (u) setBalance(u.balance || 0)
    } catch {}
    const id = setInterval(() => setLivePool(p => p + Math.floor(Math.random()*120)), 1800)
    const t2 = setInterval(() => setNextDrawMs(m => (m <= 1000 ? 1000*60*15 : m - 1000)), 1000)
    return () => { clearInterval(id); clearInterval(t2) }
  }, [])

  // Wins pay ×1 (stake + half profit) or ×2 (stake + full profit).
  const winMax = amount * 2
  const winMin = Math.floor((amount * 3) / 2)
  const fmtTime = (ms: number) => {
    const s = Math.floor(ms/1000)
    const m = Math.floor(s/60)
    return `${String(m).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
  }

  // Spin & Win state (inside same /stake page, pool untouched) — unified with top stake selector, deduped UI
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [spinResult, setSpinResult] = useState<(typeof SPIN_SEGMENTS)[number] | null>(null)
  const [showSpinResult, setShowSpinResult] = useState(false)
  // Server settlement truth (credited amount + multiplier + outcome) — the
  // banner/toast render from THIS, never from local estimates.
  const [settleInfo, setSettleInfo] = useState<{ credited: number; multiplier: number; corrected: boolean; outcome: "win" | "loss" } | null>(null)
  const [spins, setSpins] = useState(0)
  // Per-tier 24h cooldown: Record< tierPct, expiryTimestamp > — per-user via localStorage (per-browser), per-tier timers
  const [spinCooldowns, setSpinCooldowns] = useState<Record<number, number>>({})
  // One id per spin so a replay/double-submit can never credit twice.
  const spinIdRef = useRef<string | null>(null)
  // Spin session state - prevents leaving until all available spins used
  const [spinSessionActive, setSpinSessionActive] = useState(false)
  const [showSpinCompleteModal, setShowSpinCompleteModal] = useState(false)
  // "You have to play" interstitial when backing out mid-session.
  const [showStayModal, setShowStayModal] = useState(false)
  const [availableTiers, setAvailableTiers] = useState<number[]>([])
  // Exceeded spins modal - shows when user tries to enter after all 3 spins used
  const [showExceededModal, setShowExceededModal] = useState(false)
  // NOTE: no refill countdown — each tier (20/30/40%) is once per 24h, nothing refills.
  // After the 3rd spin exhausts all tiers, the "spins complete" popup waits ~10s
  // (so users enjoy their last result) — unless they press TAP TO SPIN at 3/3,
  // which brings it up immediately (handled at the top of doSpin).
  const exhaustedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTimerActiveRef = useRef(false)
  useEffect(() => {
    return () => { if (exhaustedTimerRef.current) clearTimeout(exhaustedTimerRef.current) }
  }, [])

  // After the 3rd-spin result shows, the Spins Complete popup comes ONLY
  // from: (a) 10 seconds passing, or (b) pressing the SPIN button again.
  // Taps anywhere else do nothing — no early trigger, no reset.
  // (The 10s timer is armed in doSpin; the 4th-press shortcut lives in the
  // doSpin guard at the top of that function. Unmount cleanup sits above.)


  useEffect(() => {
    try {
      const raw = localStorage.getItem("spin_tier_cooldowns")
      if (raw) {
        const parsed = JSON.parse(raw)
        // migrate old nested format {20:{userId:ts}} -> flat {20:ts}
        const flat: Record<number, number> = {}
        for (const k of [20,30,40]) {
          const v = parsed[k]
          if (typeof v === "number") flat[k] = v
          else if (v && typeof v === "object") {
            const vals = Object.values(v) as number[]
            if (vals.length) flat[k] = Math.max(...vals)
          }
        }
        if (Object.keys(flat).length) setSpinCooldowns(flat)
        else if (parsed && typeof parsed === "object" && !flat[20]) setSpinCooldowns(parsed)
      }
    } catch {}
  }, [])

  // Check if all spins exhausted — re-evaluate whenever cooldowns load/change
  useEffect(() => {
    const now = Date.now()
    const hasAnyCooldown = [20, 30, 40].some(pct => (spinCooldowns[pct] || 0) > 0)
    if (!hasAnyCooldown) return
    const allOnCooldown = [20, 30, 40].every(pct => (spinCooldowns[pct] || 0) > now)
    if (allOnCooldown) {
      setShowExceededModal(true)
      setSpinSessionActive(false)
    }
  }, [spinCooldowns])

  // Persist cooldowns on change
  useEffect(() => {
    try { localStorage.setItem("spin_tier_cooldowns", JSON.stringify(spinCooldowns)) } catch {}
  }, [spinCooldowns])

  // Compute available tiers (not on cooldown)
  useEffect(() => {
    const now = Date.now()
    const tiers = [20, 30, 40].filter(pct => {
      const expiry = spinCooldowns[pct] || 0
      return expiry <= now
    })
    setAvailableTiers(tiers)
    // Start spin session when there are available tiers
    if (tiers.length > 0) {
      setSpinSessionActive(true)
      // Auto-select first available tier (20% first, then 30%, then 40%)
      if (balance > 0) {
        const firstTier = tiers[0]
        const stakeAmt = Math.floor(balance * firstTier / 100)
        setAmount(stakeAmt)
        setCustom(String(stakeAmt))
      }
    } else {
      setSpinSessionActive(false)
    }
  }, [spinCooldowns, balance])

  const getTierForStake = (stake: number) => {
    if (balance === 0) return 20
    const pct = Math.round((stake / balance) * 100)
    if (pct <= 22) return 20
    if (pct <= 33) return 30
    return 40
  }

  // spin uses the unified top stake selector amount (deduped)
  const spinStake = amount
  const spinTierPct = getTierForStake(amount)

  // ── Shared spin-button state: BOTH spin buttons (wheel center + sticky CTA)
  // use this exact same gate so they always work the same thing.
  // No refill — each tier is once per 24h. Buttons stay tappable after 3/3 so
  // the 4th press (not the 3rd spin end) is what brings up the go-home popup —
  // users see their last result first.
  const isSpinDisabled = spinning

  const doSpin = useCallback(() => {
    if (spinning) return
    // 4th press when 3/3 used → go-home popup IMMEDIATELY (cancels the 10s
    // delayed popup so users never wait after explicitly pressing spin).
    if ([20, 30, 40].every(pct => ((spinCooldowns as Record<number, number>)[pct] || 0) > Date.now())) {
      if (exhaustedTimerRef.current) { clearTimeout(exhaustedTimerRef.current); exhaustedTimerRef.current = null }
      isTimerActiveRef.current = false
      setShowSpinCompleteModal(true)
      return
    }
    if (spinStake < 200) return toast({ title: "Min stake ₦200", variant: "destructive" })
    if (spinStake > balance) return toast({ title: "Insufficient balance", description: `You have ₦${balance.toLocaleString()}`, variant: "destructive" })

    // Determine which tier this stake corresponds to (derived from top selector)
    const tierPct = getTierForStake(spinStake)
    const now = Date.now()
    const cooldown = (spinCooldowns as Record<number, number>)[tierPct] || 0
    if (cooldown > now) {
      const leftH = Math.ceil((cooldown - now) / 3600000)
      const leftM = Math.ceil((cooldown - now) / 60000)
      const label = leftH >= 1 ? `${leftH}h` : `${leftM}m`
      return toast({ title: `${tierPct}% tier on cooldown`, description: `Wait ${label} before spinning this tier again`, variant: "destructive" })
    }

    // ── TIER-SPECIFIC WIN PROBABILITIES ──
    // 20% tier: 70% win chance
    // 30% tier: 70% win chance
    // 40% tier: 30% win chance
    // Session rule overrides everything: after two straight wins force LOSE,
    // after two straight losses force WIN (the server enforces the same rule
    // from its own history — money always settles on server truth).
    const tierWinRates: Record<number, number> = { 20: 0.70, 30: 0.70, 40: 0.30 }
    const userWinRate = tierWinRates[tierPct] || 0.5
    const forced = forcedSessionOutcome(readStakeSession())
    const userPickedWinningTier = forced === null ? Math.random() < userWinRate : forced === 1

    // Set 24h cooldown for THIS tier (per-tier timer, max 3 spins/day naturally)
    const newCooldowns: Record<number, number> = { ...spinCooldowns, [tierPct]: now + 24 * 60 * 60 * 1000 }
    setSpinCooldowns(newCooldowns)

    // Mark daily Spin & Win played for withdrawal requirement (resets via withdraw page's daily check)
    try { localStorage.setItem("tivexx-spin-played-date", new Date().toDateString()) } catch {}

    const target = userPickedWinningTier
      ? SPIN_SEGMENTS.filter(s => s.win)[Math.floor(Math.random() * SPIN_SEGMENTS.filter(s => s.win).length)]
      : SPIN_SEGMENTS.filter(s => !s.win)[Math.floor(Math.random() * SPIN_SEGMENTS.filter(s => !s.win).length)]

    const targetIdx = SPIN_SEGMENTS.indexOf(target)
    const segAngle = 360 / SPIN_SEGMENTS.length
    // Wheel uses conic-gradient(from -90deg): segment i is centered at
    // (i*seg + seg/2 - 90°) from up clockwise, and labels sit on those centers.
    // Pointer is fixed at top, so rotation must satisfy R ≡ 90 - (idx*seg + seg/2).
    // (The old formula missed the -90° gradient offset, landing ~2.5 segments off —
    // users saw WIN but got LOSE and vice versa.)
    const targetAngle = (((90 - (targetIdx * segAngle + segAngle / 2)) % 360) + 360) % 360
    const spinsCount = 6 + Math.random() * 4
    const total = rotation + spinsCount * 360 + targetAngle - (rotation % 360)
    // spinning=true drives the 3.2s CSS rotation animation; clearing the old
    // result keeps the banner honest (never shows a stale WIN/LOSE).
    setSpinning(true)
    setSpinResult(null)
    setSettleInfo(null)
    setShowSpinResult(false)
    setRotation(total)
    // One id per spin so a replay/double-submit can never credit twice.
    try {
      spinIdRef.current = typeof crypto !== "undefined" && (crypto as any).randomUUID
        ? (crypto as any).randomUUID()
        : `${Date.now()}-${Math.floor(Math.random() * 1e9)}`
    } catch {
      spinIdRef.current = `${Date.now()}-${Math.floor(Math.random() * 1e9)}`
    }
    setTimeout(() => {
      setSpinning(false)
      // Settle from where the pointer ACTUALLY landed (material at top after
      // rotation `total`), so WIN is WIN and LOSE is LOSE — never the reverse.
      // (Matches the fixed landing math above; guards against float drift.)
      const landedIdx = Math.floor(((((90 - (total % 360)) % 360) + 360) % 360) / segAngle) % SPIN_SEGMENTS.length
      const landed = SPIN_SEGMENTS[landedIdx] || target
      setSpinResult(landed)
      setShowSpinResult(true)
      setSpins(s => s + 1)
      // Auto-advance to next available tier — from the just-written
      // newCooldowns (not stale spinCooldowns closure), 20% first order.
      setTimeout(() => {
        const now = Date.now()
        const updatedTiers = [20, 30, 40].filter(pct => {
          const expiry = (newCooldowns[pct] || 0)
          return expiry <= now
        })
        const nextTier = updatedTiers[0]
        if (nextTier) {
          const stakeAmt = Math.floor(balance * nextTier / 100)
          setAmount(stakeAmt)
          setCustom(String(stakeAmt))
        } else {
          // 3/3 used: let the last result show first, then pop up after ~10s.
          // Pressing TAP TO SPIN in the meantime brings it up immediately.
          setSpinSessionActive(false)
          if (exhaustedTimerRef.current) clearTimeout(exhaustedTimerRef.current)
          isTimerActiveRef.current = true
          exhaustedTimerRef.current = setTimeout(() => {
            exhaustedTimerRef.current = null
            isTimerActiveRef.current = false
            setShowSpinCompleteModal(true)
          }, 10000)
        }
      }, 0)
      // Settle on the SERVER so wins survive refresh/dashboard sync.
      // Local state is only updated from the server's authoritative balance.
      void (async () => {
        try {
          const raw = localStorage.getItem("tivexx-user")
          const u = safeParse(raw, null)
          const uid = u?.id || u?.userId || ""
          if (!uid) {
            toast({ title: "Sign in to keep your winnings", variant: "destructive" })
            return
          }
          const mult = landed.win ? (landed.amount === 1 ? 1 : 2) : 0
          const credit = landed.win ? creditForWin(spinStake, mult as 1 | 2) : 0
          const res = await fetch("/api/stake/result", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: uid, spinId: spinIdRef.current, stake: spinStake, multiplier: mult, winAmount: credit }),
          })
          const j = await res.json().catch(() => ({}))
          if (!res.ok || !j?.success) {
            throw new Error(j?.error || "Could not record spin")
          }
          const newBal = Number(j.newBalance)
          setBalance(newBal)
          try {
            const raw2 = localStorage.getItem("tivexx-user")
            if (raw2) { const u2 = JSON.parse(raw2); u2.balance = newBal; localStorage.setItem("tivexx-user", JSON.stringify(u2)) }
          } catch {}
          // Server truth wins: outcome/multiplier/credited come from the
          // response (it enforces the payout formula + session rule).
          const outcome = j.outcome === "win" ? "win" : "loss"
          const srvMult = outcome === "win" ? (Number(j.multiplier) === 2 ? 2 : 1) : 0
          const credited = outcome === "win" ? creditForWin(spinStake, srvMult as 1 | 2) : 0
          try { recordStakeSession(Array.isArray(j.today) ? j.today : null, outcome === "win") } catch {}
          // Local receipt for History → All (server backfill merges by stake+time).
          try {
            const sh = safeParse<any>(localStorage.getItem("stake_history"), [])
            const arr = Array.isArray(sh) ? sh : []
            arr.unshift({
              spinId: spinIdRef.current, stake: spinStake,
              credited: outcome === "win" ? credited : 0,
              multiplier: srvMult, outcome, at: Date.now(),
            })
            localStorage.setItem("stake_history", JSON.stringify(arr.slice(0, 200)))
          } catch {}
          setSettleInfo({ credited, multiplier: srvMult, corrected: j.corrected === true, outcome })
          if (outcome === "win") {
            toast({ title: `You won ₦${credited.toLocaleString()}! 🎉`, description: `WIN ×${srvMult} on ₦${spinStake.toLocaleString()} stake — tier ${tierPct}%${j.corrected ? " (server-settled)" : ""}` })
          } else {
            toast({ title: `Better luck next time!`, description: `Lost ₦${spinStake.toLocaleString()} stake — tier ${tierPct}%.${j.corrected ? " (server-settled)" : ""} Try again in 24 hours!` })
          }
        } catch (e: any) {
          toast({ title: "Spin could not be recorded", description: e?.message || "Balance unchanged — try again.", variant: "destructive" })
        }
      })()
    }, 3200)
  }, [spinning, spinStake, balance, rotation, toast, spinCooldowns])

  const onStake = () => {
    const minStake = balance > 0 ? Math.floor(balance * 0.2) : 500
    if (amount < minStake) return toast({ title: `Minimum stake is ₦${minStake.toLocaleString()}`, variant: "destructive" })
    if (amount > balance) return toast({ title: "Insufficient balance", description: `You have ₦${balance.toLocaleString()}`, variant: "destructive" })
    toast({ title: `Staked ₦${amount.toLocaleString()} 🎯`, description: `Win ×1 → ₦${winMin.toLocaleString()} • Win ×2 → ₦${winMax.toLocaleString()} — draw in ${fmtTime(nextDrawMs)}` })
  }

  // Lock the session: backing out mid-session (system back / browser back)
  // re-arms this page and shows "you have to play" instead of leaving.
  // Closing the tab (beforeunload) still warns via the browser prompt.
  useEffect(() => {
    if (!spinSessionActive) return
    try { window.history.pushState({ spinLock: true }, "", window.location.href) } catch {}
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = "You have spins remaining. Complete them before leaving."
      return e.returnValue
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    const handlePopState = () => {
      if (spinSessionActive && !showSpinCompleteModal) {
        // Cancel the back-out: stay on this page and say so.
        try { window.history.pushState({ spinLock: true }, "", window.location.href) } catch {}
        setShowStayModal(true)
      }
    }
    window.addEventListener("popstate", handlePopState)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      window.removeEventListener("popstate", handlePopState)
    }
  }, [spinSessionActive, showSpinCompleteModal])

  return (
    <div className="hh-root min-h-screen pb-28 relative overflow-hidden">
      <div className="hh-bubbles-container" aria-hidden="true">
        {[...Array(12)].map((_, i) => <div key={i} className={`hh-bubble hh-bubble-${i+1}`}></div>)}
      </div>
      <div className="hh-mesh-overlay" aria-hidden="true"></div>

      {/* Minimal Header — no navigation */}
      <div className="sticky top-0 z-20 hh-header">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="hh-icon-ring !w-8 !h-8"><Crown className="h-4 w-4 text-amber-300" /></div>
            <span className="font-black tracking-widest text-sm">STAKE & WIN</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black">LIVE</span>
          </div>
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
                <div className="text-lg font-black text-amber-300">×1–×2</div>
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
          {/* Winners marquee — uses liveTicker (updates every 5 min) */}
          <div className="border-t border-white/10 bg-black/20 px-3 py-2 overflow-hidden">
            <div className="flex gap-2 animate-[hh-marquee_30s_linear_infinite] whitespace-nowrap">
              {[...liveTicker, ...liveTicker].map((w, i) => (
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
            <span className="text-[11px] font-bold text-white/50">Min 20% of balance</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {STAKE_TIERS.map(t => {
              const stakeAmt = Math.floor(balance * t.pct / 100)
              const expiry = (spinCooldowns as Record<number, number>)[t.pct] || 0
              const isUsed = expiry > Date.now()
              const isCurrentTier = amount === stakeAmt && spinSessionActive
              const isDisabled = isUsed || (spinSessionActive && !isCurrentTier)
              return (
                <button
                  key={t.pct}
                  disabled={isDisabled}
                  onClick={() => {
                    if (isUsed) {
                      const leftH = Math.ceil((expiry - Date.now()) / 3600000)
                      const leftM = Math.ceil((expiry - Date.now()) / 60000)
                      const label = leftH >= 1 ? `${leftH}h` : `${leftM}m`
                      toast({ title: `${t.pct}% already used`, description: `This tier is locked for ${label}. Choose a remaining tier.`, variant: "destructive" })
                      return
                    }
                    if (spinSessionActive && !isCurrentTier) {
                      toast({ title: "Complete current spin first", description: "Finish your current tier spin before switching.", variant: "destructive" })
                      return
                    }
                    setAmount(stakeAmt); setCustom(String(stakeAmt))
                  }}
                  className={`rounded-2xl border p-3 text-center font-black transition relative overflow-hidden ${isUsed ? "bg-white/5 border-white/10 text-white/35 cursor-not-allowed opacity-60" : isDisabled ? "bg-white/5 border-white/10 text-white/35 cursor-not-allowed opacity-60" : amount===stakeAmt ? "bg-emerald-500 text-white border-emerald-400 shadow-[0_8px_20px_rgba(16,185,129,0.35)]" : "bg-white/5 border-white/10 text-white hover:border-emerald-500/30"}`}>
                  <div className="text-lg font-black flex items-center justify-center gap-1">{t.label} {isUsed && <Lock className="h-3 w-3 opacity-60" />}</div>
                  <div className={`text-[10px] mt-0.5 ${isUsed ? "text-white/30" : isDisabled ? "text-white/30" : "text-white/50"}`}>{isUsed ? "Used • 24h lock" : isDisabled ? "Complete current spin" : t.desc}</div>
                  <div className={`text-xs font-bold mt-1 ${isUsed ? "text-white/30" : isDisabled ? "text-white/30" : "text-emerald-300"}`}>₦{stakeAmt.toLocaleString()}</div>
                  {isUsed && <div className="absolute inset-0 bg-black/20 pointer-events-none" />}
                </button>
              )
            })}
          </div>
          <div className="mt-3 flex gap-2">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 font-black">₦</span>
              <input
                inputMode="numeric"
                placeholder={`Custom (${balance > 0 ? Math.floor(balance * 0.2).toLocaleString() : "0"} min)`}
                value={custom}
                readOnly
                tabIndex={-1}
                aria-readonly="true"
                title="Custom amount is locked — use 20% / 30% / 40% buttons"
                className="w-full rounded-2xl bg-black/30 border border-white/10 pl-7 pr-9 py-3 text-sm font-bold text-white placeholder:text-white/30 outline-none cursor-not-allowed opacity-80 select-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
                <Lock className="h-4 w-4" />
              </span>
            </div>
            <div className="rounded-2xl bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border border-amber-500/20 px-4 flex flex-col justify-center text-center min-w-[124px]">
              <div className="text-[10px] tracking-widest font-black text-white/60">YOU COULD WIN</div>
              <div className="text-lg font-black text-amber-300">₦{winMin.toLocaleString()}–₦{winMax.toLocaleString()}</div>
              <div className="text-[11px] font-bold text-emerald-300">×1 or ×2 of stake back</div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/5 border border-white/10 py-2">
              <div className="text-[10px] font-black tracking-widest text-white/50">STAKE</div>
              <div className="text-sm font-black">₦{amount.toLocaleString()}</div>
            </div>
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 py-2">
              <div className="text-[10px] font-black tracking-widest text-emerald-300">OF BALANCE</div>
              <div className="text-sm font-black text-emerald-300">{balance > 0 ? Math.round((amount / balance) * 100) : 0}%</div>
            </div>
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 py-2">
              <div className="text-[10px] font-black tracking-widest text-amber-300">PAYOUT</div>
              <div className="text-sm font-black text-amber-300">₦{winMin.toLocaleString()}–₦{winMax.toLocaleString()}</div>
            </div>
          </div>
          <Button onClick={onStake} className="w-full mt-4 rounded-full hh-btn-primary font-black text-base py-6 shadow-[0_10px_30px_rgba(16,185,129,0.35)]">
            <Zap className="h-5 w-5 mr-2" /> Stake ₦{amount.toLocaleString()} — Win up to ₦{winMax.toLocaleString()}
          </Button>
          {/* Thumb-zone design text — commented out per request: next element after Stake→Win button is now 20%/30%/40% pills */}
          {/* <p className="text-center text-[11px] text-white/50 mt-2">Thumb-zone design • 1 tap to stake • instant settlement</p> */}
        </div>

        {/* Spin & Win Wheel — directly after stake selector: next sibling after Stake→Win is 20%/30%/40% pills */}
        <div className="hh-card flex flex-col items-center !py-6 border-amber-500/20">
          {/* SPIN & WIN header + description — commented out per request (20%/30%/40% is now immediate next after stake button) */}
          {/* <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2 font-black tracking-widest text-[11px]"><Crown className="h-4 w-4 text-amber-300" /> SPIN & WIN</div>
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">30% WIN</span>
          </div>
          <p className="w-full text-left text-[11px] text-white/50 mt-1">Uses your selected stake above (₦{spinStake.toLocaleString()} • {spinTierPct}%). One tier wins at random each spin.</p> */}
          {/* Cooldown hint per tier — individual 24h timers */}
          <div className="mt-2 w-full grid grid-cols-3 gap-2">
            {[20,30,40].map(pct => {
              const expiry = (spinCooldowns as Record<number, number>)[pct] || 0
              const active = expiry > Date.now()
              const leftMs = Math.max(0, expiry - Date.now())
              const leftH = Math.ceil(leftMs/3600000)
              return (
                <div key={pct} className={`rounded-xl border py-1.5 text-center text-[10px] font-black ${active ? "bg-amber-500/10 border-amber-500/30 text-amber-300" : "bg-white/5 border-white/10 text-white/60"}`}>
                  {pct}% {active ? `• ${leftH}h lock` : "• ready"}
                </div>
              )
            })}
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
            {/* Wheel-center spin button — SAME gate/action as sticky CTA below (isSpinDisabled + doSpin).
                No refill: each tier (20/30/40%) is once per 24h. */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-20 h-20">
              <div className="relative w-full h-full rounded-full">
                {!spinning && (
                  <div className="absolute inset-0 rounded-full flex items-center justify-center pointer-events-none">
                    <Sparkles className="h-5 w-5 text-amber-300 animate-pulse" style={{ filter: 'drop-shadow(0 0 8px #fbbf24)' }} />
                  </div>
                )}
                <button
                  onClick={doSpin}
                  disabled={isSpinDisabled}
                  className="hh-spin-glow-center relative w-full h-full rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-black font-black text-[11px] leading-none shadow-[0_6px_20px_rgba(245,158,11,0.45)] disabled:opacity-60 flex flex-col items-center justify-center border-4 border-white/20 z-10"
                >
                  {spinning ? (
                    <span>...</span>
                  ) : (
                    <>
                      <span>TAP TO</span>
                      <span>SPIN</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          <div className="mt-2 text-[11px] font-bold text-white/50">Stake ₦{spinStake.toLocaleString()} • Spins {spins} • Max 3/day (one per tier)</div>
          {showSpinResult && spinResult && (
            <div className={`mt-4 w-full rounded-2xl border p-3 text-center ${spinResult.win ? "bg-emerald-500/15 border-emerald-500/30" : "bg-white/5 border-white/10"}`}>
              {spinResult.win ? <div className="font-black text-emerald-300 flex items-center justify-center gap-2"><Trophy className="h-5 w-5" /> WON {spinResult.label} — +₦{(settleInfo ? settleInfo.credited : creditForWin(spinStake, (spinResult.amount || 2) as 1 | 2)).toLocaleString()} 🎉</div> : <div className="font-bold text-white/70">LOSE — try again, winning tier varies each spin</div>}
              <div className="text-[11px] text-white/50 mt-1">Stake ₦{spinStake.toLocaleString()} • {spinResult.win ? `profit +₦${((settleInfo ? settleInfo.credited : creditForWin(spinStake, (spinResult.amount || 2) as 1 | 2)) - spinStake).toLocaleString()}` : `lost ₦${spinStake.toLocaleString()}`}</div>
            </div>
          )}
        </div>

        {/* Social proof — live stakers (now below wheel, not between stake selector and wheel) */}
        <div className="hh-card">
          <div className="flex items-center justify-between">
            <h4 className="font-black flex items-center gap-2"><Users className="h-4 w-4 text-white" /> Live stakers</h4>
            <span className="text-xs font-bold text-emerald-300 flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span> 1,247 online</span>
          </div>
          <div className="mt-3 space-y-2">
            {liveTicker.map((w, i) => (
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
                  <div className="text-[11px] text-emerald-300">won • {w.ago}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center text-[11px] text-white/40 pb-2">18+ • Stake responsibly • Provably fair • Terms apply</div>
      </div>

      {/* Stay-and-play guard: backing out mid-session lands here instead. */}
      {showStayModal && spinSessionActive && !showSpinCompleteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="hh-popup max-w-sm w-full text-center">
            <div className="hh-popup-header flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 border border-amber-400/30 flex items-center justify-center">
                <AlertTriangle className="h-7 w-7 text-amber-400" />
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">You have to play 🎯</h2>
            </div>
            <p className="text-sm text-white/80 mt-2 leading-relaxed">
              You still have <span className="font-black text-amber-300">{availableTiers.length} spin{availableTiers.length === 1 ? "" : "s"} left</span> today. Finish {availableTiers.length === 1 ? "it" : "them"} first — your tiers reset in 24 hours.
            </p>
            <button
              onClick={() => setShowStayModal(false)}
              className="hh-popup-btn hh-popup-btn-confirm w-full mt-6"
            >
              Stay & Play →
            </button>
            {balance < 200 && (
              <button
                onClick={() => router.push("/dashboard")}
                className="w-full mt-2 text-xs text-white/40 underline"
              >
                Balance too low to play — leave anyway
              </button>
            )}
          </div>
        </div>
      )}

      {/* Spin Complete Modal */}
      {showSpinCompleteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="hh-popup max-w-md w-full">
            <div className="hh-popup-header">
              <Trophy className="h-8 w-8 text-amber-400" />
              <h2 className="text-xl font-bold text-white">Spins Complete</h2>
            </div>
            <p className="text-gray-300 text-center mb-4">
              You've used all your available spins for today ({spins}/3).
            </p>
            <p className="text-xs text-white/50 text-center mb-6">
              Each tier (20%, 30%, 40%) can be spun once per 24 hours. Come back tomorrow for more spins!
            </p>
            {/* Sole exit route: 3/3 popup → dashboard (no home/back elsewhere) */}
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/dashboard")}
                className="hh-popup-btn hh-popup-btn-confirm flex-1"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exceeded Spins Modal - blocks entry when all 3 spins used */}
      {showExceededModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="hh-popup max-w-md w-full">
            <div className="hh-popup-header">
              <AlertTriangle className="h-8 w-8 text-amber-400" />
              <h2 className="text-xl font-bold text-white">Spins Exhausted</h2>
            </div>
            <p className="text-gray-300 text-center mb-4">
              You've used all 3 spins for today.
            </p>
            <p className="text-xs text-white/50 text-center mb-6">
              Each tier (20%, 30%, 40%) can be spun once per 24 hours. Please come back tomorrow for more spins!
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="hh-popup-btn hh-popup-btn-confirm w-full"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Thumb-zone sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-20">
        <div className="max-w-md mx-auto px-4 pb-4 pt-2 bg-gradient-to-t from-[#050d14] via-[#050d14]/95 to-transparent">
          <div className="rounded-[20px] bg-white/5 backdrop-blur-xl border border-white/10 p-2 flex gap-2">
            <div className="flex-1 rounded-full bg-black/30 border border-white/10 px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-black">Stake {STAKE_TIERS_MAP[getTierForStake(amount)]?.label || "Custom"} ₦{amount.toLocaleString()}</span>
              <span className="text-sm font-black text-amber-300">→ Win up to ₦{winMax.toLocaleString()}</span>
            </div>
            <Button
              onClick={doSpin}
              disabled={isSpinDisabled}
              className={`rounded-full hh-btn-primary hh-spin-glow font-black px-6 ${isSpinDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {spinning ? "Spinning..." : "Tap to Spin"}
            </Button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes hh-marquee { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
        .hh-marquee { animation: hh-marquee 30s linear infinite; }
        @keyframes hh-spin-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.55), 0 6px 20px rgba(245,158,11,0.45); transform: translate(-50%, -50%) scale(1); }
          50% { box-shadow: 0 0 0 10px rgba(245,158,11,0), 0 8px 28px rgba(245,158,11,0.7), 0 0 36px rgba(251,191,36,0.55); transform: translate(-50%, -50%) scale(1.03); }
        }
        .hh-spin-glow { animation: hh-spin-glow 1.6s ease-in-out infinite; }
        .hh-spin-glow:disabled { animation: none; opacity: 0.6; }
        /* ── Go-home popup card + GLOWING button (unmissable CTA) ── */
        .hh-popup { background: linear-gradient(135deg, #0d1f2d, #0a1628); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px; padding: 24px; box-shadow: 0 30px 60px rgba(0,0,0,0.5);
          animation: hh-popup-appear 0.3s cubic-bezier(0.34,1.56,0.64,1); }
        @keyframes hh-popup-appear { from { opacity: 0; transform: scale(0.8) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .hh-popup-header { display: flex; flex-direction: column; align-items: center; gap: 12px; margin-bottom: 16px; }
        .hh-popup-btn { display: block; width: 100%; padding: 15px 16px; border-radius: 14px; font-weight: 800; font-size: 15px;
          border: none; cursor: pointer; transition: transform 0.15s ease, box-shadow 0.2s ease; }
        .hh-popup-btn-confirm { background: linear-gradient(135deg, #10b981, #059669); color: #fff;
          border: 1px solid rgba(16,185,129,0.55);
          box-shadow: 0 0 0 0 rgba(16,185,129,0.55), 0 8px 24px rgba(16,185,129,0.45);
          animation: hh-confirm-glow 1.8s ease-in-out infinite; }
        .hh-popup-btn-confirm:hover { transform: translateY(-2px); }
        .hh-popup-btn-confirm:active { transform: scale(0.97); }
        @keyframes hh-confirm-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.55), 0 8px 24px rgba(16,185,129,0.45); }
          50% { box-shadow: 0 0 0 10px rgba(16,185,129,0), 0 10px 32px rgba(16,185,129,0.65), 0 0 28px rgba(52,211,153,0.5); }
        }
        /* Wheel-center button: glow WITHOUT translate so it stays dead-center
           (parent wrapper already handles -translate-x/y centering). */
        @keyframes hh-spin-glow-center {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.55), 0 6px 20px rgba(245,158,11,0.45); transform: scale(1); }
          50% { box-shadow: 0 0 0 10px rgba(245,158,11,0), 0 8px 28px rgba(245,158,11,0.7), 0 0 36px rgba(251,191,36,0.55); transform: scale(1.03); }
        }
        .hh-spin-glow-center { animation: hh-spin-glow-center 1.6s ease-in-out infinite; }
        .hh-spin-glow-center:disabled { animation: none; opacity: 0.6; }
        /* thumb-zone button is not centered with translate, so override to keep glow without translate */
        .hh-spin-glow.hh-btn-primary { animation: hh-spin-glow-btn 1.6s ease-in-out infinite; }
        @keyframes hh-spin-glow-btn {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.45), 0 6px 20px rgba(16,185,129,0.35); }
          50% { box-shadow: 0 0 0 8px rgba(16,185,129,0), 0 8px 28px rgba(16,185,129,0.55), 0 0 26px rgba(52,211,153,0.45); }
        }
      `}</style>
    </div>
  )
}

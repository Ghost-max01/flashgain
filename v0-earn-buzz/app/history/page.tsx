"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, ClipboardList, Users, Banknote, ShoppingBag, Clock, CheckCircle2, Gift, Trophy, XCircle,
} from "lucide-react"
import { safeParse } from "@/lib/safe-storage"
import { loadTaskLedger } from "@/lib/task-ledger"
import {
  listActivePendings, loadCompletedWithdrawals, completeWithdrawal,
  markReadySeen, type PendingWithdrawal,
} from "@/lib/pending-withdrawals"
import { BottomNav } from "@/components/bottom-nav"

type Tab = "all" | "referrals" | "tasks" | "withdrawals" | "purchases"

interface Row {
  id: string
  // "welcome" + "claims" + "spin" are All-tab-only rows (never get their own tab).
  tab: Exclude<Tab, "all"> | "welcome" | "claims" | "spin"
  title: string
  sub: string
  amount: number // +credit / -debit
  status: "credited" | "pending" | "ready" | "withdrawn" | "paid" | "lost"
  date: number
  pendingId?: string // tap-to-resume/complete (pending withdrawals only)
}

// Max rows rendered per tab (and per All view) — newest first.
const MAX_ROWS = 50

const TASK_KEYS = [
  "tivexx-completed-tasks",
  "mt-completed-tasks", "mt-completed-tasks-24h", "mt-completed-tasks-3d",
  "mu-completed-tasks", "mu-completed-tasks-2d", "mu-completed-tasks-1w",
  "auto-tap-completed-tasks",
  "tivexx-tiered-completed-tasks",
]

function prettyTaskLabel(id: string) {
  return String(id || "Task").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 30) || "Task"
}

function fmtDate(ts: number) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(new Date(ts)).replace(",", "")
  } catch { return "" }
}

function fmtLeft(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}h ${m}m left`
  if (m > 0) return `${m}m left`
  return `${s}s left`
}

export default function HistoryPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("all")
  const [userId, setUserId] = useState("")
  const [refRecents, setRefRecents] = useState<{ id: string; amount: number; date: number; approved: boolean }[]>([])
  const [refWithdrawn, setRefWithdrawn] = useState<{ id: string; amount: number; date: string; method?: string; phone?: string; network?: string; accountLast4?: string; type?: string }[]>([])
  const [taskRows, setTaskRows] = useState<Row[]>([])
  const [claimRows, setClaimRows] = useState<Row[]>([])
  const [spinRows, setSpinRows] = useState<Row[]>([])
  const [welcomeRow, setWelcomeRow] = useState<Row | null>(null)
  const [pendings, setPendings] = useState<PendingWithdrawal[]>([])
  const [completedW, setCompletedW] = useState<{ id: string; reference: string; amount: number; date: number; label: string }[]>([])
  const [purchases, setPurchases] = useState<Row[]>([])
  const [, setTick] = useState(0)

  // Deep link: /history?tab=withdrawals (dashboard mail badge)
  useEffect(() => {
    try {
      const t = new URLSearchParams(window.location.search).get("tab")
      if (t === "referrals" || t === "tasks" || t === "withdrawals" || t === "purchases") setTab(t)
    } catch {}
  }, [])

  useEffect(() => {
    const raw = localStorage.getItem("tivexx-user")
    if (!raw) { router.push("/login"); return }
    const u = safeParse<any>(raw, null)
    if (!u) { router.push("/login"); return }
    const uid = u.id || u.userId || u.user_id || ""
    setUserId(uid)

    // ── Tasks: ledger (dated) + legacy completed ids (no date) ──
    try {
      const ledger = loadTaskLedger()
      const covered = new Set(ledger.map((r) => r.taskId))
      const legacyIds: string[] = []
      for (const k of TASK_KEYS) {
        const arr = safeParse<any>(localStorage.getItem(k), [])
        if (Array.isArray(arr)) {
          for (const v of arr) {
            const id = typeof v === "string" ? v : String((v as any)?.id || (v as any)?.taskId || "")
            if (id && !covered.has(id) && !legacyIds.includes(id)) legacyIds.push(id)
          }
        }
      }
      const dated: Row[] = ledger.map((r) => ({
        id: `ledger-${r.id}`, tab: "tasks", title: "Task Earning",
        sub: `${fmtDate(new Date(r.date).getTime())}`,
        amount: r.amount, status: "credited", date: new Date(r.date).getTime() || Date.now(),
      }))
      const legacy: Row[] = legacyIds.map((id) => ({
        id: `legacy-${id}`, tab: "tasks", title: "Task Earning",
        sub: `Completed earlier`,
        amount: 1000, status: "credited", date: 0,
      }))
      const all = [...dated, ...legacy].sort((a, b) => b.date - a.date).slice(0, MAX_ROWS)
      setTaskRows(all)
    } catch {}

    // ── Referrals ──
    try {
      const rw = safeParse<any[]>(localStorage.getItem("tivexx-referral-withdrawals"), [])
      if (Array.isArray(rw)) {
        setRefWithdrawn(rw.filter((x) => Number(x?.amount) > 0).map((x: any) => ({
          id: String(x.id || `${x.date}-${x.amount}`),
          amount: Number(x.amount),
          date: String(x.date || new Date().toISOString()),
          method: String(x.method || x.type || ""),
          phone: String(x.phone || ""),
          network: String(x.network || ""),
          accountLast4: String(x.accountLast4 || ""),
          type: String(x.type || x.method || ""),
        })))
      }
    } catch {}
    if (uid) {
      fetch(`/api/referral-stats?userId=${encodeURIComponent(uid)}&t=${Date.now()}`)
        .then((r) => r.json()).then((d) => {
          if (d?.success && Array.isArray((d as any).recent)) {
            setRefRecents(
              ((d as any).recent as any[])
                .filter((x) => x && (x.id || x.date))
                .map((x: any) => ({
                  id: String(x.id || `${x.date}-${x.amount}`),
                  amount: Number(x.amount || 0),
                  date: Number(x.date || 0),
                  approved: (x as any).approved === true,
                }))
                .sort((a, b) => b.date - a.date)
                .slice(0, MAX_ROWS),
            )
          }
        }).catch(() => {})
    }

    // ── Welcome bonus: always the OLDEST entry (sinks to the bottom, drops
    // off once 50 newer transactions exist). Date 0 when unknown = bottom.
    try {
      const wb = safeParse<any>(localStorage.getItem("tivexx-welcome-bonus"), null)
      const at = Number(wb?.at) || 0
      setWelcomeRow({
        id: "welcome-bonus", tab: "welcome", title: "Welcome Bonus",
        sub: at ? `Sign-up bonus · ${fmtDate(at)}` : "Sign-up bonus · Account creation",
        amount: 5000, status: "credited", date: at,
      })
    } catch {}

    // ── Spin & Win: local receipts + server backfill (deduped) ──
    // Win = two rows (stake out, credit in) so balances reconcile; loss = one.
    const buildSpinRows = (local: any[], server: any[]): Row[] => {
      const rows: Row[] = []
      const pushSpin = (stake: number, credited: number, mult: number, outcome: string, at: number, tag: string) => {
        const d = at || 0
        const sub = d ? fmtDate(d) : "Completed earlier"
        if (outcome === "win") {
          rows.push({
            id: `spin-win-${tag}`, tab: "spin", title: `Spin Win ×${mult === 2 ? 2 : 1}`,
            sub, amount: credited, status: "credited", date: d,
          })
          rows.push({
            id: `spin-stake-${tag}`, tab: "spin", title: "Spin Stake",
            sub, amount: -Math.abs(stake), status: "paid", date: d,
          })
        } else {
          rows.push({
            id: `spin-loss-${tag}`, tab: "spin", title: "Spin Loss",
            sub, amount: -Math.abs(stake), status: "lost", date: d,
          })
        }
      }
      const seen: { stake: number; outcome: string; at: number }[] = []
      for (const [i, s] of (Array.isArray(local) ? local : []).entries()) {
        if (!s || Number(s?.stake) <= 0) continue
        const stake = Math.floor(Number(s.stake))
        const outcome = (s as any).outcome === "win" ? "win" : "loss"
        const credited = outcome === "win" ? Math.max(0, Math.floor(Number((s as any).credited) || 0)) : 0
        const mult = Number((s as any).multiplier) === 2 ? 2 : 1
        const at = Number((s as any).at) || 0
        seen.push({ stake, outcome, at })
        pushSpin(stake, credited, mult, outcome, at, `loc-${at}-${stake}-${i}`)
      }
      for (const [i, s] of (Array.isArray(server) ? server : []).entries()) {
        if (!s || Number(s?.stake) <= 0) continue
        const stake = Math.floor(Number(s.stake))
        const outcome = (s as any).outcome === "win" ? "win" : "loss"
        const at = Number((s as any).at) || 0
        // Dedupe against local receipts (same stake+outcome within 2 minutes).
        const dup = seen.some((l) => l.stake === stake && l.outcome === outcome && Math.abs(l.at - at) < 120000)
        if (dup) continue
        seen.push({ stake, outcome, at })
        pushSpin(
          stake,
          outcome === "win" ? Math.max(0, Math.floor(Number((s as any).credited) || 0)) : 0,
          Number((s as any).multiplier) === 2 ? 2 : 1,
          outcome, at, `srv-${at}-${stake}-${i}`,
        )
      }
      return rows.sort((a, b) => b.date - a.date).slice(0, MAX_ROWS)
    };
    try {
      const localStakes = safeParse<any[]>(localStorage.getItem("stake_history"), [])
      setSpinRows(buildSpinRows(localStakes, []))
      if (uid) {
        fetch(`/api/stake/history?userId=${encodeURIComponent(uid)}&t=${Date.now()}`)
          .then((r) => r.json()).then((d) => {
            if (d?.success && Array.isArray((d as any).spins)) {
              const cur = safeParse<any[]>(localStorage.getItem("stake_history"), [])
              setSpinRows(buildSpinRows(cur, (d as any).spins))
            }
          }).catch(() => {})
      }
    } catch {}

    // ── Dashboard claims (tap earnings stay out — too many to list) ──
    try {
      const tx = safeParse<any[]>(localStorage.getItem("tivexx-transactions"), [])
      const rows: Row[] = (Array.isArray(tx) ? tx : [])
        .filter((t) => t && Number(t.amount) > 0)
        .map((t: any, i: number) => ({
          id: `claim-${String(t.id ?? i)}`,
          tab: "claims" as const,
          title: "Claim Reward",
          sub: `${fmtDate(new Date(t.date || Date.now()).getTime())}`,
          amount: Number(t.amount),
          status: "credited" as const,
          date: new Date(t.date || Date.now()).getTime() || 0,
        }))
        .sort((a, b) => b.date - a.date)
        .slice(0, MAX_ROWS)
      setClaimRows(rows)
    } catch {}

    // ── Withdrawals: pending + completed store + server rows ──
    const refreshW = () => {
      setPendings(listActivePendings())
      const done = loadCompletedWithdrawals().map((c) => ({
        id: `done-${c.id}`, reference: c.reference, amount: c.amount,
        date: c.completedAt, label: "Withdrawal",
      }))
      // Server history rows (dedupe by reference against local completed)
      if (uid) {
        fetch(`/api/withdrawals/history?userId=${encodeURIComponent(uid)}&t=${Date.now()}`)
          .then((r) => r.json()).then((d) => {
            const rows = Array.isArray(d?.withdrawals) ? d.withdrawals : Array.isArray(d) ? d : []
            const known = new Set(done.map((x) => x.reference))
            const extra = (rows as any[])
              .filter((w) => w && !known.has(String(w.reference || w.id || "")))
              .map((w: any, i: number) => ({
                id: `srv-${String(w.reference || w.id || i)}`,
                reference: String(w.reference || w.id || ""),
                amount: Number(w.amount || 0),
                date: new Date(w.created_at || w.date || Date.now()).getTime(),
                label: `Withdrawal ${w.status || ""}`.trim(),
              }))
            setCompletedW([...done, ...extra].sort((a, b) => b.date - a.date).slice(0, MAX_ROWS))
          }).catch(() => setCompletedW(done))
      } else {
        setCompletedW(done)
      }
    }
    refreshW()
    const id = setInterval(refreshW, 30000)
    const id2 = setInterval(() => setTick((t) => t + 1), 30000) // countdown refresh

    // ── Purchases: investments + pending auto-tap payments ──
    try {
      const rows: Row[] = []
      const inv = safeParse<any[]>(localStorage.getItem("investment_history"), [])
      if (Array.isArray(inv)) {
        for (const p of inv) {
          rows.push({
            id: `inv-${String(p?.reference || p?.at || Math.random())}`,
            tab: "purchases", title: `Purchase — ${String(p?.plan || "Plan")}`,
            sub: `${fmtDate(Number(p?.at) || Date.now())}`,
            amount: -Math.abs(Number(p?.amount || 0)), status: "paid",
            date: Number(p?.at) || Date.now(),
          })
        }
      }
      const tapPay = safeParse<any>(localStorage.getItem("pending_auto_tap_payment"), null)
      if (tapPay && Number(tapPay.amount) > 0) {
        rows.push({
          id: "tap-pay", tab: "purchases", title: `Purchase — Auto-tap ${String(tapPay.planId || "")}`,
          sub: `${fmtDate(Number(tapPay.at) || Date.now())} · Pending`,
          amount: -Math.abs(Number(tapPay.amount)), status: "pending",
          date: Number(tapPay.at) || Date.now(),
        })
      }
      // Completed auto-tap / upgrade purchases (recorded at Paystack callback)
      const donePay = safeParse<any[]>(localStorage.getItem("tivexx-completed-purchases"), [])
      if (Array.isArray(donePay)) {
        for (const p of donePay) {
          if (!p || Number(p?.amount) <= 0) continue
          rows.push({
            id: `done-pay-${String(p?.reference || p?.at || Math.random())}`,
            tab: "purchases", title: `Purchase — ${String(p?.label || `Auto-tap ${p?.planId || ""}`)}`.slice(0, 40),
            sub: `${fmtDate(Number(p?.at) || Date.now())}`,
            amount: -Math.abs(Number(p?.amount)), status: "paid",
            date: Number(p?.at) || Date.now(),
          })
        }
      }
      setPurchases(rows.sort((a, b) => b.date - a.date).slice(0, MAX_ROWS))
    } catch {}

    return () => { clearInterval(id); clearInterval(id2); }
  }, [router])

  const referralRows: Row[] = useMemo(() => {
    const rows: Row[] = []
    // Individual referrals with exact time (server recents, newest first).
    for (const r of refRecents) {
      rows.push({
        id: `ref-${r.id}`, tab: "referrals",
        title: r.approved ? "Referral Earning" : "Referral Pending",
        sub: r.date ? `${fmtDate(r.date)}${r.approved ? "" : " · activates at Beginner"}` : "Pending",
        amount: r.approved ? r.amount : 0,
        status: r.approved ? "credited" : "pending",
        date: r.date,
      })
    }
    for (const w of refWithdrawn) {
      const t = String((w as any)?.type || (w as any)?.method || "").toLowerCase();
      const isAirtime = t.includes("airtime");
      const isVip = t.includes("vip");
      const title = isAirtime ? (isVip ? "VIP Airtime" : "Referral Airtime") : "Referral Cash";
      const dest = isAirtime && (w as any)?.phone
        ? ` · ${(w as any)?.network ? `${(w as any).network} ` : ""}${String((w as any).phone).slice(0, 4)}••••${String((w as any).phone).slice(-2)}`
        : !(isAirtime) && (w as any)?.accountLast4
          ? ` · Bank •••• ${(w as any).accountLast4}`
          : "";
      rows.push({
        id: `ref-wd-${w.id}`, tab: "referrals", title,
        sub: `${fmtDate(new Date(w.date).getTime())}${dest}`,
        amount: -Math.abs(w.amount), status: "withdrawn", date: new Date(w.date).getTime() || 0,
      })
    }
    return rows.sort((a, b) => b.date - a.date).slice(0, MAX_ROWS)
  }, [refRecents, refWithdrawn])

  const withdrawalRows: Row[] = useMemo(() => {
    const rows: Row[] = []
    const now = Date.now()
    for (const p of pendings) {
      const ready = p.status === "ready"
      rows.push({
        id: `pend-${p.id}`, tab: "withdrawals",
        title: ready ? "Withdrawal — Ready" : "Withdrawal — Pending",
        sub: `₦${p.amount.toLocaleString()} · ${p.bank || "Bank"} •••• ${String(p.accountNumber || "").slice(-4)} · ${
          ready ? "Approved — tap to complete" : `Support verifies · ${fmtLeft(p.verifyBy - now)}`
        }`,
        amount: p.amount, status: ready ? "ready" : "pending",
        date: p.placedAt, pendingId: p.id,
      })
    }
    for (const c of completedW) {
      rows.push({
        id: c.id, tab: "withdrawals", title: c.label,
        sub: fmtDate(c.date), amount: c.amount, status: "credited", date: c.date,
      })
    }
    return rows.sort((a, b) => b.date - a.date).slice(0, MAX_ROWS)
  }, [pendings, completedW])

  // All = everything merged, newest first, max 50. Welcome bonus is the
  // oldest entry so it sinks to the bottom and drops off past 50.
  const allRows = useMemo(
    () => [...referralRows, ...taskRows, ...withdrawalRows, ...purchases, ...claimRows, ...spinRows, ...(welcomeRow ? [welcomeRow] : [])]
      .sort((a, b) => b.date - a.date)
      .slice(0, MAX_ROWS),
    [referralRows, taskRows, withdrawalRows, purchases, claimRows, spinRows, welcomeRow],
  )

  const counts = {
    all: allRows.length,
    referrals: referralRows.length,
    tasks: taskRows.length,
    withdrawals: withdrawalRows.length,
    purchases: purchases.length,
  }
  const visible = tab === "all" ? allRows : allRows.filter((r) => r.tab === tab)

  const tabs: { id: Tab; label: string }[] = [
    { id: "all", label: `All (${counts.all})` },
    { id: "referrals", label: `Referrals (${counts.referrals})` },
    { id: "tasks", label: `Task Earnings (${counts.tasks})` },
    { id: "withdrawals", label: `Withdrawals (${counts.withdrawals})` },
    { id: "purchases", label: `Purchases (${counts.purchases})` },
  ]

  const handlePendingTap = (row: Row) => {
    if (!row.pendingId) return
    const p = pendings.find((x) => x.id === row.pendingId)
    if (!p) return
    if (p.status === "ready") {
      completeWithdrawal(p.id)
      setPendings(listActivePendings())
      try { window.dispatchEvent(new Event("tivexx:support-unread")); } catch {}
      router.push("/history?tab=withdrawals")
    } else {
      // Resume where it stopped (fee / verification continue page).
      router.push(`/withdraw/result?reference=${encodeURIComponent(p.reference)}`)
    }
  }

  const openTab = (t: Tab) => {
    setTab(t)
    if (t === "withdrawals") {
      // Opening withdrawals marks ready items seen (clears dashboard mail badge).
      markReadySeen()
      try { window.dispatchEvent(new Event("tivexx:update")); } catch {}
    }
  }

  const StatusLine = ({ row }: { row: Row }) => {
    if (row.status === "credited") return <span className="hs-status hs-credited"><CheckCircle2 className="h-3 w-3" /> Credited</span>
    if (row.status === "withdrawn") return <span className="hs-status hs-credited"><CheckCircle2 className="h-3 w-3" /> Withdrawn</span>
    if (row.status === "paid") return <span className="hs-status hs-credited"><CheckCircle2 className="h-3 w-3" /> Paid</span>
    if (row.status === "lost") return <span className="hs-status hs-lost"><XCircle className="h-3 w-3" /> Lost</span>
    if (row.status === "ready") return <span className="hs-status hs-ready"><CheckCircle2 className="h-3 w-3" /> Ready — tap to complete</span>
    return <span className="hs-status hs-pending"><Clock className="h-3 w-3" /> Pending</span>
  }

  const RowIcon = ({ row }: { row: Row }) => {
    if (row.tab === "welcome") return <Gift className="h-5 w-5 text-amber-300" />
    if (row.tab === "spin") return <Trophy className="h-5 w-5 text-amber-300" />
    if (row.tab === "referrals") return <Users className="h-5 w-5 text-emerald-300" />
    if (row.tab === "withdrawals") return <Banknote className="h-5 w-5 text-emerald-300" />
    if (row.tab === "purchases") return <ShoppingBag className="h-5 w-5 text-emerald-300" />
    return <ClipboardList className="h-5 w-5 text-emerald-300" />
  }

  return (
    <div className="hs-root min-h-screen pb-28 relative overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 hs-header">
        <div className="max-w-md mx-auto px-5 pt-7 pb-4 flex items-center gap-3">
          <Link href="/profile">
            <button className="hs-back-btn" aria-label="Back to profile">
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Link>
          <span className="w-11 h-11 rounded-2xl bg-amber-400/90 flex items-center justify-center shrink-0">
            <Clock className="h-6 w-6 text-[#0b3d2e]" />
          </span>
          <div>
            <h1 className="text-xl font-black text-white">History</h1>
            <p className="text-xs text-white/60">{allRows.length} transactions</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-3 relative z-10 pb-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => openTab(t.id)}
              className={`hs-tab${tab === t.id ? " hs-tab-active" : ""}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Rows — view only (except pending withdrawals: tap to resume/complete) */}
        {visible.length === 0 ? (
          <div className="text-center py-10 text-white/50 text-sm">Nothing here yet.</div>
        ) : (
          <div className="space-y-3">
            {visible.map((row) => (
              <div key={row.id}>
                {row.pendingId ? (
                  <button onClick={() => handlePendingTap(row)} className="hs-card w-full text-left">
                    <span className="hs-ico"><RowIcon row={row} /></span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-black text-white">{row.title}</span>
                      <span className="block text-[11px] text-white/55 mt-0.5">{row.sub}</span>
                    </span>
                    <span className="text-right shrink-0">
                      <span className="block text-sm font-black text-amber-300">₦{Math.abs(row.amount).toLocaleString()}</span>
                      <StatusLine row={row} />
                    </span>
                  </button>
                ) : (
                  <div className="hs-card">
                    <span className="hs-ico"><RowIcon row={row} /></span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-black text-white">{row.title}</span>
                      <span className="block text-[11px] text-white/55 mt-0.5">{row.sub}</span>
                    </span>
                    <span className="text-right shrink-0">
                      <span className={`block text-sm font-black ${row.amount < 0 ? "text-white/85" : row.amount > 0 ? "text-emerald-300" : "text-white/50"}`}>
                        {row.amount < 0 ? `−₦${Math.abs(row.amount).toLocaleString()}` : row.amount > 0 ? `+₦${row.amount.toLocaleString()}` : "₦0"}
                      </span>
                      <StatusLine row={row} />
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />

      <style jsx global>{`
        .hs-root { font-family: 'Syne', sans-serif; background: linear-gradient(180deg, #0b3d2e 0%, #071f18 45%, #050d14 100%); color: white; min-height: 100vh; }
        .hs-header { background: rgba(7,31,24,0.9); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255,255,255,0.08); }
        .hs-back-btn { width: 38px; height: 38px; border-radius: 12px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); display: flex; align-items: center; justify-content: center; color: white; }
        .hs-tab { font-size: 11px; font-weight: 800; padding: 8px 14px; border-radius: 9999px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.75); }
        .hs-tab-active { background: #22c55e; border-color: #22c55e; color: #052e1b; }
        .hs-card { display: flex; align-items: center; gap: 12px; width: 100%; background: linear-gradient(135deg, rgba(34,197,94,0.16), rgba(5,13,20,0.6)); border: 1px solid rgba(34,197,94,0.25); border-radius: 18px; padding: 14px; }
        button.hs-card:active { transform: scale(0.99); }
        .hs-ico { width: 42px; height: 42px; border-radius: 13px; background: rgba(34,197,94,0.18); border: 1px solid rgba(34,197,94,0.3); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .hs-status { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 800; margin-top: 2px; }
        .hs-credited { color: #6ee7b7; }
        .hs-pending { color: #fbbf24; }
        .hs-lost { color: #f87171; }
        .hs-ready { color: #fdba74; }
      `}</style>
    </div>
  );
}

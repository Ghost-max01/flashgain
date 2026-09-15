"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, ClipboardList, Users, Banknote, ShoppingBag, Clock, CheckCircle2,
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
  tab: Exclude<Tab, "all">
  title: string
  sub: string
  amount: number // +credit / -debit
  status: "credited" | "pending" | "ready" | "withdrawn" | "paid"
  date: number
  pendingId?: string // tap-to-resume/complete (pending withdrawals only)
}

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
  const [referralCount, setReferralCount] = useState(0)
  const [approvedCount, setApprovedCount] = useState(0)
  const [refWithdrawn, setRefWithdrawn] = useState<{ id: string; amount: number; date: string }[]>([])
  const [taskRows, setTaskRows] = useState<Row[]>([])
  const [pendings, setPendings] = useState<PendingWithdrawal[]>([])
  const [completedW, setCompletedW] = useState<{ id: string; reference: string; amount: number; date: number; label: string }[]>([])
  const [purchases, setPurchases] = useState<Row[]>([])
  const [selectedDetail, setSelectedDetail] = useState<Row | null>(null)
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
        id: `ledger-${r.id}`, tab: "tasks", title: "Task Reward",
        sub: `${prettyTaskLabel(r.label)} · ${fmtDate(new Date(r.date).getTime())}`,
        amount: r.amount, status: "credited", date: new Date(r.date).getTime() || Date.now(),
      }))
      const legacy: Row[] = legacyIds.map((id) => ({
        id: `legacy-${id}`, tab: "tasks", title: "Task Reward",
        sub: `${prettyTaskLabel(id)} · Completed earlier`,
        amount: 1000, status: "credited", date: 0,
      }))
      const all = [...dated, ...legacy].sort((a, b) => b.date - a.date)
      const total = all.length
      setTaskRows(all.map((r, i) => ({
        ...r,
        sub: `Task #${total - i} · ${r.sub}`,
      })))
    } catch {}

    // ── Referrals ──
    try {
      const rw = safeParse<any[]>(localStorage.getItem("tivexx-referral-withdrawals"), [])
      if (Array.isArray(rw)) {
        setRefWithdrawn(rw.filter((x) => Number(x?.amount) > 0).map((x: any) => ({
          id: String(x.id || `${x.date}-${x.amount}`),
          amount: Number(x.amount),
          date: String(x.date || new Date().toISOString()),
        })))
      }
    } catch {}
    if (uid) {
      fetch(`/api/referral-stats?userId=${encodeURIComponent(uid)}&t=${Date.now()}`)
        .then((r) => r.json()).then((d) => {
          if (d?.success) {
            setReferralCount(Number(d.referral_count || 0))
            setApprovedCount(Number(d.approved_count || 0))
          }
        }).catch(() => {})
    }

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
            setCompletedW([...done, ...extra].sort((a, b) => b.date - a.date))
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
      setPurchases(rows.sort((a, b) => b.date - a.date))
    } catch {}

    return () => { clearInterval(id); clearInterval(id2); }
  }, [router])

  const referralRows: Row[] = useMemo(() => {
    const rows: Row[] = []
    const earned = approvedCount * 500
    if (approvedCount > 0 || referralCount > 0) {
      rows.push({
        id: "ref-earned", tab: "referrals", title: "Referral Earnings",
        sub: `${approvedCount} approved × ₦500${referralCount > approvedCount ? ` · ${referralCount - approvedCount} pending` : ""}`,
        amount: earned, status: "credited", date: Date.now(),
      })
    }
    for (const w of refWithdrawn) {
      rows.push({
        id: `ref-wd-${w.id}`, tab: "referrals", title: "Referral Withdrawn",
        sub: fmtDate(new Date(w.date).getTime()),
        amount: -Math.abs(w.amount), status: "withdrawn", date: new Date(w.date).getTime() || 0,
      })
    }
    return rows
  }, [approvedCount, referralCount, refWithdrawn])

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
    return rows.sort((a, b) => b.date - a.date)
  }, [pendings, completedW])

  const allRows = useMemo(
    () => [...referralRows, ...taskRows, ...withdrawalRows, ...purchases].sort((a, b) => b.date - a.date),
    [referralRows, taskRows, withdrawalRows, purchases],
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
    if (row.status === "ready") return <span className="hs-status hs-ready"><CheckCircle2 className="h-3 w-3" /> Ready — tap to complete</span>
    return <span className="hs-status hs-pending"><Clock className="h-3 w-3" /> Pending</span>
  }

  const RowIcon = ({ row }: { row: Row }) => {
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
                ) : row.tab === "purchases" ? (
                  <button onClick={() => setSelectedDetail(row)} className="hs-card w-full text-left">
                    <span className="hs-ico"><RowIcon row={row} /></span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-black text-white">{row.title}</span>
                      <span className="block text-[11px] text-white/55 mt-0.5">{row.sub}</span>
                    </span>
                    <span className="text-right shrink-0">
                      <span className="block text-sm font-black text-white/85">
                        −₦{Math.abs(row.amount).toLocaleString()}
                      </span>
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
                      <span className={`block text-sm font-black ${row.amount < 0 ? "text-white/85" : "text-emerald-300"}`}>
                        {row.amount < 0 ? `−₦${Math.abs(row.amount).toLocaleString()}` : `+₦${row.amount.toLocaleString()}`}
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

      {selectedDetail && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setSelectedDetail(null)}>
          <div className="max-w-sm w-full rounded-3xl border border-white/10 bg-[#0b1f18] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="text-sm font-black text-white">{selectedDetail.title}</div>
            <div className="text-[11px] text-white/55 mt-1">{selectedDetail.sub}</div>
            <div className="mt-3 text-lg font-black text-white/90">−₦{Math.abs(selectedDetail.amount).toLocaleString()}</div>
            <div className="mt-1"><StatusLine row={selectedDetail} /></div>
            <button onClick={() => setSelectedDetail(null)} className="mt-4 w-full rounded-full bg-emerald-500 py-3 text-sm font-black text-[#052e1b]">Close</button>
          </div>
        </div>
      )}

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
        .hs-ready { color: #fdba74; }
      `}</style>
    </div>
  );
}

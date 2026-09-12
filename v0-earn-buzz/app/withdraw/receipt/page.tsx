"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ServerWithdrawal {
  reference: string
  amount: number
  status: string
  method: string
  created_at?: string | null
}

function ReceiptInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reference = searchParams.get("reference") || searchParams.get("ref") || ""
  const [record, setRecord] = useState<ServerWithdrawal | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showFixPopup, setShowFixPopup] = useState(false)
  const [creatingFee, setCreatingFee] = useState(false)

  useEffect(() => {
    if (!reference) {
      router.push("/withdraw")
      return
    }
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/withdrawals/status?reference=${encodeURIComponent(reference)}`)
        const j = await res.json().catch(() => ({}))
        if (!res.ok || j?.error) throw new Error(j?.error || "Could not load withdrawal")
        const amount = Number(j.amount || 0)
        if (!cancelled) {
          setRecord({
            reference: String(j.reference || reference),
            amount: Number.isFinite(amount) && amount >= 0 ? amount : 0,
            status: String(j.status || "pending"),
            method: String(j.method || ""),
            created_at: j.created_at || null,
          })
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Could not load withdrawal")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [reference, router])

  const handleVerifyNow = () => {
    setShowFixPopup(true)
  }

  // Explicit opt-in: user chooses to pay the ₦5,000 verification fee.
  // Routes to /withdraw/bank-transfer which creates its own server reference — no silent charge.
  const handleUnderstand = async () => {
    setCreatingFee(true)
    try {
      setShowFixPopup(false)
      router.push(`/withdraw/bank-transfer?amount=5000`)
    } finally {
      setCreatingFee(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-center">Loading…</div>
  }

  if (error || !record) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 flex flex-col items-center justify-center p-6">
        <p className="text-sm text-red-600 mb-4">{error || "Withdrawal not found"}</p>
        <Button onClick={() => router.push("/withdraw")}>Back to Withdraw</Button>
      </div>
    )
  }

  const currentDate = record.created_at
    ? new Date(record.created_at).toLocaleString("en-NG", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleString("en-NG", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {showFixPopup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-green-600 to-black rounded-xl p-6 max-w-sm mx-auto relative shadow-2xl border-2 border-green-400">
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-white" />
              </div>

              <h3 className="text-xl font-bold text-white mb-3">Identity Verification Required</h3>

              <p className="text-white/90 mb-4 text-sm leading-relaxed">
                A one-time identity verification fee of <span className="font-bold">₦5,000</span> is required as per
                Central Bank of Nigeria regulations.
              </p>

              <p className="text-white font-semibold mb-2 text-sm bg-white/10 p-3 rounded-lg">
                ✅ Pay once, withdraw FREE forever!
              </p>
              <p className="text-white/70 text-xs mb-6">
                Optional — you choose to continue. No charge is made until you confirm the transfer on the next page (server reference).
              </p>

              <div className="flex gap-2">
                <Button
                  onClick={() => setShowFixPopup(false)}
                  className="flex-1 bg-transparent border border-white/40 hover:bg-white/10 text-white py-3 rounded-lg font-semibold"
                >
                  Not now
                </Button>
                <Button
                  onClick={handleUnderstand}
                  disabled={creatingFee}
                  className="flex-1 bg-white hover:bg-gray-100 text-green-700 py-3 rounded-lg font-semibold"
                >
                  {creatingFee ? "…" : "I Understand — Pay ₦5,000"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center p-4 bg-white border-b">
        <Link href="/withdraw/select-bank">
          <Button variant="ghost" size="icon" className="mr-2">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold text-gray-800">Withdrawal Receipt</h1>
      </div>

      <div className="p-6 max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-dashed border-gray-300">
          <div className="text-center mb-6 pb-4 border-b-2 border-dashed border-gray-200">
            <div className="text-4xl mb-2">🧾</div>
            <h2 className="text-2xl font-bold text-gray-800">Withdrawal Receipt</h2>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600 font-medium">Amount:</span>
              <span className="text-tiv-2 font-bold text-xl">₦{record.amount.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600 font-medium">Method:</span>
              <span className="text-gray-800 font-semibold">{record.method || "—"}</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600 font-medium">Date:</span>
              <span className="text-gray-800 font-semibold text-sm">{currentDate}</span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 font-medium">Status:</span>
              <span className="flex items-center gap-2 text-red-600 font-bold">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                {record.status}
              </span>
            </div>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg mb-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-yellow-800 mb-1">Verification Required</p>
                <p className="text-xs text-yellow-700 leading-relaxed">
                  Withdrawals are manually verified to prevent fraud and ensure referral authenticity.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center pt-4 border-t-2 border-dashed border-gray-200">
            <p className="text-xs text-gray-500">Transaction ID: {record.reference}</p>
          </div>
        </div>

        <Button
          onClick={handleVerifyNow}
          className="w-full mt-6 py-6 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl text-lg font-semibold"
        >
          Verify Now
        </Button>
      </div>
    </div>
  )
}

export default function WithdrawalReceiptPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading…</div>}>
      <ReceiptInner />
    </Suspense>
  )
}

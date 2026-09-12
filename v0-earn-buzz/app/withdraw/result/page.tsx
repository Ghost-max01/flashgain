"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ServerWithdrawal {
  reference: string
  amount: number
  status: string
  method: string
  created_at?: string | null
}

function ResultInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reference = searchParams.get("reference") || searchParams.get("ref") || ""
  const [record, setRecord] = useState<ServerWithdrawal | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    // Play success sound when the page loads
    const audio = new Audio("/sounds/withdrawal-success.wav")
    audio.play().catch((error) => {
      console.error("Error playing audio:", error)
    })
  }, [])

  const handleBackToDash = () => {
    router.push("/dashboard")
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
      .format(amount)
      .replace("NGN", "₦")
  }

  if (loading) {
    return <div className="p-6 text-center">Loading…</div>
  }

  if (error || !record) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6">
        <p className="text-sm text-red-600 mb-4">{error || "Withdrawal not found"}</p>
        <Button onClick={handleBackToDash} className="w-full max-w-md bg-orange-600 hover:bg-orange-700">
          Back to Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6">
      {/* Success Icon */}
      <div className="w-32 h-32 bg-tiv-2 rounded-full flex items-center justify-center mb-6">
        <CheckCircle className="h-16 w-16 text-white" />
      </div>

      {/* Success Message */}
      <h2 className="text-2xl font-bold text-tiv-2 mb-4 text-center">Withdrawal Successful!</h2>

      <p className="text-center mb-8 max-w-md">
        Your withdrawal request has been received with status: <span className="font-bold">{record.status}</span>. The funds will be credited to your account within 24
        hours.
      </p>

      {/* Transaction Details — server only */}
      <div className="w-full max-w-md bg-gray-50 rounded-lg p-4 mb-8">
        <h3 className="font-semibold mb-3">Transaction Details</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Amount:</span>
            <span className="font-medium">{formatCurrency(record.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Method:</span>
            <span className="font-medium">{record.method || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Status:</span>
            <span className="font-medium">{record.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">TxID:</span>
            <span className="font-medium font-mono">{record.reference}</span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <Button onClick={handleBackToDash} className="w-full max-w-md bg-orange-600 hover:bg-orange-700">
        Back to Dashboard
      </Button>
    </div>
  )
}

export default function WithdrawResultPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading…</div>}>
      <ResultInner />
    </Suspense>
  )
}

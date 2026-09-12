"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle2, Clock } from "lucide-react"

function ConfirmationInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reference = searchParams.get("reference") || searchParams.get("ref") || ""

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [record, setRecord] = useState<{ reference: string; amount: number; status: string; method: string } | null>(null)

  const fetchStatus = useCallback(async () => {
    if (!reference) {
      setError("Missing reference")
      setLoading(false)
      return
    }
    try {
      const res = await fetch(`/api/withdrawals/status?reference=${encodeURIComponent(reference)}`)
      const j = await res.json().catch(() => ({}))
      if (!res.ok || j?.error) throw new Error(j?.error || "Could not fetch status")
      const amount = Number(j.amount || 0)
      setRecord({
        reference: String(j.reference || reference),
        amount: Number.isFinite(amount) && amount >= 0 ? amount : 0,
        status: String(j.status || "pending"),
        method: String(j.method || ""),
      })
      setError(null)
    } catch (e: any) {
      setError(e?.message || "Could not fetch status")
    } finally {
      setLoading(false)
    }
  }, [reference])

  useEffect(() => {
    void fetchStatus()
    if (!reference) return
    const t = setInterval(() => { void fetchStatus() }, 8000)
    return () => clearInterval(t)
  }, [fetchStatus, reference])

  const statusText =
    record?.status === "confirmed" || record?.status === "approved" || record?.status === "success"
      ? "Confirmed"
      : record?.status === "awaiting_review" || record?.status === "pending_review"
        ? "Awaiting review"
        : "Pending"

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-sm mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h1 className="text-lg font-semibold text-gray-800">Bank Transfer</h1>
          <button onClick={() => router.push("/dashboard")} className="text-red-600 text-sm font-medium">
            Cancel
          </button>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-center mb-6 mt-8">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <div className="w-16 h-16 bg-blue-300 rounded-full"></div>
            </div>
          </div>

          {loading ? (
            <h2 className="text-2xl font-bold text-center mb-2">Loading…</h2>
          ) : record ? (
            <>
              <h2 className="text-3xl font-bold text-center mb-2">
                NGN {record.amount.toLocaleString("en-NG")}
              </h2>
              <p className="text-center text-gray-600 text-sm mb-1">Ref: <span className="font-mono font-bold">{record.reference}</span></p>
              <p className="text-center text-gray-600 text-sm mb-8">Proceed to your bank app to complete this Transfer</p>
            </>
          ) : (
            <p className="text-center text-gray-600 text-sm mb-8">{error || "No record"}</p>
          )}

          {/* Server status */}
          {record && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-8 flex items-center gap-3">
              {statusText === "Confirmed" ? (
                <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
              ) : statusText === "Awaiting review" ? (
                <Clock className="h-6 w-6 text-amber-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
              )}
              <span className="font-medium text-gray-800">
                {statusText === "Confirmed" ? "Payment confirmed" : statusText === "Awaiting review" ? "Payment awaiting review" : "Payment pending / not confirmed"}
              </span>
            </div>
          )}

          {/* Support Section */}
          <div className="text-center mb-8">
            <p className="text-gray-700 mb-2">Need help? Contact support:</p>
            <a href="mailto:support@earnbuzz.com" className="text-blue-600 font-medium underline">
              here
            </a>
          </div>

          {/* Re-check Button */}
          <Button
            onClick={() => { setLoading(true); void fetchStatus() }}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg font-semibold text-lg"
          >
            Re-check
          </Button>
          {error && <p className="text-sm text-red-600 text-center mt-3">{error}</p>}
        </div>
      </div>
    </div>
  )
}

export default function PaymentConfirmationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-500">Loading…</div>}>
      <ConfirmationInner />
    </Suspense>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Landmark, Hash, User2, Copy, Check, ShieldCheck, Sparkles } from "lucide-react"
import { getPaymentAccountDetails } from "@/lib/payment-account-details"
import { BottomNav } from "@/components/bottom-nav"

const FEE = 5500

export default function VerifyManualPage() {
  const router = useRouter()
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [reported, setReported] = useState(false)

  const account = getPaymentAccountDetails()

  const copyToClipboard = (text: string, field: string) => {
    try { navigator.clipboard.writeText(text) } catch {}
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleReportPaid = () => {
    try {
      localStorage.setItem("pending_verification", JSON.stringify({ fee: FEE, method: "manual", at: Date.now() }))
    } catch {}
    setReported(true)
  }

  return (
    <div className="hh-root min-h-screen pb-28 relative overflow-hidden">
      <div className="hh-bubbles-container" aria-hidden="true">
        {[...Array(6)].map((_, i) => (
          <div key={i} className={`hh-bubble hh-bubble-${i + 1}`}></div>
        ))}
      </div>
      <div className="hh-mesh-overlay" aria-hidden="true"></div>

      {/* Header */}
      <div className="sticky top-0 z-10 hh-header">
        <div className="max-w-md mx-auto px-6 pt-8 pb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="hh-back-btn" aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="hh-title">Manual Payment</h1>
              <p className="hh-subtitle">Pay ₦{FEE.toLocaleString()} via bank transfer</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 space-y-4 pt-2 relative z-10 pb-6">
        {/* Amount */}
        <div className="hh-card hh-entry-1 text-center">
          <div className="text-xs font-bold text-white/50 uppercase tracking-widest">Verification fee</div>
          <div className="text-4xl font-black text-amber-300 mt-1">₦{FEE.toLocaleString()}</div>
          <p className="text-xs text-white/60 mt-2">Transfer exactly this amount to the account below, then tap “I have made this transfer”.</p>
        </div>

        {/* Account details */}
        <div className="hh-card hh-entry-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="hh-icon-ring">
              <Landmark className="h-4 w-4 text-emerald-300" />
            </div>
            <span className="text-sm font-black text-white">Transfer to this account</span>
          </div>
          <div className="space-y-3">
            <div className="hh-detail-item">
              <div className="flex items-center gap-2 mb-1"><Landmark className="h-4 w-4 text-emerald-400" /><div className="hh-detail-label">Bank Name</div></div>
              <span className="hh-detail-value">{account.bankName}</span>
            </div>
            <div className="hh-detail-item">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2"><Hash className="h-4 w-4 text-emerald-400" /><div className="hh-detail-label">Account Number</div></div>
                <button onClick={() => copyToClipboard(account.accountNumber, "account")} className="hh-copy-btn" aria-label="Copy account number">
                  {copiedField === "account" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <span className="hh-detail-value">{account.accountNumber}</span>
            </div>
            <div className="hh-detail-item">
              <div className="flex items-center gap-2 mb-1"><User2 className="h-4 w-4 text-emerald-400" /><div className="hh-detail-label">Account Name</div></div>
              <span className="hh-detail-value">{account.accountName}</span>
            </div>
          </div>

          {!reported ? (
            <button onClick={handleReportPaid} className="hh-proceed-btn hh-proceed-active w-full mt-4">
              I have made this transfer
            </button>
          ) : (
            <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-2">
                <Check className="h-6 w-6 text-emerald-300" />
              </div>
              <div className="font-black text-white">Payment reported ✓</div>
              <p className="text-xs text-white/60 mt-1">Your transfer is being confirmed. Your account will be verified shortly.</p>
              <button onClick={() => router.push("/dashboard")} className="hh-proceed-btn hh-proceed-active w-full mt-4">
                Back to Dashboard
              </button>
            </div>
          )}
        </div>

        {/* Tip */}
        <div className="hh-card hh-tip-card hh-entry-3">
          <div className="flex items-start gap-3">
            <div className="hh-tip-icon"><ShieldCheck className="h-5 w-5 text-emerald-300" /></div>
            <div>
              <h4 className="font-bold text-white mb-1">Use your registered name</h4>
              <p className="text-sm text-emerald-200/80">Transfer from an account bearing your name so the review team can match your payment faster.</p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Link href="/verifyme" className="text-xs text-white/40 underline">Back to verification info</Link>
        </div>
      </div>

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
        @keyframes hh-bubble-rise { 0% { transform: translateY(100vh) scale(0.5); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 0.6; } 100% { transform: translateY(-10vh) scale(1.2); opacity: 0; } }
        .hh-mesh-overlay { position: fixed; inset: 0; background: radial-gradient(ellipse 60% 40% at 20% 80%, rgba(16,185,129,0.07) 0%, transparent 60%), radial-gradient(ellipse 50% 50% at 80% 20%, rgba(59,130,246,0.06) 0%, transparent 60%); pointer-events: none; z-index: 0; }
        .hh-header { background: linear-gradient(180deg, rgba(5,13,20,0.95) 0%, rgba(5,13,20,0.8) 100%); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(16,185,129,0.15); }
        .hh-back-btn { width: 40px; height: 40px; border-radius: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; color: white; cursor: pointer; }
        .hh-title { font-size: 20px; font-weight: 800; color: white; line-height: 1.2; }
        .hh-subtitle { font-size: 12px; color: rgba(16,185,129,0.8); }
        .hh-card { background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 20px; backdrop-filter: blur(12px); position: relative; overflow: hidden; }
        .hh-icon-ring { width: 32px; height: 32px; border-radius: 10px; background: linear-gradient(135deg, rgba(16,185,129,0.2), rgba(245,158,11,0.2)); border: 1px solid rgba(245,158,11,0.3); display: flex; align-items: center; justify-content: center; }
        .hh-detail-item { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 12px 14px; }
        .hh-detail-label { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.06em; }
        .hh-detail-value { font-size: 17px; font-weight: 800; color: white; font-family: 'JetBrains Mono', monospace; }
        .hh-copy-btn { width: 32px; height: 32px; border-radius: 10px; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.25); display: flex; align-items: center; justify-content: center; color: white; cursor: pointer; }
        .hh-proceed-btn { display: block; width: 100%; padding: 16px; border-radius: 16px; font-weight: 800; font-size: 15px; border: none; cursor: pointer; }
        .hh-proceed-active { background: linear-gradient(135deg, #10b981, #059669); color: white; box-shadow: 0 6px 30px rgba(16,185,129,0.4); }
        .hh-proceed-active:active { transform: scale(0.98); }
        .hh-tip-card { background: linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05)); border: 1px solid rgba(16,185,129,0.2); }
        .hh-tip-icon { width: 40px; height: 40px; border-radius: 12px; background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.3); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .hh-entry-1 { animation: hh-entry 0.5s ease-out 0s both; }
        .hh-entry-2 { animation: hh-entry 0.5s ease-out 0.1s both; }
        .hh-entry-3 { animation: hh-entry 0.5s ease-out 0.2s both; }
        @keyframes hh-entry { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) { .hh-bubble, [class*="hh-entry-"] { animation: none !important; } }
      `}</style>
    </div>
  )
}

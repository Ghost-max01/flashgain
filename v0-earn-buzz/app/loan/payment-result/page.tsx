"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { XCircle, RefreshCw, Home, Headphones, ArrowLeft, AlertTriangle, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { BottomNav } from "@/components/bottom-nav";
import { Suspense } from "react"

function LoanPaymentResultContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const amount = searchParams.get("amount") || "N/A"

  const message = "Payment Not Received"
  const icon = <XCircle className="h-20 w-20 text-red-500" />
  const textColor = "text-red-700"

  const formatCurrencyNaira = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(amount)
      .replace("NGN", "₦")
  }

  return (
    <div className="hh-root min-h-screen pb-28 relative overflow-hidden">
      {/* Animated background bubbles */}
      <div className="hh-bubbles-container" aria-hidden="true">
        {[...Array(12)].map((_, i) => (
          <div key={i} className={`hh-bubble hh-bubble-${i + 1}`}></div>
        ))}
      </div>

      {/* Mesh gradient overlay */}
      <div className="hh-mesh-overlay" aria-hidden="true"></div>

      {/* Header */}
      <div className="sticky top-0 z-10 hh-header">
        <div className="max-w-md mx-auto px-6 pt-8 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="hh-back-btn">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="hh-title">Payment Status</h1>
                <p className="hh-subtitle">Transaction verification</p>
              </div>
            </div>
            
            <div className="hh-badge hh-badge-error">
              <AlertTriangle className="h-4 w-4" />
              <span>Failed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 space-y-4 pt-2 relative z-10 pb-6">

        {/* Result Card */}
        <div className="hh-card hh-card-error hh-entry-1 relative overflow-hidden">
          <div className="hh-orb hh-orb-1" aria-hidden="true"></div>
          <div className="hh-orb hh-orb-2" aria-hidden="true"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="hh-icon-ring-error">
                  <XCircle className="h-4 w-4 text-red-400" />
                </div>
                <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Failed</span>
              </div>
              <div className="hh-live-indicator-error">
                <span className="hh-live-dot-error"></span>
                <span className="text-xs">Error</span>
              </div>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="hh-icon-large-error mb-4">
                <XCircle className="h-16 w-16 text-red-400" />
              </div>
              
              <h2 className="hh-error-title">{message}</h2>
              
              <p className="text-center text-white/80 mb-4">
                We could not confirm your payment of <span className="hh-amount-highlight">{formatCurrencyNaira(Number.parseFloat(amount))}</span> for the loan fee.
              </p>
              
              <div className="hh-error-details">
                <p className="text-sm text-red-200/80">
                  Please ensure you transferred the exact amount and included your User ID in the description.
                </p>
                <p className="text-sm text-red-200/80 mt-2">
                  If you believe this is an error, please try again or contact support.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 hh-entry-2">
          <button
            onClick={() => router.back()}
            className="hh-action-btn-error"
          >
            <RefreshCw className="h-5 w-5" />
            Try Again
          </button>
          
          <Link href="/dashboard" className="block">
            <button className="hh-action-btn-secondary w-full">
              <Home className="h-5 w-5" />
              Go to Dashboard
            </button>
          </Link>
          
          <button
            onClick={() => router.push("/support")}
            className="hh-action-btn-support w-full"
          >
            <Headphones className="h-5 w-5" />
            Contact Support
          </button>
        </div>

        {/* Security Note */}
        <div className="hh-card hh-tip-card hh-entry-3">
          <div className="flex items-start gap-3">
            <div className="hh-tip-icon">
              <Shield className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">Need Help?</h4>
              <p className="text-sm text-emerald-200/80">
                Our support team is available 24/7 to assist you with any payment issues.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Navigation (shared 5-button nav) */}
      <BottomNav />

      <style jsx global>{`
        /* ─── IMPORT FONT ─── */
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap');

        /* ─── ROOT & BACKGROUND ─── */
        .hh-root {
          font-family: 'Syne', sans-serif;
          background: #050d14;
          color: white;
          min-height: 100vh;
        }

        /* ─── BUBBLES ─── */
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

        .hh-bubble-1  { width: 8px; height: 8px; left: 10%; background: radial-gradient(circle, rgba(16,185,129,0.6), transparent); animation-duration: 8s; animation-delay: 0s; }
        .hh-bubble-2  { width: 14px; height: 14px; left: 25%; background: radial-gradient(circle, rgba(59,130,246,0.5), transparent); animation-duration: 11s; animation-delay: 1.5s; }
        .hh-bubble-3  { width: 6px; height: 6px; left: 40%; background: radial-gradient(circle, rgba(16,185,129,0.7), transparent); animation-duration: 9s; animation-delay: 3s; }
        .hh-bubble-4  { width: 18px; height: 18px; left: 55%; background: radial-gradient(circle, rgba(139,92,246,0.4), transparent); animation-duration: 13s; animation-delay: 0.5s; }
        .hh-bubble-5  { width: 10px; height: 10px; left: 70%; background: radial-gradient(circle, rgba(16,185,129,0.5), transparent); animation-duration: 10s; animation-delay: 2s; }
        .hh-bubble-6  { width: 5px; height: 5px; left: 82%; background: radial-gradient(circle, rgba(52,211,153,0.8), transparent); animation-duration: 7s; animation-delay: 4s; }
        .hh-bubble-7  { width: 12px; height: 12px; left: 15%; background: radial-gradient(circle, rgba(59,130,246,0.4), transparent); animation-duration: 12s; animation-delay: 5s; }
        .hh-bubble-8  { width: 7px; height: 7px; left: 35%; background: radial-gradient(circle, rgba(16,185,129,0.6), transparent); animation-duration: 9.5s; animation-delay: 2.5s; }
        .hh-bubble-9  { width: 20px; height: 20px; left: 60%; background: radial-gradient(circle, rgba(16,185,129,0.2), transparent); animation-duration: 15s; animation-delay: 1s; }
        .hh-bubble-10 { width: 9px; height: 9px; left: 88%; background: radial-gradient(circle, rgba(139,92,246,0.5), transparent); animation-duration: 10.5s; animation-delay: 6s; }
        .hh-bubble-11 { width: 4px; height: 4px; left: 5%; background: radial-gradient(circle, rgba(52,211,153,0.9), transparent); animation-duration: 6.5s; animation-delay: 3.5s; }
        .hh-bubble-12 { width: 16px; height: 16px; left: 48%; background: radial-gradient(circle, rgba(59,130,246,0.3), transparent); animation-duration: 14s; animation-delay: 7s; }

        @keyframes hh-bubble-rise {
          0%   { transform: translateY(100vh) scale(0.5); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 0.6; }
          100% { transform: translateY(-10vh) scale(1.2); opacity: 0; }
        }

        /* ─── MESH OVERLAY ─── */
        .hh-mesh-overlay {
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse 60% 40% at 20% 80%, rgba(239,68,68,0.07) 0%, transparent 60%),
            radial-gradient(ellipse 50% 50% at 80% 20%, rgba(239,68,68,0.06) 0%, transparent 60%),
            radial-gradient(ellipse 40% 30% at 50% 50%, rgba(239,68,68,0.04) 0%, transparent 60%);
          pointer-events: none;
          z-index: 0;
        }

        /* ─── HEADER ─── */
        .hh-header {
          background: linear-gradient(180deg, rgba(5,13,20,0.95) 0%, rgba(5,13,20,0.8) 100%);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(239,68,68,0.15);
        }

        .hh-back-btn {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .hh-back-btn:hover {
          background: rgba(255,255,255,0.1);
          transform: scale(1.05);
        }

        .hh-back-btn:active {
          transform: scale(0.95);
        }

        .hh-title {
          font-size: 20px;
          font-weight: 800;
          color: white;
          line-height: 1.2;
        }

        .hh-subtitle {
          font-size: 12px;
          color: rgba(239,68,68,0.8);
        }

        .hh-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          border-radius: 30px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .hh-badge-error {
          background: rgba(239,68,68,0.15);
          border: 1px solid rgba(239,68,68,0.3);
          color: #ef4444;
        }

        /* ─── CARDS ─── */
        .hh-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 20px;
          backdrop-filter: blur(12px);
          position: relative;
          overflow: hidden;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .hh-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 30px rgba(239,68,68,0.05);
        }

        .hh-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(239,68,68,0.15), transparent);
        }

        .hh-card-error {
          background: linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(5,13,20,0.9) 50%, rgba(239,68,68,0.1) 100%);
          border-color: rgba(239,68,68,0.2);
        }

        .hh-tip-card {
          background: linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05));
          border: 1px solid rgba(16,185,129,0.2);
        }

        /* ─── ORBS ─── */
        .hh-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(40px);
          pointer-events: none;
        }

        .hh-orb-1 {
          width: 150px; height: 150px;
          background: radial-gradient(circle, rgba(239,68,68,0.2), transparent);
          top: -40px; right: -40px;
          animation: hh-orb-float 6s ease-in-out infinite;
        }

        .hh-orb-2 {
          width: 100px; height: 100px;
          background: radial-gradient(circle, rgba(239,68,68,0.15), transparent);
          bottom: 20px; left: -20px;
          animation: hh-orb-float 8s ease-in-out infinite reverse;
        }

        @keyframes hh-orb-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(8px, -8px) scale(1.05); }
          66%       { transform: translate(-4px, 6px) scale(0.97); }
        }

        /* ─── ICON RING ERROR ─── */
        .hh-icon-ring-error {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.1));
          border: 1px solid rgba(239,68,68,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hh-icon-large-error {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          background: rgba(239,68,68,0.15);
          border: 2px solid rgba(239,68,68,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: hh-icon-pulse-error 2s ease-in-out infinite;
        }

        @keyframes hh-icon-pulse-error {
          0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(239,68,68,0.2); }
          50% { transform: scale(1.05); box-shadow: 0 0 30px rgba(239,68,68,0.4); }
        }

        /* ─── LIVE INDICATOR ERROR ─── */
        .hh-live-indicator-error {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 20px;
          padding: 4px 10px;
        }

        .hh-live-dot-error {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ef4444;
          box-shadow: 0 0 6px #ef4444;
          animation: hh-live-pulse-error 1.5s ease-in-out infinite;
        }

        @keyframes hh-live-pulse-error {
          0%, 100% { box-shadow: 0 0 4px #ef4444; transform: scale(1); }
          50%       { box-shadow: 0 0 10px #ef4444, 0 0 20px rgba(239,68,68,0.4); transform: scale(1.15); }
        }

        /* ─── ERROR TITLE ─── */
        .hh-error-title {
          font-size: 28px;
          font-weight: 800;
          color: #ef4444;
          margin: 8px 0 12px;
          text-align: center;
          animation: hh-error-glow 2s ease-in-out infinite;
        }

        @keyframes hh-error-glow {
          0%, 100% { text-shadow: 0 0 5px rgba(239,68,68,0.3); }
          50% { text-shadow: 0 0 20px rgba(239,68,68,0.5); }
        }

        .hh-amount-highlight {
          font-weight: 700;
          color: #fbbf24;
          font-family: 'JetBrains Mono', monospace;
        }

        .hh-error-details {
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 14px;
          padding: 16px;
          margin-top: 8px;
          width: 100%;
        }

        /* ─── ACTION BUTTONS ─── */
        .hh-action-btn-error {
          width: 100%;
          padding: 16px;
          border-radius: 14px;
          font-weight: 700;
          font-size: 16px;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: linear-gradient(135deg, #ef4444, #dc2626, #b91c1c);
          color: white;
          box-shadow: 0 4px 20px rgba(239,68,68,0.3);
        }

        .hh-action-btn-error:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(239,68,68,0.5);
        }

        .hh-action-btn-error:active {
          transform: scale(0.98);
        }

        .hh-action-btn-secondary {
          padding: 16px;
          border-radius: 14px;
          font-weight: 600;
          font-size: 16px;
          border: 1px solid rgba(255,255,255,0.1);
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: rgba(255,255,255,0.05);
          color: white;
        }

        .hh-action-btn-secondary:hover {
          background: rgba(255,255,255,0.1);
          transform: translateY(-2px);
        }

        .hh-action-btn-secondary:active {
          transform: scale(0.98);
        }

        .hh-action-btn-support {
          padding: 16px;
          border-radius: 14px;
          font-weight: 600;
          font-size: 16px;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: linear-gradient(135deg, #3b82f6, #2563eb, #1d4ed8);
          color: white;
          box-shadow: 0 4px 20px rgba(59,130,246,0.3);
        }

        .hh-action-btn-support:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(59,130,246,0.5);
        }

        .hh-action-btn-support:active {
          transform: scale(0.98);
        }

        /* ─── TIP ICON ─── */
        .hh-tip-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(16,185,129,0.15);
          border: 1px solid rgba(16,185,129,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        /* ─── BOTTOM NAV ─── */
        .hh-bottom-nav {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          max-width: 448px;
          margin: 0 auto;
          background: rgba(5,13,20,0.92);
          backdrop-filter: blur(20px);
          border-top: 1px solid rgba(255,255,255,0.08);
          display: flex;
          justify-content: space-around;
          align-items: center;
          height: 64px;
          z-index: 100;
          box-shadow: 0 -10px 40px rgba(0,0,0,0.5);
        }

        .hh-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          color: #4b5563;
          text-decoration: none;
          font-size: 11px;
          font-weight: 600;
          transition: color 0.2s, transform 0.2s;
          padding: 8px 16px;
          border-radius: 12px;
        }

        .hh-nav-item:hover {
          color: #10b981;
          transform: translateY(-2px);
        }

        .hh-nav-active {
          color: #10b981 !important;
        }

        .hh-nav-active svg {
          filter: drop-shadow(0 0 6px rgba(16,185,129,0.6));
        }

        /* ─── ANIMATIONS ─── */
        .hh-entry-1 { animation: hh-entry 0.5s ease-out 0.0s both; }
        .hh-entry-2 { animation: hh-entry 0.5s ease-out 0.1s both; }
        .hh-entry-3 { animation: hh-entry 0.5s ease-out 0.2s both; }

        @keyframes hh-entry {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* ─── REDUCED MOTION ─── */
        @media (prefers-reduced-motion: reduce) {
          .hh-bubble, .hh-orb-1, .hh-orb-2,
          .hh-live-dot-error, .hh-icon-large-error,
          .hh-error-title, [class*="hh-entry-"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}

export default function LoanPaymentResultPage() {
  return (
    <Suspense fallback={
      <div className="hh-root min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="hh-bubbles-container" aria-hidden="true">
          {[...Array(12)].map((_, i) => (
            <div key={i} className={`hh-bubble hh-bubble-${i + 1}`}></div>
          ))}
        </div>
        <div className="hh-mesh-overlay" aria-hidden="true"></div>
        <div className="hh-loading-container">
          <div className="hh-loading-spinner">
            <div className="hh-spinner-ring"></div>
            <div className="hh-spinner-ring hh-spinner-ring-2"></div>
            <div className="hh-spinner-ring hh-spinner-ring-3"></div>
          </div>
          <p className="hh-loading-text">Loading...</p>
        </div>
      </div>
    }>
      <LoanPaymentResultContent />
    </Suspense>
  )
}
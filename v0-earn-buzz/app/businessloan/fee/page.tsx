"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Home, Gamepad2, User, Shield, Sparkles, Award, Clock } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useMemo, Suspense } from "react"
import Link from "next/link"
import { BottomNav } from "@/components/bottom-nav";

function LoanFeeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const loanAmount = searchParams.get("loanAmount") || "0"
  const accountNumber = searchParams.get("accountNumber") || ""
  const selectedBank = searchParams.get("selectedBank") || ""
  const accountName = searchParams.get("accountName") || ""

  const processingFee = useMemo(() => {
    const amount = Number.parseFloat(loanAmount)
    return Math.round(amount * 0.06) // 6% processing fee
  }, [loanAmount])

  const handlePayProcessingFee = () => {
    const params = new URLSearchParams({
      loanAmount,
      accountNumber,
      selectedBank,
      accountName,
      processingFee: processingFee.toString(),
    })
    router.push(`/loan/payment?${params.toString()}`)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
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
                <h1 className="hh-title">Processing Fee</h1>
                <p className="hh-subtitle">Complete your loan activation</p>
              </div>
            </div>
            
            <div className="hh-badge">
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span>6% Fee</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 space-y-4 pt-2 relative z-10 pb-6">

        {/* Hero Card */}
        <div className="hh-card hh-card-hero hh-entry-1 relative overflow-hidden">
          <div className="hh-orb hh-orb-1" aria-hidden="true"></div>
          <div className="hh-orb hh-orb-2" aria-hidden="true"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="hh-icon-ring">
                  <Award className="h-4 w-4 text-amber-300" />
                </div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Loan Activation</span>
              </div>
              <div className="hh-live-indicator">
                <span className="hh-live-dot"></span>
                <span className="text-xs">Ready</span>
              </div>
            </div>
            
            <p className="text-center text-sm text-white/80">
              To process your loan application, you need to pay a processing fee of 6% of the loan amount.
            </p>
          </div>
        </div>

        {/* Processing Fee Card */}
        <div className="hh-card hh-entry-2">
          <h2 className="hh-section-title mb-4">Processing Fee Required</h2>

          <div className="space-y-4">
            <div className="hh-fee-display">
              <div className="hh-fee-label">Processing Fee (6%)</div>
              <div className="hh-fee-amount">{formatCurrency(processingFee)}</div>
            </div>

            <div className="hh-info-list">
              <div className="hh-info-item">
                <span className="hh-info-bullet"></span>
                <span className="text-sm text-white/80">This fee is required to activate your loan</span>
              </div>
              <div className="hh-info-item">
                <span className="hh-info-bullet"></span>
                <span className="text-sm text-white/80">Your loan will be disbursed immediately after payment</span>
              </div>
              <div className="hh-info-item">
                <span className="hh-info-bullet"></span>
                <span className="text-sm text-white/80">Processing fee is non-refundable</span>
              </div>
            </div>
          </div>
        </div>

        {/* Loan Summary Card */}
        <div className="hh-card hh-entry-3">
          <h3 className="font-bold text-white mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-400" />
            Loan Summary
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Loan Amount:</span>
              <span className="text-white font-semibold">{formatCurrency(Number.parseFloat(loanAmount))}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Processing Fee (6%):</span>
              <span className="text-amber-300 font-bold">{formatCurrency(processingFee)}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-white/10">
              <span className="text-white/60">Total to Pay Now:</span>
              <span className="text-emerald-400 font-bold">{formatCurrency(processingFee)}</span>
            </div>
          </div>
        </div>

        {/* Payment Button */}
        <button
          onClick={handlePayProcessingFee}
          className="hh-proceed-btn hh-proceed-active w-full hh-entry-4"
        >
          Pay Processing Fee - {formatCurrency(processingFee)}
        </button>

        {/* Security Note */}
        <div className="hh-card hh-tip-card hh-entry-5">
          <div className="flex items-start gap-3">
            <div className="hh-tip-icon">
              <Shield className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">Secure Transaction</h4>
              <p className="text-sm text-emerald-200/80">
                Your payment is encrypted and securely processed. Your loan will be disbursed within 24 hours after payment verification.
              </p>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-white/40 text-center leading-relaxed">
          By proceeding, you agree to pay the processing fee. Your loan will be processed and disbursed to your account
          within 24 hours after successful payment verification.
        </p>

      </div>

      {/* Bottom Navigation */}
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
            radial-gradient(ellipse 60% 40% at 20% 80%, rgba(16,185,129,0.07) 0%, transparent 60%),
            radial-gradient(ellipse 50% 50% at 80% 20%, rgba(59,130,246,0.06) 0%, transparent 60%),
            radial-gradient(ellipse 40% 30% at 50% 50%, rgba(139,92,246,0.04) 0%, transparent 60%);
          pointer-events: none;
          z-index: 0;
        }

        /* ─── HEADER ─── */
        .hh-header {
          background: linear-gradient(180deg, rgba(5,13,20,0.95) 0%, rgba(5,13,20,0.8) 100%);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(16,185,129,0.15);
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
          color: rgba(16,185,129,0.8);
        }

        .hh-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, rgba(16,185,129,0.2), rgba(245,158,11,0.2));
          border: 1px solid rgba(245,158,11,0.3);
          border-radius: 30px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 600;
          color: #fbbf24;
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
          box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 30px rgba(16,185,129,0.05);
        }

        .hh-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
        }

        .hh-card-hero {
          background: linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,13,20,0.9) 50%, rgba(245,158,11,0.1) 100%);
          border-color: rgba(16,185,129,0.2);
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
          background: radial-gradient(circle, rgba(16,185,129,0.2), transparent);
          top: -40px; right: -40px;
          animation: hh-orb-float 6s ease-in-out infinite;
        }

        .hh-orb-2 {
          width: 100px; height: 100px;
          background: radial-gradient(circle, rgba(245,158,11,0.15), transparent);
          bottom: 20px; left: -20px;
          animation: hh-orb-float 8s ease-in-out infinite reverse;
        }

        @keyframes hh-orb-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(8px, -8px) scale(1.05); }
          66%       { transform: translate(-4px, 6px) scale(0.97); }
        }

        /* ─── ICON RING ─── */
        .hh-icon-ring {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: linear-gradient(135deg, rgba(16,185,129,0.2), rgba(245,158,11,0.2));
          border: 1px solid rgba(245,158,11,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* ─── LIVE INDICATOR ─── */
        .hh-live-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(16,185,129,0.1);
          border: 1px solid rgba(16,185,129,0.2);
          border-radius: 20px;
          padding: 4px 10px;
        }

        .hh-live-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 6px #10b981;
          animation: hh-live-pulse 1.5s ease-in-out infinite;
        }

        @keyframes hh-live-pulse {
          0%, 100% { box-shadow: 0 0 4px #10b981; transform: scale(1); }
          50%       { box-shadow: 0 0 10px #10b981, 0 0 20px rgba(16,185,129,0.4); transform: scale(1.15); }
        }

        /* ─── SECTION TITLE ─── */
        .hh-section-title {
          font-size: 18px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.01em;
        }

        /* ─── FEE DISPLAY ─── */
        .hh-fee-display {
          background: rgba(245,158,11,0.1);
          border: 1px solid rgba(245,158,11,0.3);
          border-radius: 16px;
          padding: 20px;
          text-align: center;
          margin-bottom: 16px;
        }

        .hh-fee-label {
          font-size: 14px;
          color: rgba(255,255,255,0.7);
          margin-bottom: 8px;
        }

        .hh-fee-amount {
          font-size: 36px;
          font-weight: 800;
          color: #fbbf24;
          font-family: 'JetBrains Mono', monospace;
          line-height: 1.2;
        }

        /* ─── INFO LIST ─── */
        .hh-info-list {
          space-y: 2;
        }

        .hh-info-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 8px 0;
        }

        .hh-info-bullet {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
          margin-top: 8px;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }

        .hh-info-item:hover .hh-info-bullet {
          background: #fbbf24;
          transform: scale(1.2);
        }

        /* ─── PROCEED BUTTON ─── */
        .hh-proceed-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 18px;
          border-radius: 16px;
          font-weight: 800;
          font-size: 16px;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .hh-proceed-active {
          background: linear-gradient(135deg, #10b981, #059669, #047857);
          color: white;
          box-shadow: 0 6px 30px rgba(16,185,129,0.4);
          animation: hh-btn-glow 2s ease-in-out infinite;
        }

        .hh-proceed-active:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 40px rgba(16,185,129,0.6);
        }

        .hh-proceed-active:active {
          transform: scale(0.98);
        }

        @keyframes hh-btn-glow {
          0%, 100% { box-shadow: 0 6px 30px rgba(16,185,129,0.4); }
          50% { box-shadow: 0 6px 40px rgba(16,185,129,0.6), 0 0 30px rgba(16,185,129,0.3); }
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
        .hh-entry-4 { animation: hh-entry 0.5s ease-out 0.3s both; }
        .hh-entry-5 { animation: hh-entry 0.5s ease-out 0.4s both; }

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
          .hh-live-dot, .hh-proceed-active,
          [class*="hh-entry-"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}

export default function LoanFeePage() {
  return (
    <Suspense
      fallback={
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
      }
    >
      <LoanFeeContent />
    </Suspense>
  )
}
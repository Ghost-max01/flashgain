"use client"

import { ShieldCheck, ArrowRight, UserCheck, CreditCard, CheckCircle, ArrowLeft, Home, Gamepad2, User, Sparkles, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { OpayWarningPopup } from "@/components/opay-warning-popup"
import { useRef } from "react"
import Link from "next/link"

export default function VerifyMePage() {
  const router = useRouter()
  const [tickVisible, setTickVisible] = useState(false)
  const [showNoReferralDialog, setShowNoReferralDialog] = useState(false)
  const [referralCount, setReferralCount] = useState<number | null>(null)

  useEffect(() => {
    // Show tick after 1 second
    const timer = setTimeout(() => {
      setTickVisible(true)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  const handleProceed = () => {
    // Modified: Show Opay warning, then navigate after 4 seconds with 10s interval enforcement
    setShowOpayWarning(true)
    const t = window.setTimeout(() => {
      setShowOpayWarning(false)
      if (typeof window !== "undefined") {
        window.location.href = "/withdraw/bank-transfer"
      } else {
        router.push("/withdraw/bank-transfer")
      }
    }, 6000) // Show popup for 4 seconds before navigation
    // ensure timer is cleared if component unmounts
    timersRef.current.push(t)
  }

  // Load referral count from localStorage or API when component mounts
  useEffect(() => {
    const loadReferral = async () => {
      try {
        const raw = typeof window !== "undefined" ? localStorage.getItem("tivexx-user") : null
        if (raw) {
          const u = JSON.parse(raw)
          if (typeof u.referral_count === "number") {
            setReferralCount(u.referral_count)
            return
          }
        }

        // If not in localStorage, try API
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem("tivexx-user")
          const user = stored ? JSON.parse(stored) : null
          if (user && (user.id || user.userId)) {
            const uid = user.id || user.userId
            const res = await fetch(`/api/referral-stats?userId=${uid}&t=${Date.now()}`)
            if (res.ok) {
              const data = await res.json()
              setReferralCount(data.referral_count || 0)
              return
            }
          }
        }

        setReferralCount(0)
      } catch (err) {
        setReferralCount(0)
      }
    }

    loadReferral()
  }, [])

  // Auto close dialog after 7 seconds when opened
  useEffect(() => {
    if (!showNoReferralDialog) return
    const t = setTimeout(() => setShowNoReferralDialog(false), 7000)
    return () => clearTimeout(t)
  }, [showNoReferralDialog])

  const timersRef = useRef<number[]>([])
  useEffect(() => {
    return () => {
      // cleanup any pending timeouts
      timersRef.current.forEach((id) => clearTimeout(id))
    }
  }, [])

  const [showOpayWarning, setShowOpayWarning] = useState(false)

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
                <h1 className="hh-title">Verification</h1>
                <p className="hh-subtitle">Secure your account</p>
              </div>
            </div>
            
            {/* Withdraw without paying toggle in header */}
            <div className="hh-toggle-container">
              <span className="hh-toggle-label">Withdraw Without Paying</span>
              <button
                onClick={() => setShowNoReferralDialog(true)}
                className={`hh-toggle ${showNoReferralDialog ? 'hh-toggle-active' : ''}`}
              >
                <span className={`hh-toggle-dot ${showNoReferralDialog ? 'hh-toggle-dot-active' : ''}`} />
              </button>
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
                  <Sparkles className="h-4 w-4 text-amber-300" />
                </div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">CBN Compliant</span>
              </div>
              <div className="hh-live-indicator">
                <span className="hh-live-dot"></span>
                <span className="text-xs">Secure</span>
              </div>
            </div>
            
            <h1 className="hh-glow-title">FlashGain 9ja</h1>
            
            <div className="flex items-center justify-center mt-2">
              <div className="hh-icon-large">
                <ShieldCheck className="h-12 w-12 text-emerald-300" />
              </div>
              {tickVisible && (
                <CheckCircle className="h-8 w-8 text-emerald-400 ml-2 animate-slide-in-left" />
              )}
            </div>
          </div>
        </div>

        {/* Verification Card */}
        <div className="hh-card hh-entry-2">
          <div className="space-y-6">
            <p className="text-center text-sm text-white/80 leading-relaxed">
              To comply with <strong className="text-emerald-400">CBN regulations</strong> and prevent fraudulent activity and bots,
              a <strong className="text-amber-400">mandatory verification</strong> is required. Completing verification ensures your
              withdrawals are fully protected.
            </p>

            {/* Fee Card */}
            <div className="hh-fee-card">
              <div className="hh-coin-container">
                <CreditCard className="hh-coin-icon" />
              </div>
              <div className="flex-1">
                <p className="hh-fee-amount">₦5,500</p>
                <p className="hh-fee-desc">
                  One-time verification fee, <strong>automatically refunded</strong> to your dashboard balance after successful verification.
                </p>
              </div>
            </div>

            {/* Features List */}
            <div className="space-y-3">
              <div className="hh-feature-item">
                <UserCheck className="hh-feature-icon" />
                <span className="text-sm text-white/80">Identity protection</span>
              </div>
              <div className="hh-feature-item">
                <UserCheck className="hh-feature-icon" />
                <span className="text-sm text-white/80">Prevents fraud & bots</span>
              </div>
              <div className="hh-feature-item">
                <UserCheck className="hh-feature-icon" />
                <span className="text-sm text-white/80">Unlocks withdrawals & premium features</span>
              </div>
            </div>

            {/* Proceed Button */}
            <button
              onClick={handleProceed}
              className="hh-proceed-btn hh-proceed-active w-full"
            >
              <span>Proceed to Verification</span>
              <ArrowRight className="h-5 w-5" />
            </button>

            <p className="text-xs text-emerald-300 text-center">
              The ₦5,500 verification payment will be added back to your dashboard balance after verification.
            </p>
          </div>
        </div>

        {/* Security Note */}
        <div className="hh-card hh-tip-card hh-entry-3">
          <div className="flex items-start gap-3">
            <div className="hh-tip-icon">
              <ShieldCheck className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">Secure Verification</h4>
              <p className="text-sm text-emerald-200/80">
                Your information is encrypted and protected. The verification fee is fully refundable.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Navigation */}
      <div className="hh-bottom-nav">
        <Link href="/dashboard" className="hh-nav-item">
          <Home className="h-5 w-5" />
          <span>Home</span>
        </Link>
        <Link href="/abouttivexx" className="hh-nav-item">
          <Gamepad2 className="h-5 w-5" />
          <span>About</span>
        </Link>
        <Link href="/refer" className="hh-nav-item">
          <User className="h-5 w-5" />
          <span>Refer</span>
        </Link>
      </div>

      {/* Dialog for Withdraw without referral */}
      <Dialog open={showNoReferralDialog} onOpenChange={setShowNoReferralDialog}>
        <DialogContent className="hh-dialog max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-lg text-emerald-200">Withdraw Without Paying</DialogTitle>
            <DialogDescription className="text-center text-sm text-white/80">
              You don't have 50 referrals yet {referralCount !== null ? `(you have ${referralCount}/50)` : "(loading...)"}, so you're not eligible to withdraw without paying. Refer more users to become eligible.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-3 mt-4">
            <Button
              onClick={() => {
                setShowNoReferralDialog(false)
                router.push("/refer")
              }}
              className="flex-1 hh-dialog-btn hh-dialog-btn-primary"
            >
              Refer Now
            </Button>
            <Button 
              onClick={() => setShowNoReferralDialog(false)} 
              className="flex-1 hh-dialog-btn hh-dialog-btn-secondary"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Opay Warning Popup */}
      {showOpayWarning && <OpayWarningPopup onClose={() => setShowOpayWarning(false)} />}

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

        /* ─── TOGGLE CONTAINER ─── */
        .hh-toggle-container {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 30px;
          padding: 4px 8px 4px 12px;
        }

        .hh-toggle-label {
          font-size: 11px;
          font-weight: 600;
          color: #10b981;
          white-space: nowrap;
        }

        .hh-toggle {
          position: relative;
          width: 44px;
          height: 24px;
          border-radius: 30px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.1);
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .hh-toggle-active {
          background: linear-gradient(135deg, #10b981, #059669);
          border-color: rgba(16,185,129,0.3);
        }

        .hh-toggle-dot {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          transition: transform 0.3s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .hh-toggle-dot-active {
          transform: translateX(20px);
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

        /* ─── GLOW TITLE ─── */
        .hh-glow-title {
          font-size: 32px;
          font-weight: 800;
          text-align: center;
          background: linear-gradient(135deg, #10b981, #fbbf24);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 8px 0;
          animation: hh-title-glow 2.5s infinite alternate;
        }

        @keyframes hh-title-glow {
          0% { text-shadow: 0 0 5px rgba(16,185,129,0.3); }
          100% { text-shadow: 0 0 20px rgba(16,185,129,0.6), 0 0 30px rgba(251,191,36,0.3); }
        }

        /* ─── ICON LARGE ─── */
        .hh-icon-large {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: rgba(16,185,129,0.15);
          border: 2px solid rgba(16,185,129,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: hh-icon-pulse 2s ease-in-out infinite;
        }

        @keyframes hh-icon-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(16,185,129,0.2); }
          50% { transform: scale(1.05); box-shadow: 0 0 30px rgba(16,185,129,0.4); }
        }

        /* ─── FEE CARD ─── */
        .hh-fee-card {
          background: rgba(245,158,11,0.1);
          border: 1px solid rgba(245,158,11,0.3);
          border-radius: 16px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .hh-coin-container {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #fbbf24, #d97706);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: hh-coin-spin 3s linear infinite;
          box-shadow: 0 0 20px rgba(251,191,36,0.5);
        }

        @keyframes hh-coin-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .hh-coin-icon {
          width: 30px;
          height: 30px;
          color: white;
        }

        .hh-fee-amount {
          font-size: 32px;
          font-weight: 800;
          color: #fbbf24;
          line-height: 1.2;
        }

        .hh-fee-desc {
          font-size: 12px;
          color: rgba(255,255,255,0.7);
        }

        /* ─── FEATURE ITEMS ─── */
        .hh-feature-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 12px;
          transition: all 0.2s ease;
        }

        .hh-feature-item:hover {
          background: rgba(255,255,255,0.05);
          transform: translateX(4px);
        }

        .hh-feature-icon {
          width: 20px;
          height: 20px;
          color: #10b981;
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

        /* ─── TIP CARD ─── */
        .hh-tip-card {
          background: linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05));
          border: 1px solid rgba(16,185,129,0.2);
        }

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

        /* ─── DIALOG ─── */
        .hh-dialog {
          background: linear-gradient(135deg, #0d1f2d, #0a1628) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 20px !important;
          color: white !important;
        }

        .hh-dialog-btn {
          padding: 12px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 14px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .hh-dialog-btn-primary {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
        }

        .hh-dialog-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(16,185,129,0.3);
        }

        .hh-dialog-btn-secondary {
          background: rgba(255,255,255,0.1);
          color: white;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .hh-dialog-btn-secondary:hover {
          background: rgba(255,255,255,0.15);
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

        @keyframes slide-in-left {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-slide-in-left {
          animation: slide-in-left 0.5s ease-out forwards;
        }

        /* ─── REDUCED MOTION ─── */
        @media (prefers-reduced-motion: reduce) {
          .hh-bubble, .hh-orb-1, .hh-orb-2,
          .hh-live-dot, .hh-proceed-active,
          .hh-coin-container, .hh-icon-large,
          [class*="hh-entry-"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}
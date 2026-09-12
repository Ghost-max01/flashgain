"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Home, Gamepad2, User, Sparkles, Shield, Award, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function LoanPage() {
  const router = useRouter()
  const [userData, setUserData] = useState<any>(null)
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [showApproval, setShowApproval] = useState(false)
  const [loanAmount, setLoanAmount] = useState(0)
  const [showBusinessLoanPopup, setShowBusinessLoanPopup] = useState(false)
  const [showRestrictionPopup, setShowRestrictionPopup] = useState(false)
  const [mounted, setMounted] = useState(false)

  const [kycData, setKycData] = useState({
    fullName: "",
    dob: "",
    address: "",
    maritalStatus: "Single",
  })

  const [incomeRange, setIncomeRange] = useState("")

  useEffect(() => {
    setMounted(true)
    const storedUser = localStorage.getItem("tivexx-user")

    if (!storedUser) {
      router.push("/login")
      return
    }

    const user = JSON.parse(storedUser)
    setUserData(user)

    // 7-day limit is enforced server-side (POST /api/loans/request); check server for restriction.
    ;(async () => {
      try {
        const uid = user?.id || user?.userId || user?.user_id || ""
        if (!uid) return
        const res = await fetch(`/api/loans/request?userId=${encodeURIComponent(uid)}`)
        const data = await res.json().catch(() => ({}))
        if (data?.restricted) setShowRestrictionPopup(true)
      } catch {}
    })()
  }, [router])

  if (!mounted || !userData) {
    return (
      <div className="hh-root min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Animated background bubbles */}
        <div className="hh-bubbles-container" aria-hidden="true">
          {[...Array(12)].map((_, i) => (
            <div key={i} className={`hh-bubble hh-bubble-${i + 1}`}></div>
          ))}
        </div>

        {/* Mesh gradient overlay */}
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
    )
  }

  const handleKycSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setStep(2)
  }

  const handleIncomeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!incomeRange) return

    setIsLoading(true)

    // Server loan-request flow: POST /api/loans/request (stores pending, does NOT credit).
    ;(async () => {
      try {
        const uid = userData?.id || userData?.userId || userData?.user_id || ""
        // Amount is indicative; server stores pending without crediting.
        const res = await fetch("/api/loans/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: uid, amount: 25000 }),
        })
        const data = await res.json().catch(() => ({}))
        setIsLoading(false)
        if (data?.restricted) {
          setShowRestrictionPopup(true)
          return
        }
        // UI shows "Under review" — no local balance credit, no fake Approved transaction.
        setLoanAmount(0)
        setShowApproval(true)
      } catch {
        setIsLoading(false)
        setShowApproval(true)
        setLoanAmount(0)
      }
    })()
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

      {/* Restriction Popup */}
      {showRestrictionPopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="hh-popup">
            <div className="hh-popup-header">
              <Clock className="h-10 w-10 text-amber-400" />
              <h2 className="text-xl font-bold text-white">Loan Restriction</h2>
            </div>
            
            <p className="text-gray-300 text-center mb-6">You can apply for a loan again in 7 days.</p>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.push("/businessloan")}
                className="hh-popup-btn-primary"
              >
                Apply for Business Loan
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="hh-popup-btn-secondary"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Loan Approved Popup (shows first) */}
      {showApproval && !showBusinessLoanPopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="hh-popup hh-popup-success">
            <div className="hh-popup-icon-container">
              <div className="hh-success-animation">
                <CheckCircle2 className="h-16 w-16 text-emerald-400" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">Under review</h2>
            <p className="text-gray-300 mb-2">Your loan request is pending review. No funds have been credited.</p>
            <p className="hh-amount-display mb-6">Awaiting decision</p>
            
            <button
              onClick={() => {
                setShowApproval(false)
                setShowBusinessLoanPopup(true)
              }}
              className="hh-popup-btn-primary w-full"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ✅ Second Popup - Business Loan */}
      {showBusinessLoanPopup && !showApproval && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="hh-popup">
            <div className="hh-popup-header">
              <Award className="h-10 w-10 text-amber-400" />
              <h2 className="text-xl font-bold text-white">Want a Higher Loan?</h2>
            </div>
            
            <p className="text-gray-300 text-center mb-6">Apply for a Business Loan and get up to ₦500,000!</p>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.push("/businessloan")}
                className="hh-popup-btn-primary"
              >
                Apply for Business Loan
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="hh-popup-btn-secondary"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="hh-popup hh-popup-loading">
            <div className="hh-loading-spinner-large">
              <div className="hh-spinner-ring-large"></div>
              <div className="hh-spinner-ring-large hh-spinner-ring-large-2"></div>
              <div className="hh-spinner-ring-large hh-spinner-ring-large-3"></div>
            </div>
            <p className="text-white font-semibold mt-4">Processing your loan application...</p>
            <p className="text-gray-400 text-sm mt-2">Please wait</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 hh-header">
        <div className="max-w-md mx-auto px-6 pt-8 pb-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <button className="hh-back-btn">
                <ArrowLeft className="h-5 w-5" />
              </button>
            </Link>
            <div>
              <h1 className="hh-title">Quick Loan</h1>
              <p className="hh-subtitle">Apply in minutes</p>
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
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Quick Loan</span>
              </div>
              <div className="hh-live-indicator">
                <span className="hh-live-dot"></span>
                <span className="text-xs">Step {step}/2</span>
              </div>
            </div>
            
            <p className="text-center text-sm text-white/80">
              Get instant access to funds with our quick loan service
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="hh-card hh-entry-2">
          {step === 1 && (
            <form onSubmit={handleKycSubmit} className="space-y-6">
              <h2 className="hh-section-title mb-6">Step 1: KYC Information</h2>

              <div className="space-y-4">
                <div className="hh-form-group">
                  <label className="hh-label">Full Name</label>
                  <Input
                    type="text"
                    value={kycData.fullName}
                    onChange={(e) => setKycData({ ...kycData, fullName: e.target.value })}
                    required
                    className="hh-input"
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="hh-form-group">
                  <label className="hh-label">Date of Birth</label>
                  <Input
                    type="date"
                    value={kycData.dob}
                    onChange={(e) => setKycData({ ...kycData, dob: e.target.value })}
                    required
                    className="hh-input"
                  />
                </div>

                <div className="hh-form-group">
                  <label className="hh-label">Address</label>
                  <Input
                    type="text"
                    value={kycData.address}
                    onChange={(e) => setKycData({ ...kycData, address: e.target.value })}
                    required
                    className="hh-input"
                    placeholder="Enter your address"
                  />
                </div>

                <div className="hh-form-group">
                  <label className="hh-label">Marital Status</label>
                  <select
                    value={kycData.maritalStatus}
                    onChange={(e) => setKycData({ ...kycData, maritalStatus: e.target.value })}
                    className="hh-select"
                  >
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="hh-submit-btn">
                Continue to Step 2
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleIncomeSubmit} className="space-y-6">
              <h2 className="hh-section-title mb-6">Step 2: Annual Income</h2>

              <div className="space-y-3">
                {[
                  { label: "₦100k - ₦500k", value: "100k-500k" },
                  { label: "₦500k - ₦1M", value: "500k-1M" },
                  { label: "₦1M - ₦5M", value: "1M-5M" },
                  { label: "₦5M - ₦10M", value: "5M-10M" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setIncomeRange(option.value)}
                    className={`hh-income-option ${incomeRange === option.value ? 'hh-income-option-selected' : ''}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={!incomeRange}
                className={`hh-submit-btn ${!incomeRange ? 'hh-submit-disabled' : ''}`}
              >
                Submit Application
              </button>
            </form>
          )}
        </div>

        {/* Security Note */}
        <div className="hh-card hh-tip-card hh-entry-3">
          <div className="flex items-start gap-3">
            <div className="hh-tip-icon">
              <Shield className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">Secure Application</h4>
              <p className="text-sm text-emerald-200/80">
                Your information is encrypted and securely processed. We never share your data.
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

        /* ─── LOADING ─── */
        .hh-loading-container {
          position: relative;
          z-index: 10;
          text-align: center;
          animation: hh-entry 0.5s ease-out;
        }

        .hh-loading-spinner {
          position: relative;
          width: 60px;
          height: 60px;
          margin: 0 auto 16px;
        }

        .hh-spinner-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 3px solid transparent;
          border-top-color: #10b981;
          animation: hh-spin 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
        }

        .hh-spinner-ring-2 {
          width: 70%;
          height: 70%;
          top: 15%;
          left: 15%;
          border-top-color: #fbbf24;
          animation-duration: 2s;
          animation-direction: reverse;
        }

        .hh-spinner-ring-3 {
          width: 40%;
          height: 40%;
          top: 30%;
          left: 30%;
          border-top-color: #3b82f6;
          animation-duration: 1.2s;
        }

        .hh-loading-spinner-large {
          position: relative;
          width: 80px;
          height: 80px;
          margin: 0 auto;
        }

        .hh-spinner-ring-large {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 4px solid transparent;
          border-top-color: #10b981;
          animation: hh-spin 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
        }

        .hh-spinner-ring-large-2 {
          width: 70%;
          height: 70%;
          top: 15%;
          left: 15%;
          border-top-color: #fbbf24;
          animation-duration: 2s;
          animation-direction: reverse;
        }

        .hh-spinner-ring-large-3 {
          width: 40%;
          height: 40%;
          top: 30%;
          left: 30%;
          border-top-color: #3b82f6;
          animation-duration: 1.2s;
        }

        @keyframes hh-spin {
          to { transform: rotate(360deg); }
        }

        .hh-loading-text {
          color: rgba(255,255,255,0.7);
          font-size: 14px;
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

        /* ─── POPUP ─── */
        .hh-popup {
          background: linear-gradient(135deg, #0d1f2d, #0a1628);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px;
          padding: 24px;
          max-width: 380px;
          width: 100%;
          box-shadow: 0 30px 60px rgba(0,0,0,0.5);
          animation: hh-popup-appear 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .hh-popup-success {
          text-align: center;
        }

        .hh-popup-loading {
          text-align: center;
        }

        @keyframes hh-popup-appear {
          from {
            opacity: 0;
            transform: scale(0.8) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .hh-popup-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .hh-popup-icon-container {
          margin-bottom: 16px;
        }

        .hh-success-animation {
          animation: hh-success-bounce 0.5s ease-out;
        }

        @keyframes hh-success-bounce {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }

        .hh-amount-display {
          font-size: 32px;
          font-weight: 800;
          color: #fbbf24;
          font-family: 'JetBrains Mono', monospace;
        }

        .hh-popup-btn-primary {
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .hh-popup-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(16,185,129,0.3);
        }

        .hh-popup-btn-secondary {
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          background: rgba(255,255,255,0.1);
          color: white;
          font-weight: 600;
          border: 1px solid rgba(255,255,255,0.1);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .hh-popup-btn-secondary:hover {
          background: rgba(255,255,255,0.15);
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
          background: linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,13,20,0.9) 50%, rgba(59,130,246,0.1) 100%);
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
          background: radial-gradient(circle, rgba(59,130,246,0.15), transparent);
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
          background: linear-gradient(135deg, rgba(16,185,129,0.2), rgba(59,130,246,0.2));
          border: 1px solid rgba(59,130,246,0.3);
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

        /* ─── FORM ELEMENTS ─── */
        .hh-form-group {
          margin-bottom: 16px;
        }

        .hh-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #10b981;
          margin-bottom: 8px;
          letter-spacing: 0.02em;
        }

        .hh-input {
          width: 100%;
          padding: 14px 16px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          color: white;
          font-size: 15px;
          transition: all 0.2s ease;
        }

        .hh-input:focus {
          outline: none;
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16,185,129,0.1);
        }

        .hh-input::placeholder {
          color: rgba(255,255,255,0.3);
        }

        .hh-select {
          width: 100%;
          padding: 14px 16px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          color: white;
          font-size: 15px;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .hh-select option {
          background: #0d1f2d;
          color: white;
        }

        .hh-select:focus {
          outline: none;
          border-color: #10b981;
        }

        .hh-submit-btn {
          width: 100%;
          padding: 18px;
          border-radius: 16px;
          font-weight: 800;
          font-size: 16px;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          background: linear-gradient(135deg, #10b981, #059669, #047857);
          color: white;
          box-shadow: 0 6px 30px rgba(16,185,129,0.4);
          animation: hh-btn-glow 2s ease-in-out infinite;
        }

        .hh-submit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 40px rgba(16,185,129,0.6);
        }

        .hh-submit-btn:active {
          transform: scale(0.98);
        }

        .hh-submit-disabled {
          opacity: 0.5;
          cursor: not-allowed;
          animation: none;
        }

        .hh-submit-disabled:hover {
          transform: none;
          box-shadow: 0 6px 30px rgba(16,185,129,0.4);
        }

        @keyframes hh-btn-glow {
          0%, 100% { box-shadow: 0 6px 30px rgba(16,185,129,0.4); }
          50% { box-shadow: 0 6px 40px rgba(16,185,129,0.6), 0 0 30px rgba(16,185,129,0.3); }
        }

        /* ─── INCOME OPTIONS ─── */
        .hh-income-option {
          width: 100%;
          padding: 16px;
          border-radius: 14px;
          font-weight: 600;
          font-size: 15px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: white;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }

        .hh-income-option:hover {
          background: rgba(255,255,255,0.1);
          transform: translateX(4px);
        }

        .hh-income-option-selected {
          background: linear-gradient(135deg, #10b981, #059669);
          border-color: rgba(16,185,129,0.3);
          box-shadow: 0 4px 15px rgba(16,185,129,0.3);
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
          .hh-live-dot, .hh-submit-btn,
          .hh-success-animation, [class*="hh-entry-"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}
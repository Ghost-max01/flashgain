"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle, Search, Sparkles, Home, Gamepad2, User, Shield, Award, Landmark, Hash, User2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from "next/link"

export default function BusinessLoanPage() {
  const router = useRouter()
  const [loanAmount, setLoanAmount] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [selectedBank, setSelectedBank] = useState("")
  const [accountName, setAccountName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [banksList, setBanksList] = useState<Array<{ name: string; code: string }>>([])
  const [bankSearchInput, setBankSearchInput] = useState("")
  const searchInputRef = useRef<HTMLInputElement>(null)

  const filteredBanks = (() => {
    const q = bankSearchInput.trim().toLowerCase()
    if (!q) return banksList
    const filtered = banksList.filter((bank) => bank.name.toLowerCase().includes(q))
    return filtered.sort((a, b) => {
      const an = a.name.toLowerCase(), bn = b.name.toLowerCase()
      const score = (n: string) => n === q ? 0 : n.startsWith(q) ? 1 : n.includes(` ${q}`) ? 2 : 3
      return score(an) - score(bn)
    })
  })()

  const MIN_LOAN = 500000
  const MAX_LOAN = 5000000
  const PROCESSING_RATE = 0.03

  // Fetch banks from server on mount (same as withdrawal page)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch(`/api/banks`)
        if (!res.ok) return
        const data = await res.json()
        if (mounted && data && data.banks) {
          const filteredList = data.banks.filter((bank: any) => {
            const n = bank.name.toLowerCase()
            return (
              !n.includes("goodnews microfinance") &&
              !n.includes("kolomoni") &&
              !n.includes("bankit") &&
              !n.includes("u and c") &&
              !n.includes("u&c") &&
              !n.includes("stella")
            )
          })
          setBanksList(filteredList)
        }
      } catch (err) {
        // ignore
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (searchInputRef.current) {
      // Small delay to ensure dropdown is fully open
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }
  }, [selectedBank]) // This triggers when dropdown state changes

  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  const numericValue = (val: string) => {
    const n = Number(val.toString().replace(/[^0-9.]/g, ""))
    return isNaN(n) ? 0 : n
  }

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 })
      .format(n)
      .replace("NGN", "₦")

  const handleContinue = () => {
    setError(null)
    const loanAmountNum = Math.floor(numericValue(loanAmount))

    if (!loanAmount || !accountNumber || !selectedBank || !accountName) {
      setError("Please fill in all required fields.")
      return
    }

    if (accountNumber.replace(/\D/g, "").length !== 10) {
      setError("Please enter a valid 10-digit account number.")
      return
    }

    if (loanAmountNum < MIN_LOAN || loanAmountNum > MAX_LOAN) {
      setError(`Loan amount must be between ${formatCurrency(MIN_LOAN)} and ${formatCurrency(MAX_LOAN)}.`)
      return
    }

    const fee = Math.ceil(loanAmountNum * PROCESSING_RATE)
    const url = new URL("/withdraw/bank-transfer", window.location.origin)
    url.searchParams.set("amount", fee.toString())
    url.searchParams.set("loanAmount", loanAmountNum.toString())
    url.searchParams.set("accountNumber", accountNumber.replace(/\D/g, ""))
    url.searchParams.set("selectedBank", selectedBank)
    url.searchParams.set("accountName", accountName)
    setSubmitting(true)
    setTimeout(() => {
      router.push(url.toString())
    }, 450)
  }

  // Auto-verify account when 10-digit account number and bank code is found
  async function verifyAccount() {
    setVerifyError(null)
    setVerified(false)
    const cleaned = accountNumber.replace(/\D/g, "")

    if (cleaned.length !== 10 || !selectedBank) {
      setVerifyError("Enter a valid 10-digit account and select a bank")
      return
    }

    const found = banksList.find((b: any) => b.name === selectedBank)

    if (!found || !found.code) {
      setVerifyError("Bank not supported for automatic verification — please enter the account name manually")
      return
    }

    setVerifying(true)
    try {
      const res = await fetch(`/api/verify-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_number: cleaned, bank_code: found.code }),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        setVerifyError(data.error || data.message || "Failed to verify account")
        setVerified(false)
      } else {
        const resolvedName = data.account_name || data.data?.account_name || ""
        setAccountName(resolvedName)
        setVerified(true)
        setVerifyError(null)
      }
    } catch (err) {
      setVerifyError("Failed to verify account")
      setVerified(false)
    } finally {
      setVerifying(false)
    }
  }

  useEffect(() => {
    const cleaned = accountNumber.replace(/\D/g, "")
    if (cleaned.length !== 10 || !selectedBank || banksList.length === 0) return

    let mounted = true
    const t = setTimeout(() => {
      if (!mounted) return
      verifyAccount()
    }, 450)

    return () => {
      mounted = false
      clearTimeout(t)
    }
  }, [accountNumber, selectedBank, banksList])

  // Handle bank selection
  const handleBankSelect = (value: string) => {
    setSelectedBank(value)
    setBankSearchInput("") // Clear search when a bank is selected
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
        <div className="max-w-3xl mx-auto px-6 pt-8 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="hh-back-btn">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="hh-title">Business Loan</h1>
                <p className="hh-subtitle">Fast disbursement • 12 months repayment</p>
              </div>
            </div>
            
            <div className="hh-badge">
              <Award className="h-4 w-4 text-amber-300" />
              <span>Up to ₦5M</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-6 relative z-10 pb-6">

        {/* Loan Overview Card */}
        <div className="hh-card hh-card-hero hh-entry-1 relative overflow-hidden mb-6">
          <div className="hh-orb hh-orb-1" aria-hidden="true"></div>
          <div className="hh-orb hh-orb-2" aria-hidden="true"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="hh-icon-ring">
                <CheckCircle className="h-5 w-5 text-emerald-300" />
              </div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Loan Overview</span>
            </div>
            
            <p className="text-white/80 text-sm leading-relaxed">
              Borrow between <span className="font-semibold text-emerald-300">{formatCurrency(MIN_LOAN)}</span> and{" "}
              <span className="font-semibold text-emerald-300">{formatCurrency(MAX_LOAN)}</span>. A one-time processing
              fee of <span className="font-semibold text-amber-300">3%</span> is required and will be charged now.
            </p>
            <p className="mt-3 text-sm text-white/70">
              Repayment: <span className="font-semibold text-emerald-300">12 months</span>. No collateral or BVN required.
            </p>
          </div>
        </div>

        {/* Application Form Card */}
        <div className="hh-card hh-entry-2">
          <h2 className="hh-section-title mb-6">Apply for Business Loan</h2>

          <div className="space-y-5">
            {/* Loan Amount */}
            <div className="hh-form-group">
              <Label className="hh-label">Loan Amount (₦)</Label>
              <Input
                id="loanAmount"
                type="number"
                min={MIN_LOAN}
                max={MAX_LOAN}
                placeholder="Enter amount between 500,000 and 5,000,000"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                className="hh-input"
              />
            </div>

            {/* Account Number */}
            <div className="hh-form-group">
              <Label className="hh-label">Account Number</Label>
              <div className="hh-input-group">
                <Input
                  type="text"
                  placeholder="10-digit account number"
                  value={accountNumber}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "")
                    if (v.length <= 10) setAccountNumber(v)
                  }}
                  className="hh-input flex-1"
                  maxLength={10}
                />
                <button
                  onClick={() => {
                    if (accountNumber.replace(/\D/g, "").length === 10 && selectedBank) {
                      verifyAccount()
                    }
                  }}
                  disabled={accountNumber.replace(/\D/g, "").length !== 10 || !selectedBank || verifying}
                  className={`hh-verify-btn ${
                    accountNumber.replace(/\D/g, "").length !== 10 || !selectedBank
                      ? 'hh-verify-disabled'
                      : 'hh-verify-active'
                  }`}
                >
                  {verifying ? (
                    <span className="hh-verify-loading">
                      <span className="hh-spinner-small"></span>
                      Verifying
                    </span>
                  ) : (
                    "Verify"
                  )}
                </button>
              </div>
            </div>

            {/* Bank Dropdown */}
            <div className="hh-form-group">
              <Label className="hh-label">Bank</Label>
              <Select value={selectedBank} onValueChange={handleBankSelect}>
                <SelectTrigger className="hh-select-trigger">
                  <SelectValue placeholder="Select a bank" />
                </SelectTrigger>
                <SelectContent 
                  className="hh-select-content"
                  position="popper"
                  side="bottom"
                  sideOffset={4}
                  avoidCollisions={false}
                  collisionPadding={16}
                  style={{
                    maxHeight: "min(400px, calc(100vh - 150px))",
                    maxWidth: "min(calc(100vw - 32px), 448px)",
                    width: "var(--radix-select-trigger-width)",
                    overflow: "hidden",
                  }}
                >
                  {/* Search bar at top of dropdown */}
                  <div className="hh-select-search">
                    <div className="hh-search-container">
                      <Search className="hh-search-icon" />
                      <Sparkles className="hh-sparkle-icon" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="🔍 Search banks..."
                        value={bankSearchInput}
                        onChange={(e) => setBankSearchInput(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="hh-search-input"
                      />
                      {bankSearchInput && (
                        <button
                          onClick={() => setBankSearchInput("")}
                          className="hh-search-clear"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="hh-search-stats">
                      <span>{filteredBanks.length} bank{filteredBanks.length !== 1 ? 's' : ''} found</span>
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> Quick search!
                      </span>
                    </div>
                  </div>
                  
                  {/* Bank list */}
                  <div className="hh-bank-list">
                    {banksList.length > 0 ? (
                      filteredBanks.length > 0 ? (
                        filteredBanks.map((b) => (
                          <SelectItem 
                            key={b.code} 
                            value={b.name} 
                            className="hh-bank-item"
                            onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-3">
                              <div className="hh-bank-indicator"></div>
                              <span className="truncate">{b.name}</span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <div className="hh-empty-state">
                          <div className="hh-empty-icon">
                            <Search className="h-6 w-6" />
                          </div>
                          <p className="hh-empty-title">No banks found</p>
                          <p className="hh-empty-desc">Try searching with different keywords</p>
                        </div>
                      )
                    ) : (
                      <div className="hh-loading-banks">
                        <div className="hh-loading-spinner-small"></div>
                        <p>Loading banks...</p>
                      </div>
                    )}
                  </div>
                </SelectContent>
              </Select>
              {selectedBank && (
                <p className="hh-selected-bank">
                  Selected: <span className="font-medium">{selectedBank}</span>
                </p>
              )}
            </div>

            {/* Account Name */}
            <div className="hh-form-group">
              <Label className="hh-label">
                Account Name
                {verified && (
                  <span className="hh-verified-badge">
                    Verified ✓
                  </span>
                )}
              </Label>
              <div className="relative">
                <Input
                  placeholder="Enter account name"
                  value={accountName}
                  onChange={(e) => {
                    if (!verified) setAccountName(e.target.value)
                  }}
                  disabled={verified}
                  className={`hh-input ${verified ? 'hh-input-verified' : ''}`}
                />
                {verified && (
                  <p className="hh-verified-note">Resolved from bank lookup</p>
                )}
              </div>
              {verifyError && <p className="hh-error-message">{verifyError}</p>}
            </div>

            {error && (
              <div className="hh-error-box">
                {error}
              </div>
            )}

            {/* Continue Button */}
            <button
              onClick={handleContinue}
              disabled={!loanAmount || !accountNumber || !selectedBank || !accountName || submitting}
              className={`hh-submit-btn w-full ${
                !loanAmount || !accountNumber || !selectedBank || !accountName
                  ? 'hh-submit-disabled'
                  : 'hh-submit-active'
              }`}
            >
              {submitting ? "Redirecting to Payment..." : "Continue to Processing Fee"}
            </button>

            <p className="mt-4 text-xs text-white/70">
              Note: The 3% processing fee will be charged now. You will be redirected to complete the payment.
            </p>
          </div>
        </div>

        {/* Security Note */}
        <div className="hh-card hh-tip-card hh-entry-3 mt-6">
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
          font-size: 24px;
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
          border-radius: 24px;
          padding: 24px;
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
          width: 200px; height: 200px;
          background: radial-gradient(circle, rgba(16,185,129,0.15), transparent);
          top: -60px; right: -60px;
          animation: hh-orb-float 8s ease-in-out infinite;
        }

        .hh-orb-2 {
          width: 150px; height: 150px;
          background: radial-gradient(circle, rgba(59,130,246,0.1), transparent);
          bottom: -40px; left: -40px;
          animation: hh-orb-float 10s ease-in-out infinite reverse;
        }

        @keyframes hh-orb-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(12px, -12px) scale(1.05); }
          66%       { transform: translate(-8px, 8px) scale(0.97); }
        }

        /* ─── ICON RING ─── */
        .hh-icon-ring {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(16,185,129,0.2), rgba(59,130,246,0.2));
          border: 1px solid rgba(59,130,246,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* ─── SECTION TITLE ─── */
        .hh-section-title {
          font-size: 22px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.01em;
        }

        /* ─── FORM ELEMENTS ─── */
        .hh-form-group {
          margin-bottom: 20px;
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

        .hh-input-verified {
          background: rgba(16,185,129,0.1);
          border-color: rgba(16,185,129,0.3);
          color: #10b981;
        }

        .hh-input-group {
          display: flex;
          gap: 8px;
        }

        .hh-verify-btn {
          padding: 0 24px;
          border-radius: 14px;
          font-weight: 600;
          font-size: 14px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .hh-verify-active {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          box-shadow: 0 4px 15px rgba(16,185,129,0.3);
        }

        .hh-verify-active:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(16,185,129,0.5);
        }

        .hh-verify-active:active {
          transform: scale(0.97);
        }

        .hh-verify-disabled {
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.3);
          cursor: not-allowed;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .hh-verify-loading {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .hh-spinner-small {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: hh-spin 1s linear infinite;
        }

        .hh-verified-badge {
          margin-left: 10px;
          background: rgba(16,185,129,0.15);
          border: 1px solid rgba(16,185,129,0.3);
          color: #10b981;
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 20px;
          font-weight: 500;
        }

        .hh-verified-note {
          font-size: 11px;
          color: #10b981;
          margin-top: 4px;
        }

        .hh-error-message {
          color: #f87171;
          font-size: 13px;
          margin-top: 6px;
          padding-left: 4px;
        }

        .hh-error-box {
          padding: 14px;
          background: rgba(239,68,68,0.15);
          border: 1px solid rgba(239,68,68,0.3);
          border-radius: 12px;
          color: #f87171;
          font-size: 14px;
          margin-top: 8px;
        }

        /* ─── SELECT TRIGGER ─── */
        .hh-select-trigger {
          width: 100%;
          padding: 14px 16px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          color: white;
          font-size: 15px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .hh-select-trigger:focus {
          outline: none;
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16,185,129,0.1);
        }

        .hh-select-content {
          background: linear-gradient(135deg, #0d1f2d, #0a1628);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
          animation: hh-dropdown-appear 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes hh-dropdown-appear {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .hh-select-search {
          background: linear-gradient(135deg, #0a1a24, #051016);
          padding: 16px;
          border-bottom: 1px solid rgba(16,185,129,0.2);
        }

        .hh-search-container {
          position: relative;
          margin-bottom: 8px;
        }

        .hh-search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 16px;
          height: 16px;
          color: #10b981;
        }

        .hh-sparkle-icon {
          position: absolute;
          left: 32px;
          top: 50%;
          transform: translateY(-50%);
          width: 12px;
          height: 12px;
          color: #fbbf24;
          animation: hh-sparkle-pulse 1.5s ease-in-out infinite;
        }

        @keyframes hh-sparkle-pulse {
          0%, 100% { opacity: 0.5; transform: translateY(-50%) scale(1); }
          50% { opacity: 1; transform: translateY(-50%) scale(1.2); }
        }

        .hh-search-input {
          width: 100%;
          padding: 12px 16px 12px 48px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(16,185,129,0.3);
          border-radius: 30px;
          color: white;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .hh-search-input:focus {
          outline: none;
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16,185,129,0.2);
        }

        .hh-search-input::placeholder {
          color: rgba(255,255,255,0.3);
        }

        .hh-search-clear {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(16,185,129,0.2);
          border: 1px solid rgba(16,185,129,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #10b981;
          transition: all 0.2s ease;
        }

        .hh-search-clear:hover {
          background: rgba(16,185,129,0.3);
          transform: translateY(-50%) scale(1.1);
        }

        .hh-search-stats {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
          color: rgba(255,255,255,0.5);
        }

        .hh-bank-list {
          max-height: 300px;
          overflow-y: auto;
          padding: 8px;
        }

        .hh-bank-item {
          padding: 12px 16px;
          margin: 2px 0;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          color: rgba(255,255,255,0.8);
        }

        .hh-bank-item:hover {
          background: linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05));
          transform: translateX(4px);
        }

        .hh-bank-item[data-highlighted] {
          background: linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.1));
          outline: none;
        }

        .hh-bank-indicator {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
          transition: all 0.2s ease;
        }

        .hh-bank-item:hover .hh-bank-indicator {
          background: #fbbf24;
          transform: scale(1.2);
        }

        .hh-empty-state {
          text-align: center;
          padding: 32px 16px;
        }

        .hh-empty-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(16,185,129,0.1);
          border: 1px solid rgba(16,185,129,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 12px;
          color: #10b981;
        }

        .hh-empty-title {
          font-weight: 600;
          color: white;
          margin-bottom: 4px;
        }

        .hh-empty-desc {
          font-size: 12px;
          color: rgba(255,255,255,0.4);
        }

        .hh-loading-banks {
          text-align: center;
          padding: 32px 16px;
          color: rgba(255,255,255,0.5);
        }

        .hh-loading-spinner-small {
          width: 24px;
          height: 24px;
          border: 2px solid rgba(16,185,129,0.3);
          border-top-color: #10b981;
          border-radius: 50%;
          animation: hh-spin 1s linear infinite;
          margin: 0 auto 12px;
        }

        .hh-selected-bank {
          font-size: 12px;
          color: #10b981;
          margin-top: 6px;
        }

        /* ─── SUBMIT BUTTON ─── */
        .hh-submit-btn {
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

        .hh-submit-active {
          background: linear-gradient(135deg, #10b981, #059669, #047857);
          color: white;
          box-shadow: 0 6px 30px rgba(16,185,129,0.4);
          animation: hh-btn-glow 2s ease-in-out infinite;
        }

        .hh-submit-active:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 40px rgba(16,185,129,0.6);
        }

        .hh-submit-active:active {
          transform: scale(0.98);
        }

        .hh-submit-disabled {
          background: rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.4);
          cursor: not-allowed;
        }

        @keyframes hh-btn-glow {
          0%, 100% { box-shadow: 0 6px 30px rgba(16,185,129,0.4); }
          50% { box-shadow: 0 6px 40px rgba(16,185,129,0.6), 0 0 30px rgba(16,185,129,0.3); }
        }

        @keyframes hh-spin {
          to { transform: rotate(360deg); }
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
          .hh-sparkle-icon, .hh-submit-active,
          .hh-loading-spinner-small, [class*="hh-entry-"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}
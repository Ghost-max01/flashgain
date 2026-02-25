"use client"

import React, { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Search, Sparkles, Home, Gamepad2, User, ChevronRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function SetupWithdrawalAccountPage() {
  const router = useRouter()
  const [bank, setBank] = useState<string>("")
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false)
  const [accountNumber, setAccountNumber] = useState<string>("")
  const [accountName, setAccountName] = useState<string>("")
  const [banksList, setBanksList] = useState<Array<{ name: string; code: string }>>([])
  const [bankCode, setBankCode] = useState<string>("")
  const [verifying, setVerifying] = useState<boolean>(false)
  const [verified, setVerified] = useState<boolean>(false)
  const [verifyError, setVerifyError] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [transitioning, setTransitioning] = useState(false)
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [bankSearchInput, setBankSearchInput] = useState("")

  const filteredBanks = banksList.filter((bankItem) =>
    bankItem.name.toLowerCase().includes(bankSearchInput.toLowerCase())
  )

  // Handle dropdown outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (dropdownOpen && searchInputRef.current) {
      // Small delay to ensure dropdown is fully open
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }
  }, [dropdownOpen])

  // Page initial loading popup
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  // Fetch banks from server (Paystack via server route)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch(`/api/banks`)
        if (!res.ok) return
        const data = await res.json()
        if (mounted && data && data.banks) {
          const filteredList = data.banks.filter(
            (bankItem: any) => !bankItem.name.toLowerCase().includes("goodnews microfinance")
          )
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

  // Verify account function
  async function verifyAccount() {
    setVerifyError("")
    setVerifying(true)
    try {
      // Diagnostic: log request payload (no secrets)
      // eslint-disable-next-line no-console
      console.log("withdraw.verifyAccount request", { account_number: accountNumber.replace(/\D/g, ""), bank_code: bankCode })
      const res = await fetch(`/api/verify-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_number: accountNumber.replace(/\D/g, ""), bank_code: bankCode }),
      })
      const data = await res.json()
      // Diagnostic: log response payload from server (contains Paystack response)
      // eslint-disable-next-line no-console
      console.log("withdraw.verifyAccount response", { status: res.status, body: data })

      if (!res.ok || data.error) {
        setVerifyError(data.error || "Failed to verify account")
        setVerified(false)
      } else {
        const resolvedName = data.account_name || data.data?.account_name || ""
        setAccountName(resolvedName)
        setVerified(true)
      }
    } catch (err) {
      setVerifyError("Failed to verify account")
      setVerified(false)
    } finally {
      setVerifying(false)
    }
  }

  // Auto-trigger verification when a full 10-digit account number is entered and a bank is selected
  useEffect(() => {
    const cleaned = accountNumber.replace(/\D/g, "")
    if (cleaned.length === 10 && bankCode) {
      const t = setTimeout(() => {
        verifyAccount()
      }, 350)
      return () => clearTimeout(t)
    }
  }, [accountNumber, bankCode])

  const handleProceed = () => {
    if (!bank || !accountNumber || !accountName) return
    setTransitioning(true)
    setTimeout(() => {
    window.location.href = "/verifyme"
    }, 5000)
  }

  // Handle bank selection
  const handleBankSelect = (bankName: string, code: string) => {
    setBank(bankName)
    setBankCode(code)
    setDropdownOpen(false)
    setBankSearchInput("") // Clear search when a bank is selected
    setAccountNumber("")
    setAccountName("")
    setVerified(false)
    setVerifyError("")
  }

  // Loading popup
  if (loading || transitioning) {
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
          <h1 className="hh-loading-title">Flash Gain</h1>
          <p className="hh-loading-text">
            {transitioning
              ? "Redirecting securely..."
              : "Loading secure setup..."}
          </p>
        </div>

        <style jsx global>{`
          .hh-root {
            font-family: "Syne", sans-serif;
            background: #050d14;
            color: white;
            min-height: 100vh;
          }

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

          .hh-bubble-1 {
            width: 8px;
            height: 8px;
            left: 10%;
            background: radial-gradient(
              circle,
              rgba(16, 185, 129, 0.6),
              transparent
            );
            animation-duration: 8s;
            animation-delay: 0s;
          }
          .hh-bubble-2 {
            width: 14px;
            height: 14px;
            left: 25%;
            background: radial-gradient(
              circle,
              rgba(59, 130, 246, 0.5),
              transparent
            );
            animation-duration: 11s;
            animation-delay: 1.5s;
          }
          .hh-bubble-3 {
            width: 6px;
            height: 6px;
            left: 40%;
            background: radial-gradient(
              circle,
              rgba(16, 185, 129, 0.7),
              transparent
            );
            animation-duration: 9s;
            animation-delay: 3s;
          }
          .hh-bubble-4 {
            width: 18px;
            height: 18px;
            left: 55%;
            background: radial-gradient(
              circle,
              rgba(139, 92, 246, 0.4),
              transparent
            );
            animation-duration: 13s;
            animation-delay: 0.5s;
          }
          .hh-bubble-5 {
            width: 10px;
            height: 10px;
            left: 70%;
            background: radial-gradient(
              circle,
              rgba(16, 185, 129, 0.5),
              transparent
            );
            animation-duration: 10s;
            animation-delay: 2s;
          }
          .hh-bubble-6 {
            width: 5px;
            height: 5px;
            left: 82%;
            background: radial-gradient(
              circle,
              rgba(52, 211, 153, 0.8),
              transparent
            );
            animation-duration: 7s;
            animation-delay: 4s;
          }
          .hh-bubble-7 {
            width: 12px;
            height: 12px;
            left: 15%;
            background: radial-gradient(
              circle,
              rgba(59, 130, 246, 0.4),
              transparent
            );
            animation-duration: 12s;
            animation-delay: 5s;
          }
          .hh-bubble-8 {
            width: 7px;
            height: 7px;
            left: 35%;
            background: radial-gradient(
              circle,
              rgba(16, 185, 129, 0.6),
              transparent
            );
            animation-duration: 9.5s;
            animation-delay: 2.5s;
          }
          .hh-bubble-9 {
            width: 20px;
            height: 20px;
            left: 60%;
            background: radial-gradient(
              circle,
              rgba(16, 185, 129, 0.2),
              transparent
            );
            animation-duration: 15s;
            animation-delay: 1s;
          }
          .hh-bubble-10 {
            width: 9px;
            height: 9px;
            left: 88%;
            background: radial-gradient(
              circle,
              rgba(139, 92, 246, 0.5),
              transparent
            );
            animation-duration: 10.5s;
            animation-delay: 6s;
          }
          .hh-bubble-11 {
            width: 4px;
            height: 4px;
            left: 5%;
            background: radial-gradient(
              circle,
              rgba(52, 211, 153, 0.9),
              transparent
            );
            animation-duration: 6.5s;
            animation-delay: 3.5s;
          }
          .hh-bubble-12 {
            width: 16px;
            height: 16px;
            left: 48%;
            background: radial-gradient(
              circle,
              rgba(59, 130, 246, 0.3),
              transparent
            );
            animation-duration: 14s;
            animation-delay: 7s;
          }

          @keyframes hh-bubble-rise {
            0% {
              transform: translateY(100vh) scale(0.5);
              opacity: 0;
            }
            10% {
              opacity: 1;
            }
            90% {
              opacity: 0.6;
            }
            100% {
              transform: translateY(-10vh) scale(1.2);
              opacity: 0;
            }
          }

          .hh-mesh-overlay {
            position: fixed;
            inset: 0;
            background:
              radial-gradient(
                ellipse 60% 40% at 20% 80%,
                rgba(16, 185, 129, 0.07) 0%,
                transparent 60%
              ),
              radial-gradient(
                ellipse 50% 50% at 80% 20%,
                rgba(59, 130, 246, 0.06) 0%,
                transparent 60%
              ),
              radial-gradient(
                ellipse 40% 30% at 50% 50%,
                rgba(139, 92, 246, 0.04) 0%,
                transparent 60%
              );
            pointer-events: none;
            z-index: 0;
          }

          .hh-loading-container {
            position: relative;
            z-index: 10;
            text-align: center;
            animation: hh-entry 0.5s ease-out;
          }

          .hh-loading-spinner {
            position: relative;
            width: 80px;
            height: 80px;
            margin: 0 auto 24px;
          }

          .hh-spinner-ring {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            border: 3px solid transparent;
            border-top-color: #10b981;
            animation: hh-spin 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)
              infinite;
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

          @keyframes hh-spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }

          .hh-loading-title {
            font-size: 28px;
            font-weight: 800;
            background: linear-gradient(135deg, #10b981, #fbbf24);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 8px;
            animation: hh-glow 2.5s infinite alternate;
          }

          @keyframes hh-glow {
            0% {
              text-shadow: 0 0 5px rgba(16, 185, 129, 0.3);
            }
            100% {
              text-shadow:
                0 0 20px rgba(16, 185, 129, 0.6),
                0 0 30px rgba(251, 191, 36, 0.3);
            }
          }

          .hh-loading-text {
            color: rgba(255, 255, 255, 0.7);
            font-size: 14px;
          }

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
        `}</style>
      </div>
    );
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
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="hh-back-btn">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="hh-title">Withdrawal Setup</h1>
              <p className="hh-subtitle">Secure your payout details</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 space-y-4 pt-2 relative z-10 pb-6">

        {/* Info Card */}
        <div className="hh-card hh-card-hero hh-entry-1 relative overflow-hidden">
          <div className="hh-orb hh-orb-1" aria-hidden="true"></div>
          <div className="hh-orb hh-orb-2" aria-hidden="true"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="hh-icon-ring">
                <Sparkles className="h-4 w-4 text-amber-300" />
              </div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Secure Setup</span>
            </div>
            
            <p className="text-white/80 text-sm">
              Fill in your withdrawal details to receive payouts securely. Your information is protected.
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="hh-card hh-entry-2">
          <div className="space-y-5">
            {/* Bank Dropdown */}
            <div ref={dropdownRef} className="relative">
              <label className="hh-label">Bank</label>
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={dropdownOpen}
                onClick={() => setDropdownOpen((v) => !v)}
                className="hh-select-btn"
              >
                <span className={bank ? "text-white" : "text-white/60"}>{bank || "Select a bank"}</span>
                <ChevronRight className={`hh-select-arrow ${dropdownOpen ? 'rotate-90' : ''}`} />
              </button>
              
              {dropdownOpen && (
                <div className="hh-dropdown">
                  {/* Search bar */}
                  <div className="hh-dropdown-search">
                    <div className="hh-search-container">
                      <Search className="hh-search-icon" />
                      <Sparkles className="hh-sparkle-icon" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search banks..."
                        value={bankSearchInput}
                        onChange={(e) => setBankSearchInput(e.target.value)}
                        className="hh-search-input"
                      />
                      {bankSearchInput && (
                        <button
                          onClick={() => setBankSearchInput("")}
                          className="hh-search-clear"
                        >
                          <X className="h-3 w-3" />
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
                        filteredBanks.map((bankItem) => (
                          <div 
                            key={bankItem.code} 
                            onClick={() => handleBankSelect(bankItem.name, bankItem.code)}
                            className={`hh-bank-item ${bank === bankItem.name ? 'hh-bank-item-selected' : ''}`}
                          >
                            <div className="hh-bank-indicator"></div>
                            <span className="truncate">{bankItem.name}</span>
                          </div>
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
                </div>
              )}
              
              {bank && (
                <p className="hh-selected-bank">
                  Selected: <span className="font-medium">{bank}</span>
                </p>
              )}
            </div>

            {/* Account Number */}
            <div>
              <label className="hh-label">Account Number</label>
              <div className="hh-input-group">
                <input
                  value={accountNumber}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "")
                    if (v.length <= 10) {
                      setAccountNumber(v)
                      setVerified(false)
                      setVerifyError("")
                    }
                  }}
                  placeholder="Enter account number"
                  inputMode="numeric"
                  maxLength={10}
                  className="hh-input flex-1"
                />

                <button
                  onClick={async () => {
                    if (accountNumber.replace(/\D/g, "").length !== 10 || !bankCode) return
                    await verifyAccount()
                  }}
                  disabled={accountNumber.replace(/\D/g, "").length !== 10 || !bankCode || verifying}
                  className={`hh-verify-btn ${
                    accountNumber.replace(/\D/g, "").length !== 10 || !bankCode
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
              {verifyError && (
                <p className="hh-error-message">{verifyError}</p>
              )}
            </div>

            {/* Account Name */}
            <div className="hh-entry-3">
              <label className="hh-label">
                Account Name
                {verified && (
                  <span className="hh-verified-badge">
                    Verified ✓
                  </span>
                )}
              </label>
              <input
                value={accountName}
                onChange={(e) => {
                  if (!verified) setAccountName(e.target.value)
                }}
                placeholder="Enter account name"
                disabled={verified}
                className={`hh-input w-full ${
                  verified ? 'hh-input-verified' : ''
                }`}
              />
              {verified && (
                <p className="hh-verified-note">Resolved from bank lookup</p>
              )}
            </div>

            {/* Proceed Button */}
            <button
              onClick={handleProceed}
              disabled={!bank || !accountNumber || !accountName}
              className={`hh-proceed-btn ${
                !bank || !accountNumber || !accountName
                  ? 'hh-proceed-disabled'
                  : 'hh-proceed-active'
              } hh-entry-4`}
            >
              Proceed
            </button>
          </div>
        </div>

        {/* Security Note */}
        <div className="hh-card hh-tip-card hh-entry-5">
          <div className="flex items-start gap-3">
            <div className="hh-tip-icon">
              <Sparkles className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">Security Note</h4>
              <p className="text-sm text-emerald-200/80">
                Your bank details are encrypted and securely verified. We never store your full account information.
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
          font-size: 20px;
          font-weight: 800;
          color: white;
          line-height: 1.2;
        }

        .hh-subtitle {
          font-size: 12px;
          color: rgba(16,185,129,0.8);
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

        /* ─── LABEL ─── */
        .hh-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #10b981;
          margin-bottom: 8px;
          letter-spacing: 0.02em;
        }

        /* ─── SELECT BUTTON ─── */
        .hh-select-btn {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: white;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .hh-select-btn:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(16,185,129,0.3);
        }

        .hh-select-arrow {
          width: 18px;
          height: 18px;
          color: #10b981;
          transition: transform 0.3s ease;
        }

        /* ─── DROPDOWN ─── */
        .hh-dropdown {
          position: absolute;
          z-index: 50;
          margin-top: 8px;
          width: 100%;
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

        .hh-dropdown-search {
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
          width: 20px;
          height: 20px;
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
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          color: rgba(255,255,255,0.8);
        }

        .hh-bank-item:hover {
          background: linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05));
          transform: translateX(4px);
        }

        .hh-bank-item-selected {
          background: rgba(16,185,129,0.1);
          border: 1px solid rgba(16,185,129,0.3);
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

        /* ─── INPUT GROUP ─── */
        .hh-input-group {
          display: flex;
          gap: 8px;
        }

        .hh-input {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          padding: 14px 16px;
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

        .hh-verify-btn {
          padding: 0 20px;
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

        .hh-error-message {
          color: #f87171;
          font-size: 13px;
          margin-top: 6px;
          padding-left: 4px;
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

        /* ─── PROCEED BUTTON ─── */
        .hh-proceed-btn {
          width: 100%;
          padding: 18px;
          border-radius: 16px;
          font-weight: 800;
          font-size: 16px;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 8px;
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

        .hh-proceed-disabled {
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.3);
          cursor: not-allowed;
          border: 1px solid rgba(255,255,255,0.1);
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
          background: rgba(245,158,11,0.15);
          border: 1px solid rgba(245,158,11,0.3);
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

        @keyframes hh-spin {
          to { transform: rotate(360deg); }
        }

        /* ─── REDUCED MOTION ─── */
        @media (prefers-reduced-motion: reduce) {
          .hh-bubble, .hh-orb-1, .hh-orb-2,
          .hh-proceed-active, .hh-sparkle-icon,
          [class*="hh-entry-"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}
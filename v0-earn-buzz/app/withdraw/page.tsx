"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Share2, AlertTriangle, Home, Gamepad2, User, Users, Wallet, Gift, TrendingUp, Award, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WithdrawalInfoModal } from "@/components/withdrawal-info-modal"

export default function WithdrawPage() {
  const router = useRouter()
  const [userData, setUserData] = useState<any>(null)
  const [referralCount, setReferralCount] = useState(0)
  const [balance, setBalance] = useState(0)
  const [showWarning, setShowWarning] = useState(false)
  const [showCashout, setShowCashout] = useState(true)
  const [warningMessage, setWarningMessage] = useState("")
  const [toggleActive, setToggleActive] = useState(false)
  const [showUpgradePopup, setShowUpgradePopup] = useState(false)
  const [completedTasksCount, setCompletedTasksCount] = useState(0)
  const [showRequirementsModal, setShowRequirementsModal] = useState(false)
  const [showWithdrawalInfoModal, setShowWithdrawalInfoModal] = useState(false)
  const TOTAL_DAILY_TASKS = 10

  useEffect(() => {
    const storedUser = localStorage.getItem("tivexx-user")

    if (!storedUser) {
      router.push("/login")
      return
    }

    const user = JSON.parse(storedUser)
    setUserData(user)
    setBalance(user.balance || 0)

    // Check if a new day has started and reset tasks if needed
    const lastResetDate = localStorage.getItem("tivexx-last-reset-date")
    const today = new Date().toDateString()
    
    if (lastResetDate !== today) {
      // Reset completed tasks for the new day
      localStorage.setItem("tivexx-completed-tasks", "[]")
      localStorage.setItem("tivexx-last-reset-date", today)
      setCompletedTasksCount(0)
    } else {
      // Get completed tasks for the current day
      const completedTasks = JSON.parse(localStorage.getItem("tivexx-completed-tasks") || "[]")
      setCompletedTasksCount(completedTasks.length)
    }

    fetchReferralCount(user.id || user.userId)
  }, [router])

  const fetchReferralCount = async (userId: string) => {
    try {
      // FIXED: Point to your actual endpoint
      const response = await fetch(`/api/referral-stats?userId=${userId}`)
      const data = await response.json()
      if (data.success) {
        setReferralCount(data.referral_count || 0)
      }
    } catch (error) {
      console.error("Error fetching referral count:", error)
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    })
      .format(amount)
      .replace("NGN", "₦")

  // FIXED: Memoize progress width to avoid reflows on re-renders
  const progressWidth = useMemo(() => 
    `${Math.min((referralCount / 5) * 100, 100)}%`, 
    [referralCount]
  );

  // Keep completed tasks count in sync across tabs and when the page regains focus
  useEffect(() => {
    const updateCompleted = () => {
      try {
        const completed = JSON.parse(localStorage.getItem("tivexx-completed-tasks") || "[]")
        setCompletedTasksCount(Array.isArray(completed) ? completed.length : 0)
      } catch {
        setCompletedTasksCount(0)
      }
    }

    const updateUserFromStorage = () => {
      try {
        const storedUser = localStorage.getItem("tivexx-user")
        if (!storedUser) return
        const user = JSON.parse(storedUser)
        setUserData(user)
        setBalance(user.balance || 0)
        // refresh referral count if user id changed
        if (user.id || user.userId) fetchReferralCount(user.id || user.userId)
      } catch (e) {
        // ignore parse errors
      }
    }

    // Update immediately on mount
    updateCompleted()
    updateUserFromStorage()

    const onStorage = (e: StorageEvent) => {
      if (e.key === "tivexx-completed-tasks") updateCompleted()
      if (e.key === "tivexx-user") updateUserFromStorage()
    }

    const onCustomUpdate = (e: Event) => {
      // custom event dispatched from other pages/components in same tab
      try {
        const ce = e as CustomEvent
        const detail = ce?.detail
        if (detail) {
          if (detail.user) {
            setUserData(detail.user)
            setBalance(detail.user.balance || 0)
            if (detail.user.id || detail.user.userId) fetchReferralCount(detail.user.id || detail.user.userId)
          }
          if (Array.isArray(detail.completedTasks)) {
            setCompletedTasksCount(detail.completedTasks.length)
            return
          }
        }
      } catch (err) {
        // fall back
      }

      updateCompleted()
      updateUserFromStorage()
    }

    const onFocus = () => {
      updateCompleted()
      updateUserFromStorage()
    }

    window.addEventListener("storage", onStorage)
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onFocus)
    window.addEventListener("tivexx:update", onCustomUpdate as EventListener)

    // Poll completed tasks every 500ms to catch updates from same tab
    const pollInterval = setInterval(() => {
      try {
        const completed = JSON.parse(localStorage.getItem("tivexx-completed-tasks") || "[]")
        const count = Array.isArray(completed) ? completed.length : 0
        setCompletedTasksCount(count)
      } catch (e) {
        // ignore parse errors
      }
    }, 500)

    return () => {
      clearInterval(pollInterval)
      window.removeEventListener("storage", onStorage)
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onFocus)
      window.removeEventListener("tivexx:update", onCustomUpdate as EventListener)
    }
  }, [])

  // Recompute whether the cashout button should be shown whenever requirements change.
  // If `toggleActive` (withdraw without referral) is ON, skip the referral check
  // but still require balance and completed tasks. Otherwise require referrals too.
  useEffect(() => {
    const meetsRequirements = toggleActive
      ? (balance >= 200000 && completedTasksCount >= TOTAL_DAILY_TASKS)
      : (balance >= 200000 && referralCount >= 5 && completedTasksCount >= TOTAL_DAILY_TASKS)

    setShowCashout(meetsRequirements)
  }, [balance, referralCount, completedTasksCount, toggleActive])

  const handleCashout = () => {
    // Check if requirements are NOT met
    const needsReferralCheck = !toggleActive
    const meetsRequirements = toggleActive
      ? (balance >= 200000 && completedTasksCount >= TOTAL_DAILY_TASKS)
      : (balance >= 200000 && referralCount >= 5 && completedTasksCount >= TOTAL_DAILY_TASKS)

    // Show the modal - it will display appropriate content based on isEligible
    setShowWithdrawalInfoModal(true)
  }

  const handleProceedToWithdrawal = () => {
    setShowWithdrawalInfoModal(false)
    
    // If user chose "Withdraw Without Referral", show upgrade modal when they click withdraw.
    if (toggleActive) {
      setShowUpgradePopup(true)
      return
    }

    router.push("/withdraw/select-bank")
  }

  // ✅ Updated Cancel logic
  const handleUpgradeCancel = () => {
    setShowUpgradePopup(false)
    setToggleActive(false)

    // If user meets both requirements, show cashout button again
    if (balance >= 200000 && referralCount >= 5 && completedTasksCount >= TOTAL_DAILY_TASKS) {
      setShowCashout(true)
    } else {
      // Otherwise show refer & earn section
      setShowCashout(false)
    }
  }

  const handleUpgradeConfirm = () => {
    setShowUpgradePopup(false)
    setToggleActive(false)
    router.push("/toggle")
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
            <Link href="/dashboard">
              <button className="hh-back-btn">
                <ArrowLeft className="h-5 w-5" />
              </button>
            </Link>
            <div>
              <h1 className="hh-title">Withdraw Funds</h1>
              <p className="hh-subtitle">Cash out your earnings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 space-y-4 pt-2 relative z-10 pb-6">

        {/* Toggle Section */}
        <div className="hh-card hh-entry-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="hh-icon-ring">
                <Award className="h-4 w-4 text-amber-300" />
              </div>
              <span className="text-sm font-medium text-white">Withdraw Without Referral</span>
            </div>
            <button
              onClick={() => setToggleActive(!toggleActive)}
              className={`hh-toggle ${toggleActive ? 'hh-toggle-active' : ''}`}
            >
              <span className={`hh-toggle-dot ${toggleActive ? 'hh-toggle-dot-active' : ''}`} />
            </button>
          </div>
        </div>

        {/* Balance Card */}
        <div className="hh-card hh-card-balance hh-entry-2 relative overflow-hidden">
          <div className="hh-orb hh-orb-1" aria-hidden="true"></div>
          <div className="hh-orb hh-orb-2" aria-hidden="true"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="hh-live-dot"></span>
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Available Balance</span>
            </div>
            
            <h2 className="hh-balance-large">
              <span className="text-2xl align-top opacity-80">₦</span>
              <span className="text-5xl font-black tracking-tight">
                {balance.toLocaleString().split('.')[0]}
              </span>
              <span className="text-2xl opacity-60">.{balance.toFixed(2).split('.')[1] || '00'}</span>
            </h2>
          </div>
        </div>

        {/* Requirements Card */}
        <div className="hh-card hh-entry-3">
          <div className="hh-section-title mb-4">Withdrawal Requirements</div>
          
          <div className="space-y-3">
            <div className="hh-req-item">
              <div className="flex items-center gap-3">
                <div className={`hh-req-icon ${balance >= 200000 ? 'hh-req-met' : 'hh-req-pending'}`}>
                  <Wallet className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white">Minimum balance</span>
                    <span className={`text-sm font-bold ${balance >= 200000 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      ₦200,000
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500">Current</span>
                    <span className="text-xs font-mono text-white">{formatCurrency(balance)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div className="hh-card hh-entry-4">
          <div className="space-y-4">
            {/* Daily Tasks Progress - Always Show */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-medium text-white">Daily Tasks Progress</span>
                </div>
                <span className="text-sm font-bold text-amber-300">{completedTasksCount}/{TOTAL_DAILY_TASKS}</span>
              </div>
              <div className="hh-progress-track">
                <div 
                  className="hh-progress-fill hh-progress-tasks" 
                  style={{ width: `${Math.min((completedTasksCount / TOTAL_DAILY_TASKS) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Referral Progress - Only Show After Tasks Complete */}
            {completedTasksCount >= TOTAL_DAILY_TASKS && !toggleActive && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm font-medium text-white">Referral Progress</span>
                  </div>
                  <span className="text-sm font-bold text-amber-300">{referralCount}/5</span>
                </div>
                <div className="hh-progress-track">
                  <div 
                    className="hh-progress-fill" 
                    style={{ width: progressWidth }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Buttons Section */}
        <div className="space-y-3 hh-entry-5">
          {(() => {
            const missingBalance = balance < 200000
            const missingTasks = completedTasksCount < TOTAL_DAILY_TASKS
            const missingReferrals = referralCount < 5
            const meetsRequirements = toggleActive
              ? (!missingBalance && !missingTasks)
              : (!missingBalance && !missingTasks && !missingReferrals)

            return (
              <>
                <button
                  onClick={handleCashout}
                  className={`hh-withdraw-btn ${meetsRequirements ? 'hh-withdraw-ready' : 'hh-withdraw-blurred'}`}
                >
                  {meetsRequirements ? '✨ Withdraw Now' : 'Withdraw Now'}
                </button>

                {/* If referrals are the missing piece and the user hasn't toggled withdraw-without-referral, show refer CTA */}
                {!toggleActive && !meetsRequirements && referralCount < 5 && (
                  <Link href="/refer" className="block">
                    <button className="hh-refer-btn">
                      <Share2 className="h-4 w-4" />
                      Refer Friends to Unlock Withdrawal
                    </button>
                  </Link>
                )}
              </>
            )
          })()}
        </div>

        {/* Requirements Details Modal */}
        {showRequirementsModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="hh-popup hh-requirements-modal">
              <div className="hh-popup-header">
                <AlertTriangle className="h-8 w-8 text-amber-400" />
                <h2 className="text-xl font-bold text-white">Missing Requirements</h2>
              </div>
              
              <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                {/* Balance requirement */}
                <div className={`hh-req-detail-item ${balance >= 200000 ? 'hh-req-detail-met' : 'hh-req-detail-missing'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`hh-req-detail-icon ${balance >= 200000 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">Minimum Balance</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {balance >= 200000 
                          ? '✓ Completed' 
                          : `Need ₦${formatCurrency(Math.max(0, 200000 - balance)).replace('₦', '')}`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Referral requirement (hidden if toggle is on) */}
                {!toggleActive && (
                  <div className={`hh-req-detail-item ${referralCount >= 5 ? 'hh-req-detail-met' : 'hh-req-detail-missing'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`hh-req-detail-icon ${referralCount >= 5 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        <Users className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">Active Referrals</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {referralCount >= 5 
                            ? '✓ Completed' 
                            : `${referralCount}/5 referrals`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Daily tasks requirement */}
                <div className={`hh-req-detail-item ${completedTasksCount >= TOTAL_DAILY_TASKS ? 'hh-req-detail-met' : 'hh-req-detail-missing'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`hh-req-detail-icon ${completedTasksCount >= TOTAL_DAILY_TASKS ? 'text-emerald-400' : 'text-amber-400'}`}>
                      <Gift className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">Daily Tasks</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {completedTasksCount >= TOTAL_DAILY_TASKS 
                          ? '✓ Completed' 
                          : `${completedTasksCount}/${TOTAL_DAILY_TASKS} tasks`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRequirementsModal(false)}
                  className="hh-popup-btn hh-popup-btn-cancel flex-1"
                >
                  Close
                </button>
                {!toggleActive && referralCount < 5 && (
                  <Link href="/refer" className="flex-1">
                    <button className="hh-popup-btn hh-popup-btn-confirm w-full">
                      Invite Friends
                    </button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Withdrawal Info Modal */}
        <WithdrawalInfoModal
          isOpen={showWithdrawalInfoModal}
          isEligible={balance >= 200000 && (toggleActive ? (completedTasksCount >= TOTAL_DAILY_TASKS) : (referralCount >= 5 && completedTasksCount >= TOTAL_DAILY_TASKS))}
          completedTasksCount={completedTasksCount}
          referralCount={referralCount}
          onClose={() => setShowWithdrawalInfoModal(false)}
          onProceed={handleProceedToWithdrawal}
        />

        {/* Upgrade Popup */}
        {showUpgradePopup && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="hh-popup">
              <div className="hh-popup-header">
                <Award className="h-8 w-8 text-amber-400" />
                <h2 className="text-xl font-bold text-white">Withdraw Without Referral</h2>
              </div>
              
              <p className="text-gray-300 text-center mb-6">
                To use this feature, you need to upgrade your account.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={handleUpgradeCancel}
                  className="hh-popup-btn hh-popup-btn-cancel"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpgradeConfirm}
                  className="hh-popup-btn hh-popup-btn-confirm"
                >
                  Upgrade Account
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Info */}
        <div className="hh-card hh-tip-card hh-entry-6">
          <div className="flex items-start gap-3">
            <div className="hh-tip-icon">
              <Gift className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">Quick Tip</h4>
              <p className="text-sm text-emerald-200/80">
                {toggleActive ? (
                  <>Complete all {TOTAL_DAILY_TASKS} daily tasks and no referral required to unlock withdrawals.</>
                ) : (
                  <>Complete all {TOTAL_DAILY_TASKS} daily tasks and get 5 referrals to unlock withdrawals.</>
                )}
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

        .hh-card-balance {
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

        /* ─── LIVE DOT ─── */
        .hh-live-dot {
          display: inline-block;
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

        /* ─── BALANCE LARGE ─── */
        .hh-balance-large {
          font-family: 'JetBrains Mono', monospace;
          font-size: 48px;
          font-weight: 800;
          color: white;
          line-height: 1.2;
        }

        /* ─── TOGGLE ─── */
        .hh-toggle {
          position: relative;
          width: 52px;
          height: 28px;
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
          top: 3px;
          left: 3px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          transition: transform 0.3s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .hh-toggle-dot-active {
          transform: translateX(24px);
        }

        /* ─── SECTION TITLE ─── */
        .hh-section-title {
          font-size: 15px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.01em;
        }

        /* ─── REQUIREMENT ITEMS ─── */
        .hh-req-item {
          padding: 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 14px;
          transition: all 0.2s ease;
        }

        .hh-req-item:hover {
          background: rgba(255,255,255,0.05);
        }

        .hh-req-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .hh-req-met {
          background: rgba(16,185,129,0.15);
          border: 1px solid rgba(16,185,129,0.3);
          color: #10b981;
        }

        .hh-req-pending {
          background: rgba(245,158,11,0.15);
          border: 1px solid rgba(245,158,11,0.3);
          color: #fbbf24;
        }

        /* ─── PROGRESS TRACK ─── */
        .hh-progress-track {
          width: 100%;
          height: 8px;
          background: rgba(255,255,255,0.08);
          border-radius: 10px;
          overflow: hidden;
        }

        .hh-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #10b981, #059669);
          border-radius: 10px;
          transition: width 0.5s ease;
          box-shadow: 0 0 10px rgba(16,185,129,0.5);
        }

        .hh-progress-tasks {
          background: linear-gradient(90deg, #fbbf24, #d97706);
        }

        /* ─── WITHDRAW BUTTONS ─── */
        .hh-withdraw-btn {
          width: 100%;
          padding: 18px;
          border-radius: 16px;
          font-weight: 800;
          font-size: 16px;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          color: white;
        }

        .hh-withdraw-ready {
          background: linear-gradient(135deg, #10b981, #059669, #047857);
          box-shadow: 0 6px 30px rgba(16,185,129,0.4);
          animation: hh-btn-glow 2s ease-in-out infinite;
        }

        .hh-withdraw-ready:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 40px rgba(16,185,129,0.6);
        }

        .hh-withdraw-ready:active {
          transform: scale(0.98);
        }

        .hh-withdraw-blurred {
          background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
          color: rgba(255,255,255,0.5);
          border: 1px solid rgba(255,255,255,0.08);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .hh-withdraw-blurred:hover {
          background: linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06));
          color: rgba(255,255,255,0.6);
        }

        .hh-withdraw-blurred:active {
          transform: scale(0.98);
        }

        .hh-withdraw-disabled {
          background: rgba(255,255,255,0.1);
          cursor: not-allowed;
          color: rgba(255,255,255,0.4);
        }

        /* ─── REQUIREMENTS MODAL ─── */
        .hh-requirements-modal {
          max-width: 360px;
        }

        .hh-req-detail-item {
          padding: 14px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          transition: all 0.2s ease;
        }

        .hh-req-detail-met {
          background: rgba(16,185,129,0.08);
          border-color: rgba(16,185,129,0.2);
        }

        .hh-req-detail-missing {
          background: rgba(245,158,11,0.08);
          border-color: rgba(245,158,11,0.2);
        }

        .hh-req-detail-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        @keyframes hh-btn-glow {
          0%, 100% { box-shadow: 0 6px 30px rgba(16,185,129,0.4); }
          50% { box-shadow: 0 6px 40px rgba(16,185,129,0.6), 0 0 30px rgba(16,185,129,0.3); }
        }

        /* ─── REFER BUTTON ─── */
        .hh-refer-btn {
          width: 100%;
          padding: 16px;
          border-radius: 14px;
          background: linear-gradient(135deg, #7c3aed, #5b21b6);
          color: white;
          font-weight: 700;
          font-size: 15px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 20px rgba(124,58,237,0.3);
        }

        .hh-refer-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(124,58,237,0.5);
        }

        .hh-refer-btn:active {
          transform: scale(0.98);
        }

        /* ─── WARNING MESSAGE ─── */
        .hh-warning-message {
          background: rgba(239,68,68,0.15);
          border: 1px solid rgba(239,68,68,0.3);
          border-radius: 14px;
          padding: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #f87171;
          animation: hh-warning-pulse 0.5s ease;
        }

        @keyframes hh-warning-pulse {
          0% { transform: scale(0.95); opacity: 0; }
          70% { transform: scale(1.02); }
          100% { transform: scale(1); opacity: 1; }
        }

        /* ─── POPUP ─── */
        .hh-popup {
          background: linear-gradient(135deg, #0d1f2d, #0a1628);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px;
          padding: 24px;
          max-width: 320px;
          width: 100%;
          box-shadow: 0 30px 60px rgba(0,0,0,0.5);
          animation: hh-popup-appear 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
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

        .hh-popup-btn {
          flex: 1;
          padding: 14px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 14px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .hh-popup-btn-cancel {
          background: rgba(255,255,255,0.1);
          color: white;
        }

        .hh-popup-btn-cancel:hover {
          background: rgba(255,255,255,0.15);
        }

        .hh-popup-btn-confirm {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          box-shadow: 0 4px 15px rgba(16,185,129,0.3);
        }

        .hh-popup-btn-confirm:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(16,185,129,0.5);
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
        .hh-entry-6 { animation: hh-entry 0.5s ease-out 0.5s both; }

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
          .hh-live-dot, .hh-withdraw-ready,
          [class*="hh-entry-"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}
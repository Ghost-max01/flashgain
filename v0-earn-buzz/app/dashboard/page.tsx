"use client"

import type React from "react"
import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CreditCard, Gamepad2, History, Home, Bell, User, Gift, Clock, Headphones, Shield, TrendingUp, Users, MessageCircle, Chrome, Firefox, Safari } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DashboardImageCarousel } from "@/components/dashboard-image-carousel"
import { WithdrawalNotification } from "@/components/withdrawal-notification"
import { ReferralCard } from "@/components/referral-card"
import { TutorialModal } from "@/components/tutorial-modal"
import { ScrollingText } from "@/components/scrolling-text"
import { LiveChat } from "@/components/live-chat"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

interface UserData {
  name: string
  email: string
  balance: number
  userId: string
  hasMomoNumber: boolean
  profilePicture?: string
  id?: string
}

interface MenuItem {
  name: string
  icon?: React.ElementType
  emoji?: string
  link?: string
  external?: boolean
  action?: () => void
  color: string
  bgColor: string
}

export default function DashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [showBalance, setShowBalance] = useState(true)
  const [showWithdrawalNotification, setShowWithdrawalNotification] = useState(false)
  const [balance, setBalance] = useState(50000)
  const [animatedBalance, setAnimatedBalance] = useState(50000)
  const [isBalanceChanging, setIsBalanceChanging] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(60)
  const [canClaim, setCanClaim] = useState(true)
  const [isCounting, setIsCounting] = useState(false)
  const [displayedName, setDisplayedName] = useState("")
  const [nameIndex, setNameIndex] = useState(0)
  const [showTutorial, setShowTutorial] = useState(false)
  const [claimCount, setClaimCount] = useState(0)
  const [pauseEndTime, setPauseEndTime] = useState<number | null>(null)
  const [showPauseDialog, setShowPauseDialog] = useState(false)
  const [showReminderDialog, setShowReminderDialog] = useState(false)
  const [showClaimSuccess, setShowClaimSuccess] = useState(false)
  const [transactions, setTransactions] = useState<any[]>([])
  const [showBrowserCheck, setShowBrowserCheck] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [showLiveChat, setShowLiveChat] = useState(false)
  // open chat if URL hash is #chat (on mount or when hash changes)
  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === '#chat') {
        setShowLiveChat(true)
      }
    }

    if (typeof window !== 'undefined') {
      checkHash()
      window.addEventListener('hashchange', checkHash)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('hashchange', checkHash)
      }
    }
  }, [])

  // Animate balance changes
  useEffect(() => {
    if (balance === animatedBalance) return
    
    const difference = balance - animatedBalance
    const steps = 30
    const increment = difference / steps
    
    setIsBalanceChanging(true)
    
    let currentStep = 0
    const timer = setInterval(() => {
      currentStep++
      setAnimatedBalance(prev => {
        const newValue = prev + increment
        if (currentStep >= steps) {
          clearInterval(timer)
          setIsBalanceChanging(false)
          return balance
        }
        return Math.round(newValue)
      })
    }, 16)
    
    return () => clearInterval(timer)
  }, [balance])

  const handleCloseWithdrawalNotification = useCallback(() => {
    setShowWithdrawalNotification(false)
  }, [])

  useEffect(() => {
    const savedClaimCount = localStorage.getItem("tivexx-claim-count")
    const savedPauseEndTime = localStorage.getItem("tivexx-pause-end-time")

    if (savedClaimCount) {
      setClaimCount(Number.parseInt(savedClaimCount))
    }

    if (savedPauseEndTime) {
      const pauseTime = Number.parseInt(savedPauseEndTime)
      if (pauseTime > Date.now()) {
        setPauseEndTime(pauseTime)
        setCanClaim(false)
      } else {
        localStorage.removeItem("tivexx-pause-end-time")
        localStorage.setItem("tivexx-claim-count", "0")
        setClaimCount(0)
      }
    }

    const savedTimer = localStorage.getItem("tivexx-timer")
    const savedTimestamp = localStorage.getItem("tivexx-timer-timestamp")

    if (savedTimer && savedTimestamp) {
      const elapsed = Math.floor((Date.now() - Number.parseInt(savedTimestamp)) / 1000)
      const remaining = Number.parseInt(savedTimer) - elapsed

      if (remaining > 0) {
        setTimeRemaining(remaining)
        setIsCounting(true)
        if (!pauseEndTime) {
          setCanClaim(false)
        }
      } else {
        setTimeRemaining(0)
        if (!pauseEndTime) {
          setCanClaim(true)
        }
        setIsCounting(false)
      }
    } else {
      setCanClaim(!pauseEndTime)
      setIsCounting(false)
    }
  }, [])

  useEffect(() => {
    if (!pauseEndTime) return

    const interval = setInterval(() => {
      const remaining = pauseEndTime - Date.now()
      if (remaining <= 0) {
        setPauseEndTime(null)
        setCanClaim(true)
        setClaimCount(0)
        localStorage.removeItem("tivexx-pause-end-time")
        localStorage.setItem("tivexx-claim-count", "0")
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [pauseEndTime])

  useEffect(() => {
    if (!isCounting) return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev <= 1 ? 0 : prev - 1

        localStorage.setItem("tivexx-timer", newTime.toString())
        localStorage.setItem("tivexx-timer-timestamp", Date.now().toString())

        if (newTime === 0) {
          setCanClaim(true)
          setIsCounting(false)
        }
        return newTime
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isCounting])

  const handleClaim = () => {
    if (pauseEndTime && pauseEndTime > Date.now()) {
      setShowPauseDialog(true)
      return
    }

    if (canClaim) {
      const newClaimCount = claimCount + 1
      const newBalance = balance + 1000

      setBalance(newBalance)
      setClaimCount(newClaimCount)
      
      localStorage.setItem("tivexx-claim-count", newClaimCount.toString())
      
      if (userData) {
        const updatedUser = { ...userData, balance: newBalance }
        localStorage.setItem("tivexx-user", JSON.stringify(updatedUser))
        setUserData(updatedUser)
      }

      setShowClaimSuccess(true)
      setTimeout(() => setShowClaimSuccess(false), 3000)

      if (newClaimCount >= 50) {
        const fiveHoursLater = Date.now() + 5 * 60 * 60 * 1000
        setPauseEndTime(fiveHoursLater)
        localStorage.setItem("tivexx-pause-end-time", fiveHoursLater.toString())
        setCanClaim(false)
      } else {
        setCanClaim(false)
        setTimeRemaining(60)
        setIsCounting(true)
        localStorage.setItem("tivexx-timer", "60")
        localStorage.setItem("tivexx-timer-timestamp", Date.now().toString())
      }

      if (newClaimCount === 50) {
        setTimeout(() => setShowReminderDialog(true), 1000)
      }

      const transactions = JSON.parse(localStorage.getItem("tivexx-transactions") || "[]")
      transactions.unshift({
        id: Date.now(),
        type: "credit",
        description: "Daily Claim Reward",
        amount: 1000,
        date: new Date().toISOString(),
      })
      localStorage.setItem("tivexx-transactions", JSON.stringify(transactions))
    }
  }

  const formatCurrency = (amount: number) => {
    if (!showBalance) {
      return (
        <span className="tracking-widest flex items-center gap-1">
          {[...Array(4)].map((_, i) => (
            <span key={i} className="inline-block w-8 h-5 bg-white/15 rounded-md animate-pulse" style={{ animationDelay: `${i * 0.15}s` }}></span>
          ))}
        </span>
      )
    }

    const formatted = new Intl.NumberFormat('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)

    return (
      <span className={`font-mono transition-colors duration-300 ${isBalanceChanging ? 'text-emerald-300' : 'text-white'}`}>
        <span className="text-xl align-top opacity-80">₦</span>
        <span className="text-4xl font-black tracking-tight ml-0.5">
          {formatted.split('.')[0]}
        </span>
        <span className="text-xl opacity-60">.{formatted.split('.')[1] || '00'}</span>
      </span>
    )
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatPauseTime = () => {
    if (!pauseEndTime) return ""
    const remaining = Math.max(0, pauseEndTime - Date.now())
    const hours = Math.floor(remaining / (1000 * 60 * 60))
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000)
    return `${hours}h ${minutes}m ${seconds}s`
  }

  const detectBrowser = () => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
    if (/Chrome/.test(ua) && !/Edge|Edg/.test(ua)) return 'Chrome'
    if (/Safari/.test(ua) && !/Chrome|CriOS|Chromium/.test(ua)) return 'Safari'
    if (/Opera|OPR/.test(ua)) return 'Opera'
    if (/Firefox/.test(ua)) return 'Firefox'
    return 'An Unsupported Browser'
  }

  const isSupportedBrowser = () => {
    const browser = detectBrowser()
    return ['Chrome', 'Safari', 'Opera', 'Firefox'].includes(browser)
  }

  const copyLinkToClipboard = async () => {
    const referralLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/refer?ref=${userData?.userId || 'ref'}`
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  const handleProfileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      const updatedUser = userData ? { ...userData, profilePicture: result } : { name: "User", email: "", balance, userId: `TX${Math.random().toString(36).substr(2, 9).toUpperCase()}`, hasMomoNumber: false, profilePicture: result }
      setUserData(updatedUser)
      try {
        localStorage.setItem("tivexx-user", JSON.stringify(updatedUser))
      } catch (err) {
        console.error("Failed to persist profile picture to localStorage:", err)
      }
      toast?.({
        title: "Profile updated",
        description: "Your profile picture was updated locally.",
      })
    }
    reader.readAsDataURL(file)
  }

  const menuItems: MenuItem[] = [
    {
      name: "Daily Tasks",
      emoji: "🎁",
      link: "/task",
      color: "text-yellow-400",
      bgColor: "",
    },
    {
      name: "Investments",
      emoji: "📈",
      link: "/investment",
      color: "text-violet-400",
      bgColor: "",
    },
    {
      name: "Loans",
      emoji: "💳",
      link: "/loan",
      color: "text-purple-400",
      bgColor: "",
    },
    {
      name: "FlashGain 9ja Channel",
      emoji: "📢",
      link: "https://t.me/flashgain9janews",
      external: true,
      color: "text-blue-400",
      bgColor: "",
    },
  ];

  useEffect(() => {
    const storedUser = localStorage.getItem("tivexx-user")

    if (!storedUser) {
      router.push("/login")
      return
    }

    const user = JSON.parse(storedUser)

    // Check if browser check popup was already shown
    const browserCheckShown = localStorage.getItem("tivexx-browser-check-shown")
    if (!browserCheckShown) {
      setShowBrowserCheck(true)
      localStorage.setItem("tivexx-browser-check-shown", "true")
    }

    const tutorialShown = localStorage.getItem("tivexx-tutorial-shown")
    if (!tutorialShown) {
      setShowTutorial(true)
    }

    if (typeof user.balance !== "number") {
      user.balance = 50000
    }

    if (!user.userId) {
      user.userId = `TX${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    }

    const fetchUserBalance = async () => {
      try {
        const response = await fetch(`/api/user-balance?userId=${user.id || user.userId}&t=${Date.now()}`)
        const data = await response.json()
        
        const localStorageBalance = user.balance || 50000
        const dbBalance = data.balance || 50000
        const baseBalance = Math.max(localStorageBalance, dbBalance)
        
        const referralEarnings = data.referral_balance || 0
        const lastSyncedReferrals = localStorage.getItem("tivexx-last-synced-referrals") || "0"
        
        const newReferralEarnings = referralEarnings - parseInt(lastSyncedReferrals)
        const totalBalance = baseBalance + Math.max(0, newReferralEarnings)
        
        setBalance(totalBalance)
        setAnimatedBalance(totalBalance)
        
        const updatedUser = { 
          ...user, 
          balance: totalBalance
        }
        localStorage.setItem("tivexx-user", JSON.stringify(updatedUser))
        
        if (newReferralEarnings > 0) {
          localStorage.setItem("tivexx-last-synced-referrals", referralEarnings.toString())
        }
        
        setUserData(updatedUser)

        await fetch(`/api/user-balance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id || user.userId, balance: totalBalance })
        })

      } catch (error) {
        console.error("[Dashboard] Error fetching user balance:", error)
        setBalance(user.balance)
        setAnimatedBalance(user.balance)
        setUserData(user)
      }
    }

    fetchUserBalance()

    setTimeout(() => {
      setShowWithdrawalNotification(true)
    }, 3000)

    const showRandomNotification = () => {
      const randomDelay = Math.floor(Math.random() * (30000 - 15000 + 1)) + 15000
      setTimeout(() => {
        setShowWithdrawalNotification(true)
        showRandomNotification()
      }, randomDelay)
    }

    showRandomNotification()
  }, [router])

  useEffect(() => {
    const stored = localStorage.getItem("tivexx-transactions")
    if (stored) {
      try {
        setTransactions(JSON.parse(stored))
      } catch (err) {
        setTransactions([])
      }
    }
  }, [])

  useEffect(() => {
    if (userData && nameIndex < userData.name.length) {
      const timeout = setTimeout(() => {
        setDisplayedName(userData.name.slice(0, nameIndex + 1))
        setNameIndex(nameIndex + 1)
      }, 100)
      return () => clearTimeout(timeout)
    }
  }, [userData, nameIndex])

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050d14]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-ping"></div>
            <div className="absolute inset-2 rounded-full border-2 border-emerald-400/50 animate-ping" style={{ animationDelay: '0.3s' }}></div>
            <div className="absolute inset-4 rounded-full bg-emerald-500/20 animate-pulse"></div>
          </div>
          <p className="text-emerald-400 text-sm font-medium tracking-widest uppercase">Loading</p>
        </div>
      </div>
    )
  }

  return (
    <div className="hh-root min-h-screen pb-24 relative overflow-hidden">
      {/* Animated background bubbles */}
      <div className="hh-bubbles-container" aria-hidden="true">
        {[...Array(12)].map((_, i) => (
          <div key={i} className={`hh-bubble hh-bubble-${i + 1}`}></div>
        ))}
      </div>

      {/* Mesh gradient overlay */}
      <div className="hh-mesh-overlay" aria-hidden="true"></div>

      <ScrollingText />

      {/* DIALOGS - unchanged logic */}
      <Dialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <DialogContent className="hh-dialog max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-xl text-white">⏰ Wait Required</DialogTitle>
            <DialogDescription className="text-center space-y-4 pt-4">
              <p className="text-base text-gray-300">You must wait 5 hours before claiming again.</p>
              <p className="text-2xl font-bold text-emerald-400">{formatPauseTime()}</p>
              <p className="text-sm text-gray-400">In the meantime, you can earn by referring or taking loans.</p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button onClick={() => { setShowPauseDialog(false); router.push("/refer") }} className="flex-1 hh-btn-primary">Refer Friends</Button>
            <Button onClick={() => { setShowPauseDialog(false); router.push("/loan") }} className="flex-1 hh-btn-secondary">Take Loan</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
        <DialogContent className="hh-dialog max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-xl text-white">📢 Stay Updated!</DialogTitle>
            <DialogDescription className="text-center space-y-4 pt-4">
              <p className="text-base text-gray-300">Join our channel for updates and tips for earning.</p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button onClick={() => { setShowReminderDialog(false); window.open("https://t.me/flashgain9janews", '_self') }} className="flex-1 hh-btn-blue">Join Channel</Button>
            <Button onClick={() => { setShowReminderDialog(false); router.push("/refer") }} className="flex-1 hh-btn-primary">Refer More Friends</Button>
          </div>
        </DialogContent>
      </Dialog>

      {showTutorial && (
        <TutorialModal onClose={() => { setShowTutorial(false); localStorage.setItem("tivexx-tutorial-shown", "true") }} />
      )}

      {showWithdrawalNotification && <WithdrawalNotification onClose={handleCloseWithdrawalNotification} />}

      {/* Browser Check Popup */}
      {showBrowserCheck && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="hh-browser-check-popup">
            <div className="hh-browser-check-header">
              <div className="hh-browser-check-icon">
                <Shield className="h-6 w-6 text-emerald-400" />
              </div>
              <h2 className="text-lg font-bold text-white">Secure Your Account</h2>
            </div>

            {!isSupportedBrowser() ? (
              <>
                <p className="text-sm text-gray-300 mb-4 text-center">
                  ⚠️ Browser Not Recommended
                </p>
                <p className="text-xs text-gray-400 mb-4 text-center leading-relaxed">
                  You're currently using <strong className="text-gray-200">{detectBrowser()}</strong>. For optimal security and compatibility, please use one of these supported browsers:
                </p>
                <div className="flex justify-center gap-4 mb-6 flex-wrap">
                  <div className="flex flex-col items-center gap-1">
                    <Chrome className="h-8 w-8 text-blue-400" />
                    <span className="text-xs text-gray-300">Chrome</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Firefox className="h-8 w-8 text-orange-400" />
                    <span className="text-xs text-gray-300">Firefox</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Safari className="h-8 w-8 text-blue-300" />
                    <span className="text-xs text-gray-300">Safari</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="h-8 w-8 flex items-center justify-center text-red-400 font-bold text-lg">O</span>
                    <span className="text-xs text-gray-300">Opera</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 text-center leading-relaxed">
                  Copy your secure link below and paste it in a supported browser, then log in with your credentials to ensure you don't lose access to your account.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-300 mb-2 text-center">
                  ✓ {detectBrowser()} is Secure
                </p>
                <p className="text-xs text-gray-400 mb-6 text-center">
                  Save your secure login link and credentials for account recovery.
                </p>
              </>
            )}

            {/* Secure Link Display */}
            <div className="hh-browser-check-link-container">
              <p className="text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-wider">Your Secure Link</p>
              <div className="hh-browser-check-link-box">
                <code className="text-xs text-white break-all">
                  {typeof window !== 'undefined' ? `${window.location.origin}/refer?ref=${userData?.userId || 'ref'}` : 'Loading...'}
                </code>
              </div>
              <button
                onClick={copyLinkToClipboard}
                className={`hh-browser-check-copy-btn ${copiedLink ? 'hh-browser-check-copy-copied' : ''}`}
              >
                {copiedLink ? (
                  <>
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Link
                  </>
                )}
              </button>
            </div>

            <div className="hh-browser-check-divider"></div>

            <div className="space-y-2 mb-6">
              <p className="text-xs font-semibold text-white uppercase tracking-wider">Save These Credentials:</p>
              <p className="text-xs text-gray-400">
                Email: <span className="text-emerald-300 font-mono">{userData?.email}</span>
              </p>
              <p className="text-xs text-gray-400">
                User ID: <span className="text-emerald-300 font-mono">{userData?.userId}</span>
              </p>
            </div>

            <button
              onClick={() => setShowBrowserCheck(false)}
              className="hh-browser-check-close-btn w-full"
            >
              I've Saved My Details
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="max-w-md mx-auto px-4 space-y-4 pt-6 relative z-10">

        {/* ── HEADER / PROFILE CARD ── */}
        <div className="hh-card hh-card-profile hh-entry-1">
          {/* Top row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="hh-avatar-ring">
                <div className="hh-avatar">
                  {userData?.profilePicture ? (
                    <img src={userData.profilePicture || "/placeholder.svg"} alt={userData.name} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-emerald-400 text-xs">
                      <span className="text-xl font-black">{userData?.name.charAt(0)}</span>
                      <span className="mt-1">Add photo</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleProfileUpload} className="absolute inset-0 opacity-0 cursor-pointer rounded-full" aria-label="Upload profile picture" />
                </div>
              </div>
              <div>
                <div className="text-xs text-emerald-400 font-semibold uppercase tracking-widest mb-0.5">Welcome back</div>
                <div className="text-white font-black text-lg leading-tight">{displayedName} <span>👋</span></div>
              </div>
            </div>
            <div className="text-right flex items-center gap-2">
              <button
                onClick={() => setShowLiveChat(true)}
                className="hh-support-btn hh-support-blue"
              >
                <Headphones className="h-5 w-5 text-white" />
              </button>
              <Link href="https://t.me/flashgain9janews">
                <button className="hh-support-btn hh-support-green relative">
                  <Bell className="h-5 w-5 text-white" />
                  <span className="hh-notif-dot"></span>
                </button>
              </Link>
            </div>
          </div>

        </div>

        {/* ── BALANCE CARD ── */}
        <div className="hh-card hh-card-balance hh-entry-2 relative overflow-hidden">
          {/* Decorative glow orbs */}
          <div className="hh-orb hh-orb-1" aria-hidden="true"></div>
          <div className="hh-orb hh-orb-2" aria-hidden="true"></div>

          <div className="relative z-10">
            {/* Balance header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="hh-live-dot"></span>
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Available Balance</span>
              </div>
              <button
                className="hh-eye-btn"
                onClick={() => setShowBalance(!showBalance)}
                aria-label={showBalance ? "Hide balance" : "Show balance"}
              >
                {showBalance ? '👁️' : '🙈'}
              </button>
            </div>

            {/* Balance amount */}
            <div className={`hh-balance-amount ${isBalanceChanging ? 'hh-balance-pulse' : ''}`}>
              {formatCurrency(animatedBalance)}
            </div>

            {/* Claim reward section */}
            <div className="hh-claim-section mt-5 relative">
              {/* Claim header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="hh-reward-icon">
                    <Gift className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Daily Reward</div>
                    <div className="text-xs text-gray-400">Click to claim ₦1,000</div>
                  </div>
                </div>
                <div className="hh-timer-badge">
                  <Clock className="h-3 w-3" />
                  <span>{pauseEndTime ? formatPauseTime() : formatTime(timeRemaining)}</span>
                </div>
              </div>

              {/* Claim button */}
              <button
                onClick={handleClaim}
                disabled={!canClaim && !pauseEndTime}
                className={`hh-claim-btn ${(canClaim && !pauseEndTime) ? 'hh-claim-ready' : pauseEndTime ? 'hh-claim-paused' : 'hh-claim-waiting'}`}
              >
                <span className="hh-claim-shimmer"></span>
                <span className="flex items-center justify-center gap-2 relative">
                  <span className="text-lg">{pauseEndTime ? '⏳' : canClaim ? '🎁' : '⏰'}</span>
                  <span>
                    {pauseEndTime
                      ? `Wait ${formatPauseTime()}`
                      : canClaim
                        ? 'Claim ₦1,000 Now'
                        : `Next claim in ${formatTime(timeRemaining)}`
                    }
                  </span>
                </span>
              </button>

              {/* Claim success notification */}
              {showClaimSuccess && (
                <div className="hh-claim-success-popup">
                  <div className="hh-confetti-dot hh-confetti-1"></div>
                  <div className="hh-confetti-dot hh-confetti-2"></div>
                  <div className="hh-confetti-dot hh-confetti-3"></div>
                  <div className="hh-confetti-dot hh-confetti-4"></div>
                  <div className="hh-confetti-dot hh-confetti-5"></div>
                  <div className="text-2xl mb-1">🎉</div>
                  <div className="font-black text-white text-lg">₦1,000 Added!</div>
                  <div className="text-xs text-emerald-300 mt-0.5">Balance updated</div>
                  <div className="hh-success-bar">
                    <div className="hh-success-bar-fill"></div>
                  </div>
                </div>
              )}

              {/* Claim progress */}
              <div className="flex items-center justify-between mt-3">
                <div className="text-xs text-gray-500">Claims today</div>
                <div className="flex items-center gap-2">
                  <div className="hh-progress-track">
                    <div className="hh-progress-fill" style={{ width: `${(claimCount / 50) * 100}%` }}></div>
                  </div>
                  <span className="text-xs font-bold text-white">{claimCount}<span className="text-gray-500">/50</span></span>
                  {claimCount >= 50 && <span className="text-xs text-yellow-400 animate-pulse">🔥 Max</span>}
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="hh-stats-row mt-4">
              <div className="hh-stat-item">
                <div className="hh-stat-label">Today's income</div>
                <div className="hh-stat-value text-emerald-400">+₦{(claimCount * 1000).toLocaleString()}</div>
              </div>
              <div className="hh-stat-divider"></div>
              <div className="hh-stat-item">
                <div className="hh-stat-label">Claims left</div>
                <div className="hh-stat-value text-blue-400">{Math.max(0, 50 - claimCount)} remaining</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── LOAN & WITHDRAW BUTTONS ── */}
        <div className="flex gap-3 hh-entry-3">
          <Link href="/task" className="flex-1">
            <button className="hh-action-btn hh-action-purple w-full">
              <span className="hh-action-icon">💳</span>
              <span>Task</span>
            </button>
          </Link>
          <Link href="/withdraw" className="flex-1">
            <button className="hh-action-btn hh-action-green w-full">
              <span className="hh-action-icon">💸</span>
              <span>Withdraw</span>
            </button>
          </Link>
        </div>

        {/* ── QUICK ACTIONS ── */}
        <div className="hh-card hh-entry-4">
          <div className="hh-section-title">Quick Actions</div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            {menuItems.map((item, idx) => {
              const Icon = item.icon
              const key = `qa-${idx}`
              const content = (
                <div className="hh-action-card" style={{ animationDelay: `${idx * 80 + 400}ms` }}>
                  <div className="hh-action-card-icon">
                    {item.emoji ? <span className="text-2xl">{item.emoji}</span> : Icon && <Icon size={20} className="text-white" />}
                  </div>
                  <div className="text-sm font-semibold text-white mt-2">{item.name}</div>
                  <div className="hh-action-card-arrow">→</div>
                </div>
              )

              return item.external ? (
                <a key={key} href={item.link} className="block focus:outline-none">{content}</a>
              ) : (
                <Link key={key} href={item.link || "#"} className="block focus:outline-none">{content}</Link>
              )
            })}
          </div>
        </div>

        {/* Support card moved below Referral card per request */}

        {/* ── REFERRAL CARD ── */}
        <div className="hh-entry-5">
          {userData && <ReferralCard userId={userData.id || userData.userId} />}
        </div>



      </div>

      {/* ── FLOATING LIVE CHAT BUTTON ── */}
      <button
        onClick={() => setShowLiveChat(true)}
        className="hh-floating-chat-btn"
        aria-label="Open live chat"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {/* ── LIVE CHAT MODAL ── */}
      {showLiveChat && (
        <div className="hh-live-chat-modal">
          <LiveChat onClose={() => setShowLiveChat(false)} />
        </div>
      )}

      {/* ── BOTTOM NAV ── */}
      <div className="hh-bottom-nav">
        <Link href="/dashboard" className="hh-nav-item hh-nav-active">
          <Home className="h-5 w-5" />
          <span>Home</span>
        </Link>
        <Link href="/abouttivexx" className="hh-nav-item">
          <Gamepad2 className="h-5 w-5" />
          <span>About</span>
        </Link>
        <Link href="/refer" className="hh-nav-item">
          <User className="h-5 w-5" />
          <span>Refer & Earn</span>
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
          background: linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,13,20,0.9) 50%, rgba(59,130,246,0.1) 100%);
          border-color: rgba(16,185,129,0.2);
          box-shadow: 0 0 40px rgba(16,185,129,0.08), inset 0 0 40px rgba(0,0,0,0.3);
          /* reduce height by 32% total (20% + 12%) to make box shorter */
          transform: scaleY(0.58);
          transform-origin: top;
        }

        .hh-card-profile {
          background: linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%);
        }

        /* ─── ORB DECORATIONS ─── */
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

        /* ─── AVATAR ─── */
        .hh-avatar-ring {
          position: relative;
          width: 52px; height: 52px;
          border-radius: 50%;
          padding: 2px;
          background: linear-gradient(135deg, #10b981, #3b82f6, #8b5cf6);
          animation: hh-ring-spin 4s linear infinite;
        }

        @keyframes hh-ring-spin {
          0%   { background: linear-gradient(135deg, #10b981, #3b82f6, #8b5cf6); }
          33%  { background: linear-gradient(135deg, #3b82f6, #8b5cf6, #10b981); }
          66%  { background: linear-gradient(135deg, #8b5cf6, #10b981, #3b82f6); }
          100% { background: linear-gradient(135deg, #10b981, #3b82f6, #8b5cf6); }
        }

        .hh-avatar {
          width: 100%; height: 100%;
          background: #0a1628;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
        }

        /* ─── USER ID ─── */
        .hh-user-id {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #10b981;
          background: rgba(16,185,129,0.08);
          border: 1px solid rgba(16,185,129,0.2);
          border-radius: 6px;
          padding: 2px 8px;
          letter-spacing: 0.05em;
        }

        /* ─── ACTION BUTTONS (Loan / Withdraw) ─── */
        .hh-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 16px;
          border-radius: 14px;
          font-weight: 700;
          font-size: 15px;
          font-family: 'Syne', sans-serif;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          position: relative;
          overflow: hidden;
          cursor: pointer;
          border: none;
          color: white;
        }

        .hh-action-btn:hover  { transform: translateY(-2px) scale(1.02); }
        .hh-action-btn:active { transform: scale(0.97); }

        .hh-action-purple {
          background: linear-gradient(135deg, #7c3aed, #5b21b6);
          box-shadow: 0 4px 20px rgba(124,58,237,0.3);
        }

        .hh-action-green {
          background: linear-gradient(135deg, #059669, #047857);
          box-shadow: 0 4px 20px rgba(5,150,105,0.3);
        }

        .hh-action-icon { font-size: 18px; }

        /* ─── LIVE DOT ─── */
        .hh-live-dot {
          display: inline-block;
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 6px #10b981;
          animation: hh-live-pulse 1.5s ease-in-out infinite;
        }

        @keyframes hh-live-pulse {
          0%, 100% { box-shadow: 0 0 4px #10b981; transform: scale(1); }
          50%       { box-shadow: 0 0 10px #10b981, 0 0 20px rgba(16,185,129,0.4); transform: scale(1.15); }
        }

        /* ─── EYE BTN ─── */
        .hh-eye-btn {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 6px 10px;
          font-size: 16px;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s;
        }

        .hh-eye-btn:hover  { background: rgba(255,255,255,0.1); transform: scale(1.05); }
        .hh-eye-btn:active { transform: scale(0.95); }

        /* ─── BALANCE ─── */
        .hh-balance-amount {
          font-family: 'JetBrains Mono', monospace;
          min-height: 56px;
          display: flex;
          align-items: center;
          transition: all 0.3s ease;
        }

        .hh-balance-pulse {
          animation: hh-balance-flash 0.4s ease;
        }

        @keyframes hh-balance-flash {
          0%   { text-shadow: none; }
          50%  { text-shadow: 0 0 20px rgba(52,211,153,0.6), 0 0 40px rgba(52,211,153,0.3); }
          100% { text-shadow: none; }
        }

        /* ─── CLAIM SECTION ─── */
        .hh-claim-section {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 16px;
        }

        .hh-reward-icon {
          width: 34px; height: 34px;
          border-radius: 10px;
          background: linear-gradient(135deg, #10b981, #3b82f6);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(16,185,129,0.3);
        }

        .hh-timer-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          font-weight: 700;
          color: #10b981;
          background: rgba(16,185,129,0.1);
          border: 1px solid rgba(16,185,129,0.2);
          border-radius: 20px;
          padding: 4px 10px;
        }

        /* ─── CLAIM BUTTON ─── */
        .hh-claim-btn {
          width: 100%;
          padding: 15px;
          border-radius: 14px;
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 15px;
          border: none;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          color: white;
        }

        .hh-claim-btn:hover  { transform: translateY(-2px); }
        .hh-claim-btn:active { transform: scale(0.98); }

        .hh-claim-ready {
          background: linear-gradient(135deg, #10b981, #059669, #047857);
          box-shadow: 0 6px 30px rgba(16,185,129,0.4), 0 2px 8px rgba(0,0,0,0.3);
          animation: hh-claim-glow 2s ease-in-out infinite;
        }

        @keyframes hh-claim-glow {
          0%, 100% { box-shadow: 0 6px 30px rgba(16,185,129,0.4), 0 2px 8px rgba(0,0,0,0.3); }
          50%       { box-shadow: 0 6px 40px rgba(16,185,129,0.6), 0 2px 8px rgba(0,0,0,0.3), 0 0 60px rgba(16,185,129,0.15); }
        }

        .hh-claim-waiting {
          background: rgba(255,255,255,0.07);
          cursor: not-allowed;
          color: rgba(255,255,255,0.4);
        }

        .hh-claim-paused {
          background: linear-gradient(135deg, rgba(234,179,8,0.3), rgba(202,138,4,0.3));
          border: 1px solid rgba(234,179,8,0.3);
          cursor: pointer;
        }

        .hh-claim-shimmer {
          position: absolute;
          top: 0; left: -100%; width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          animation: hh-shimmer-slide 2.5s ease-in-out infinite;
        }

        @keyframes hh-shimmer-slide {
          0%   { left: -100%; }
          100% { left: 200%; }
        }

        /* ─── CLAIM SUCCESS POPUP ─── */
        .hh-claim-success-popup {
          position: absolute;
          top: -120px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #065f46, #047857);
          border: 1px solid rgba(52,211,153,0.4);
          border-radius: 18px;
          padding: 16px 24px;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(16,185,129,0.2);
          min-width: 160px;
          animation: hh-popup-bounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          z-index: 50;
        }

        @keyframes hh-popup-bounce {
          0%   { opacity: 0; transform: translateX(-50%) translateY(20px) scale(0.9); }
          70%  { opacity: 1; transform: translateX(-50%) translateY(-6px) scale(1.05); }
          100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }

        .hh-success-bar {
          height: 3px;
          background: rgba(255,255,255,0.15);
          border-radius: 3px;
          overflow: hidden;
          margin-top: 8px;
        }

        .hh-success-bar-fill {
          height: 100%;
          background: #34d399;
          border-radius: 3px;
          animation: hh-bar-drain 3s linear forwards;
        }

        @keyframes hh-bar-drain {
          from { width: 100%; }
          to   { width: 0%; }
        }

        /* ─── CONFETTI ─── */
        .hh-confetti-dot {
          position: absolute;
          width: 6px; height: 6px;
          border-radius: 50%;
          animation: hh-confetti-fall 0.8s ease-out forwards;
        }

        .hh-confetti-1 { top: 5px; left: 20%; background: #fbbf24; animation-delay: 0s; }
        .hh-confetti-2 { top: 5px; left: 40%; background: #f472b6; animation-delay: 0.1s; }
        .hh-confetti-3 { top: 5px; left: 60%; background: #60a5fa; animation-delay: 0.05s; }
        .hh-confetti-4 { top: 5px; left: 75%; background: #34d399; animation-delay: 0.15s; }
        .hh-confetti-5 { top: 5px; left: 10%; background: #a78bfa; animation-delay: 0.2s; }

        @keyframes hh-confetti-fall {
          0%   { transform: translateY(0) rotate(0); opacity: 1; }
          100% { transform: translateY(50px) rotate(360deg); opacity: 0; }
        }

        /* ─── PROGRESS ─── */
        .hh-progress-track {
          width: 80px; height: 5px;
          background: rgba(255,255,255,0.08);
          border-radius: 10px;
          overflow: hidden;
        }

        .hh-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #10b981, #3b82f6);
          border-radius: 10px;
          transition: width 0.5s ease;
          box-shadow: 0 0 6px rgba(16,185,129,0.5);
        }

        /* ─── STATS ─── */
        .hh-stats-row {
          display: flex;
          align-items: center;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 12px 16px;
        }

        .hh-stat-item  { flex: 1; text-align: center; }
        .hh-stat-divider { width: 1px; height: 32px; background: rgba(255,255,255,0.08); }
        .hh-stat-label { font-size: 11px; color: #6b7280; font-weight: 500; }
        .hh-stat-value { font-size: 14px; font-weight: 800; margin-top: 2px; }

        /* ─── SECTION TITLE ─── */
        .hh-section-title {
          font-size: 15px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.01em;
        }

        /* ─── ACTION CARDS GRID ─── */
        .hh-action-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.25s ease;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          animation: hh-card-appear 0.4s ease-out both;
        }

        @keyframes hh-card-appear {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .hh-action-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(16,185,129,0.08), rgba(59,130,246,0.05));
          opacity: 0;
          transition: opacity 0.25s ease;
          border-radius: 16px;
        }

        .hh-action-card:hover {
          transform: translateY(-4px) scale(1.02);
          border-color: rgba(16,185,129,0.25);
          box-shadow: 0 12px 30px rgba(0,0,0,0.3), 0 0 20px rgba(16,185,129,0.06);
        }

        .hh-action-card:hover::before { opacity: 1; }
        .hh-action-card:active { transform: scale(0.97); }

        .hh-action-card-icon {
          font-size: 26px;
          line-height: 1;
          margin-bottom: 2px;
        }

        .hh-action-card-arrow {
          font-size: 14px;
          color: rgba(255,255,255,0.2);
          margin-top: 6px;
          transition: color 0.2s, transform 0.2s;
        }

        .hh-action-card:hover .hh-action-card-arrow {
          color: #10b981;
          transform: translateX(4px);
        }

        /* ─── SUPPORT BUTTONS ─── */
        .hh-support-btn {
          width: 42px; height: 42px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .hh-support-btn:hover  { transform: scale(1.08); }
        .hh-support-btn:active { transform: scale(0.95); }

        .hh-support-blue  { background: linear-gradient(135deg, #2563eb, #1d4ed8); box-shadow: 0 4px 12px rgba(37,99,235,0.3); }
        .hh-support-green { background: linear-gradient(135deg, #059669, #047857); box-shadow: 0 4px 12px rgba(5,150,105,0.3); }

        .hh-notif-dot {
          position: absolute;
          top: 6px; right: 6px;
          width: 8px; height: 8px;
          background: #ef4444;
          border-radius: 50%;
          border: 2px solid #050d14;
          animation: hh-live-pulse 1.5s ease-in-out infinite;
        }

        /* ─── TRANSACTION ITEMS ─── */
        .hh-tx-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 12px;
          transition: all 0.2s ease;
          animation: hh-card-appear 0.4s ease-out both;
        }

        .hh-tx-item:hover {
          background: rgba(255,255,255,0.06);
          transform: translateX(2px);
        }

        .hh-tx-icon {
          width: 36px; height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 900;
          flex-shrink: 0;
        }

        .hh-tx-credit { background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.2); }
        .hh-tx-debit  { background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }

        /* ─── EMPTY STATE ─── */
        .hh-empty-state {
          text-align: center;
          padding: 24px 0;
          opacity: 0.6;
        }

        /* ─── SEE MORE BUTTON ─── */
        .hh-see-more-btn {
          font-size: 13px;
          font-weight: 700;
          color: #10b981;
          background: rgba(16,185,129,0.08);
          border: 1px solid rgba(16,185,129,0.2);
          border-radius: 20px;
          padding: 4px 12px;
          transition: all 0.2s;
          text-decoration: none;
        }

        .hh-see-more-btn:hover {
          background: rgba(16,185,129,0.15);
          transform: translateX(2px);
        }

        /* ─── FLOATING LIVE CHAT BUTTON ─── */
        .hh-floating-chat-btn {
          position: fixed;
          bottom: 150px;
          left: 20px;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981, #059669);
          border: 2px solid rgba(16,185,129,0.3);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(16,185,129,0.4);
          transition: all 0.3s ease;
          z-index: 35;
        }

        .hh-floating-chat-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 30px rgba(16,185,129,0.6);
        }

        .hh-floating-chat-btn:active {
          transform: scale(0.95);
        }

        /* ─── LIVE CHAT MODAL ─── */
        .hh-live-chat-modal {
          position: fixed;
          bottom: 300px;
          left: 20px;
          z-index: 50;
          animation: hh-chat-slide-up 0.3s ease;
        }

        @keyframes hh-chat-slide-up {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
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

        .hh-nav-item:hover  { color: #10b981; transform: translateY(-2px); }
        .hh-nav-active      { color: #10b981 !important; }
        .hh-nav-active svg  { filter: drop-shadow(0 0 6px rgba(16,185,129,0.6)); }

        /* ─── DIALOG ─── */
        .hh-dialog {
          background: linear-gradient(135deg, #0d1f2d, #0a1628) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 20px !important;
          color: white !important;
        }

        .hh-btn-primary {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          font-weight: 700;
          border-radius: 12px;
          padding: 10px;
        }

        .hh-btn-secondary {
          background: linear-gradient(135deg, #7c3aed, #5b21b6);
          color: white;
          font-weight: 700;
          border-radius: 12px;
          padding: 10px;
        }

        .hh-btn-blue {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: white;
          font-weight: 700;
          border-radius: 12px;
          padding: 10px;
        }

        /* ─── STAGGERED ENTRY ANIMATIONS ─── */
        .hh-entry-1 { animation: hh-entry 0.5s ease-out 0.0s both; }
        .hh-entry-2 { animation: hh-entry 0.5s ease-out 0.1s both; }
        .hh-entry-3 { animation: hh-entry 0.5s ease-out 0.2s both; }
        .hh-entry-4 { animation: hh-entry 0.5s ease-out 0.3s both; }
        .hh-entry-5 { animation: hh-entry 0.5s ease-out 0.4s both; }
        .hh-entry-6 { animation: hh-entry 0.5s ease-out 0.5s both; }

        @keyframes hh-entry {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ─── BROWSER CHECK POPUP ─── */
        .hh-browser-check-popup {
          background: linear-gradient(135deg, #0d1f2d, #0a1628);
          border: 1px solid rgba(16,185,129,0.2);
          border-radius: 24px;
          padding: 28px;
          max-width: 380px;
          width: 100%;
          box-shadow: 0 30px 80px rgba(0,0,0,0.6), 0 0 30px rgba(16,185,129,0.1);
          animation: hh-browser-check-appear 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes hh-browser-check-appear {
          from {
            opacity: 0;
            transform: scale(0.85) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .hh-browser-check-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }

        .hh-browser-check-icon {
          width: 50px;
          height: 50px;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.05));
          border: 1px solid rgba(16,185,129,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 20px rgba(16,185,129,0.15);
        }

        .hh-browser-check-link-container {
          background: rgba(16,185,129,0.08);
          border: 1px solid rgba(16,185,129,0.2);
          border-radius: 14px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .hh-browser-check-link-box {
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(16,185,129,0.15);
          border-radius: 10px;
          padding: 12px;
          margin-bottom: 12px;
          overflow-x: auto;
          max-height: 80px;
          overflow-y: auto;
        }

        .hh-browser-check-copy-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          background: linear-gradient(135deg, rgba(16,185,129,0.3), rgba(16,185,129,0.1));
          border: 1px solid rgba(16,185,129,0.3);
          border-radius: 10px;
          color: #10b981;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .hh-browser-check-copy-btn:hover {
          background: linear-gradient(135deg, rgba(16,185,129,0.4), rgba(16,185,129,0.15));
          box-shadow: 0 0 20px rgba(16,185,129,0.3);
          transform: translateY(-2px);
        }

        .hh-browser-check-copy-btn:active {
          transform: scale(0.98);
        }

        .hh-browser-check-copy-copied {
          background: linear-gradient(135deg, rgba(16,185,129,0.5), rgba(16,185,129,0.2));
          color: #10b981;
          box-shadow: 0 0 25px rgba(16,185,129,0.4);
        }

        .hh-browser-check-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(16,185,129,0.2), transparent);
          margin: 20px 0;
        }

        .hh-browser-check-close-btn {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          font-weight: 700;
          font-size: 15px;
          border: none;
          border-radius: 12px;
          padding: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 6px 20px rgba(16,185,129,0.3);
        }

        .hh-browser-check-close-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(16,185,129,0.5);
        }

        .hh-browser-check-close-btn:active {
          transform: scale(0.98);
        }

        /* ─── REDUCED MOTION ─── */
        @media (prefers-reduced-motion: reduce) {
          .hh-bubble, .hh-orb-1, .hh-orb-2,
          .hh-avatar-ring, .hh-live-dot,
          .hh-claim-ready, .hh-claim-shimmer,
          [class*="hh-entry-"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}
"use client"

import type React from "react"
import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CreditCard, Gamepad2, History, Home, Bell, User, Gift, Clock, Headphones, Shield, TrendingUp, Users, Eye, EyeOff, ChevronRight, ExternalLink, Sparkles, Zap, Award, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DashboardImageCarousel } from "@/components/dashboard-image-carousel"
import { WithdrawalNotification } from "@/components/withdrawal-notification"
import { ReferralCard } from "@/components/referral-card"
import { TutorialModal } from "@/components/tutorial-modal"
import { ScrollingText } from "@/components/scrolling-text"
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
    }, 16) // ~60fps
    
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

      // Update state
      setBalance(newBalance)
      setClaimCount(newClaimCount)
      
      // Save to localStorage
      localStorage.setItem("tivexx-claim-count", newClaimCount.toString())
      
      // CRITICAL FIX: Update user data in localStorage
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
        <span className="flex gap-1.5 items-center">
          {[1,2,3].map(i => <span key={i} className="w-8 h-8 bg-zinc-800 rounded-lg animate-pulse"></span>)}
        </span>
      )
    }

    const formatted = new Intl.NumberFormat('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)

    return (
      <span className={`font-mono transition-colors duration-300 ${isBalanceChanging ? 'text-emerald-400' : 'text-white'}`}>
        <span className="text-2xl align-top opacity-50 mr-1">₦</span>
        <span className="text-4xl font-black tracking-tight">
          {formatted.split('.')[0]}
        </span>
        <span className="text-xl opacity-40 ml-1">
          .{formatted.split('.')[1]}
        </span>
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
        console.error(err)
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
      name: "Loans",
      emoji: "💳",
      link: "/loan",
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
    },
    {
      name: "Investments",
      emoji: "📈",
      link: "/investment",
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
    },
    {
      name: "Daily Tasks",
      emoji: "🎁",
      link: "/task",
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
    },
    {
      name: "Flash Gain Channel",
      emoji: "📢",
      link: "https://t.me/helpinghandsnews",
      external: true,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
    },
  ];

  useEffect(() => {
    const storedUser = localStorage.getItem("tivexx-user")

    if (!storedUser) {
      router.push("/login")
      return
    }

    const user = JSON.parse(storedUser)

    const tutorialShown = localStorage.getItem("tivexx-tutorial-shown")
    if (!tutorialShown) setShowTutorial(true)

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
        console.error(error)
        setBalance(user.balance)
        setAnimatedBalance(user.balance)
        setUserData(user)
      }
    }

    fetchUserBalance()

    setTimeout(() => setShowWithdrawalNotification(true), 3000)

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
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b]">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24 bg-[#0a0a0b] text-zinc-100 selection:bg-emerald-500/30 overflow-x-hidden">
      {/* Premium Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[40%] bg-purple-500/5 blur-[100px] rounded-full" />
        <div className="absolute top-[30%] right-[10%] w-1 h-1 bg-white rounded-full animate-pulse shadow-[0_0_10px_white]" />
      </div>

      <ScrollingText />

      <Dialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-sm rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-black">⏰ COOLDOWN</DialogTitle>
            <DialogDescription className="text-center space-y-4 pt-4 text-zinc-400">
              <p>Take a break! You can claim again in:</p>
              <p className="text-4xl font-black text-emerald-400 font-mono">{formatPauseTime()}</p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button onClick={() => { setShowPauseDialog(false); router.push("/refer") }} className="h-14 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-2xl">Refer Friends</Button>
            <Button onClick={() => { setShowPauseDialog(false); router.push("/loan") }} className="h-14 bg-zinc-800 hover:bg-zinc-700 font-bold rounded-2xl border border-zinc-700">Explore Loans</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-sm rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-black">📢 JOIN THE ELITE</DialogTitle>
            <DialogDescription className="text-center pt-4 text-zinc-400">Join our official community for exclusive earning tips.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button onClick={() => { setShowReminderDialog(false); window.open("https://t.me/helpinghandsnews", '_self') }} className="h-14 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-2xl">Join Telegram</Button>
            <Button onClick={() => { setShowReminderDialog(false); router.push("/refer") }} className="h-14 bg-zinc-800 hover:bg-zinc-700 font-bold rounded-2xl">Back to Referral</Button>
          </div>
        </DialogContent>
      </Dialog>

      {showTutorial && (
        <TutorialModal
          onClose={() => {
            setShowTutorial(false)
            localStorage.setItem("tivexx-tutorial-shown", "true")
          }}
        />
      )}

      {showWithdrawalNotification && <WithdrawalNotification onClose={handleCloseWithdrawalNotification} />}

      <div className="max-w-md mx-auto px-4 space-y-6 pt-6 relative z-10">
        {/* User Profile Glass Card */}
        <div className="relative group overflow-hidden rounded-[2rem] border border-white/5 bg-zinc-900/40 backdrop-blur-xl p-6 shadow-2xl transition-all duration-500 hover:border-emerald-500/20">
          <div className="flex items-center gap-4 relative z-10">
            <div className="relative group/avatar">
              <div className="absolute -inset-1 bg-gradient-to-tr from-emerald-500 to-purple-500 rounded-full blur opacity-30 group-hover/avatar:opacity-60 transition duration-500"></div>
              <div className="relative w-16 h-16 rounded-full bg-zinc-950 border-2 border-zinc-800 flex items-center justify-center overflow-hidden">
                {userData?.profilePicture ? (
                  <img src={userData.profilePicture} alt={userData.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-black text-2xl text-emerald-500">{userData?.name.charAt(0)}</span>
                )}
                <input type="file" accept="image/*" onChange={handleProfileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 text-sm font-bold uppercase tracking-widest">Premium Member</span>
                <Sparkles className="w-3 h-3 text-amber-400 fill-amber-400" />
              </div>
              <div className="font-black text-xl text-white truncate">Hi, {displayedName} 👋</div>
              <div className="text-xs text-zinc-500 font-mono mt-1 px-2 py-0.5 bg-black/40 rounded-md w-fit border border-white/5">ID: {userData.userId}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-6 relative z-10">
            <Link href="/loan" className="flex-1">
              <Button className="w-full h-12 bg-zinc-800/80 hover:bg-zinc-700 text-white font-bold rounded-xl border border-white/5 backdrop-blur-sm transition-all active:scale-95">Loan</Button>
            </Link>
            <Link href="/withdraw" className="flex-1">
              <Button className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-xl transition-all active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.2)]">Withdraw</Button>
            </Link>
          </div>
        </div>

        {/* Luxury Balance Glass Card */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-zinc-900 to-black border border-white/10 p-8 shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Wallet className="w-24 h-24 rotate-12" />
          </div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-zinc-500 text-xs font-black uppercase tracking-widest">Total Liquidity</span>
            </div>
            <button onClick={() => setShowBalance(!showBalance)} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/5" >
              {showBalance ? <EyeOff className="w-4 h-4 text-zinc-400" /> : <Eye className="w-4 h-4 text-zinc-400" />}
            </button>
          </div>
          <div className="mb-8">
            {formatCurrency(animatedBalance)}
          </div>
          <div className="relative rounded-3xl bg-zinc-950/50 border border-white/5 p-6 backdrop-blur-md">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <Zap className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Rapid Reward</div>
                  <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Claim ₦1,000 Everyday</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-black text-emerald-400 font-mono tracking-tighter">
                  {pauseEndTime ? formatPauseTime() : formatTime(timeRemaining)}
                </div>
                <div className="text-[10px] font-bold text-zinc-600 uppercase">Ready In</div>
              </div>
            </div>
            <Button onClick={handleClaim} disabled={!canClaim && !pauseEndTime} className={`w-full h-14 relative group overflow-hidden rounded-2xl transition-all duration-300 transform active:scale-95 ${ (canClaim || pauseEndTime) ? 'bg-gradient-to-r from-emerald-600 to-green-500 text-black font-black' : 'bg-zinc-800 text-zinc-500 font-bold' }`} >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <Gift className="w-5 h-5" />
                {pauseEndTime ? `Cooldown Active` : canClaim ? 'Claim Reward' : `Locked: ${formatTime(timeRemaining)}`}
              </span>
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            </Button>
            {showClaimSuccess && (
              <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none px-4">
                <div className="w-full bg-emerald-500 text-black rounded-2xl p-4 shadow-2xl animate-in fade-in zoom-in duration-300 text-center">
                  <div className="font-black text-xl mb-1">SUCCESS! 🎉</div>
                  <div className="text-sm font-bold">+₦1,000 Credited</div>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Progress</span>
              <div className="flex gap-1">
                <span className="text-xs font-bold text-white">{claimCount}</span>
                <span className="text-xs font-bold text-zinc-700">/ 50</span>
              </div>
            </div>
            <div className="mt-2 h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${(claimCount / 50) * 100}%` }}></div>
            </div>
          </div>
        </div>

        {/* Quick Access Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h4 className="text-sm font-black text-zinc-500 uppercase tracking-widest">Operations</h4>
            <div className="h-px flex-1 mx-4 bg-zinc-800/50"></div>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {menuItems.map((item, idx) => {
              const Icon = item.icon
              const content = (
                <div className={`group flex items-center justify-between p-5 rounded-3xl bg-zinc-900/40 border border-white/5 hover:border-emerald-500/20 transition-all duration-300 hover:translate-x-1 active:scale-[0.98]`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl ${item.bgColor} flex items-center justify-center transition-transform group-hover:scale-110`}>
                      {item.emoji ? <span className="text-2xl">{item.emoji}</span> : Icon && <Icon className={`w-6 h-6 ${item.color}`} />}
                    </div>
                    <span className="font-bold text-zinc-300 group-hover:text-white transition-colors">{item.name}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-700 group-hover:text-emerald-500 transition-colors" />
                </div>
              )
              return item.external ? <a key={idx} href={item.link} className="block">{content}</a> : <Link key={idx} href={item.link || "#"} className="block">{content}</Link>
            })}
          </div>
        </div>

        {/* Support & Community */}
        <div className="flex gap-4">
          <Link href="https://t.me/helpinghandsupport" className="flex-1">
            <div className="p-5 rounded-[2rem] bg-zinc-900/40 border border-white/5 flex flex-col items-center gap-2 hover:bg-zinc-800/60 transition-all group">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Headphones className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Support</span>
            </div>
          </Link>
          <Link href="https://t.me/helpinghandsnews" className="flex-1">
            <div className="p-5 rounded-[2rem] bg-zinc-900/40 border border-white/5 flex flex-col items-center gap-2 hover:bg-zinc-800/60 transition-all group">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform relative">
                <Bell className="w-5 h-5 text-amber-400" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
              </div>
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Updates</span>
            </div>
          </Link>
        </div>

        {/* Referral Glass Card */}
        <div className="relative group transition-transform active:scale-[0.99]">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-purple-500 rounded-[2.5rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
          {userData && <ReferralCard userId={userData.id || userData.userId} />}
        </div>

        {/* Activity Feed */}
        <div className="rounded-[2.5rem] bg-zinc-900/40 border border-white/5 p-8 backdrop-blur-md">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-purple-400" />
              <h4 className="font-black text-white text-lg">Activity</h4>
            </div>
            <Link href="/history" className="text-xs font-bold text-emerald-500 hover:text-emerald-400 uppercase tracking-widest">View All</Link>
          </div>
          {transactions && transactions.length > 0 ? (
            <div className="space-y-4">
              {transactions.slice(0, 3).map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'credit' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                      {tx.type === 'credit' ? <TrendingUp className="w-5 h-5 text-emerald-500" /> : <TrendingUp className="w-5 h-5 text-red-500 rotate-180" />}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white leading-none mb-1">{tx.description}</div>
                      <div className="text-[10px] text-zinc-500 font-medium">{new Date(tx.date).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className={`font-black ${tx.type === "credit" ? "text-emerald-400" : "text-red-400"}`}>
                    {tx.type === "credit" ? "+" : "-"}₦{tx.amount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-zinc-700" />
              </div>
              <p className="text-zinc-500 text-sm font-medium">No transactions yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modern Floating Navbar */}
      <div className="fixed bottom-6 left-4 right-4 max-w-md mx-auto z-[100]">
        <div className="bg-zinc-950/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] h-20 flex items-center justify-around px-6 shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
          <Link href="/dashboard" className="flex flex-col items-center gap-1 group">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 transition-all">
              <Home className="h-6 w-6 fill-emerald-500/20" />
            </div>
            <span className="text-[10px] font-black uppercase text-emerald-500 tracking-tighter">Home</span>
          </Link>
          <Link href="/abouttivexx" className="flex flex-col items-center gap-1 text-zinc-600 hover:text-white transition-all">
            <Gamepad2 className="h-6 w-6" />
            <span className="text-[10px] font-black uppercase tracking-tighter">Guide</span>
          </Link>
          <Link href="/refer" className="flex flex-col items-center gap-1 text-zinc-600 hover:text-white transition-all">
            <div className="relative">
              <User className="h-6 w-6" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-tighter">Invite</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'

"use client"

import { useState, useEffect, useRef } from "react"
import { ArrowLeft, CheckCircle2, Clock, Gift, Sparkles, Home, Gamepad2, User, Award, Zap, Crown } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useTaskTimer } from "@/hooks/useTaskTimer"

interface Task {
  id: string
  platform: string
  description: string
  category: string
  reward: number
  link: string
  icon: string
  tier: 'silver' | 'gold' | 'diamond'
}

// Generate 50 tasks with compounding rewards
const generateTieredTasks = (): Task[] => {
  const icons = ['📢', '💬', '🎯', '🎁', '🎡', '💸💲', '🎵', '🤖', '🌐', '📱', '🎬', '🎮', '🎪', '🎨', '🎭', '🎯', '🎲', '🎰', '🏆', '⭐']
  const platforms = ['Monetage', 'Telegram', 'EffectiveGate', 'Spin-to-Win', 'Winners Hub', 'Nova Cash', 'Survey Task', 'CPM Ad', 'Promo Link', 'Click Task']
  const descriptions = ['Tap our premium ad link', 'Join our community', 'Complete offer', 'View promotion', 'Earn extra bonus']
  
  const tasks: Task[] = []
  
  for (let i = 1; i <= 50; i++) {
    // Compounding reward: base 5000 + increase of 100 per task
    const baseReward = 5000 + (i - 1) * 100
    
    tasks.push({
      id: `tiered-task-${i}`,
      platform: `${platforms[i % platforms.length]} Task ${i}`,
      description: descriptions[i % descriptions.length],
      category: ['Ads', 'Tasks', 'Social Media', 'Survey'][i % 4],
      reward: baseReward,
      link: "https://spinwin-iota.vercel.app",
      icon: icons[i % icons.length],
      tier: 'silver'
    })
  }
  
  return tasks
}

const AVAILABLE_TASKS = generateTieredTasks()

export default function TieredTaskPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [completedTasks, setCompletedTasks] = useState<string[]>([])
  const [balance, setBalance] = useState(0)
  const [currentTier, setCurrentTier] = useState<'silver' | 'gold' | 'diamond'>('silver')
  const [verifyingTasks, setVerifyingTasks] = useState<Record<string, {progress: number, startTime: number}>>({})
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({})
  const progressIntervals = useRef<Record<string, NodeJS.Timeout>>({})
  const [showCoinRain, setShowCoinRain] = useState(false)
  const [userId, setUserId] = useState<string>("")

  // Tier stats - only shows 50 tasks per day
  const totalCompleted = completedTasks.length
  const dailyProgress = Math.min((totalCompleted / 50) * 100, 100)
  
  // Load user and tasks with daily reset
  useEffect(() => {
    const storedUser = localStorage.getItem("tivexx-user")
    if (!storedUser) {
      router.push("/login")
      return
    }

    const user = JSON.parse(storedUser)
    setBalance(user.balance || 0)
    setUserId(user.id || user.userId || user.user_id || "")

    // Check for daily reset
    const lastTaskDate = localStorage.getItem("tivexx-tiered-task-date")
    const today = new Date().toDateString()
    
    if (lastTaskDate !== today) {
      // New day: reset tasks, check if 50 were completed yesterday (auto-upgrade)
      const previousCompleted = JSON.parse(localStorage.getItem("tivexx-tiered-completed-tasks") || "[]")
      
      // If user completed 50 tasks yesterday, upgrade tier
      if (previousCompleted.length >= 50) {
        const currentTier = localStorage.getItem("tivexx-tiered-current-tier") || 'silver'
        let nextTier: 'silver' | 'gold' | 'diamond' = 'silver'
        if (currentTier === 'silver') nextTier = 'gold'
        else if (currentTier === 'gold') nextTier = 'diamond'
        
        localStorage.setItem("tivexx-tiered-current-tier", nextTier)
        setCurrentTier(nextTier)
        
        toast({
          title: `⭐ Tier Upgraded to ${nextTier.toUpperCase()}!`,
          description: "You've completed all 50 tasks! You've advanced to the next tier.",
        })
      }
      
      // Reset tasks for new day
      setCompletedTasks([])
      localStorage.setItem("tivexx-tiered-completed-tasks", JSON.stringify([]))
      localStorage.setItem("tivexx-tiered-task-date", today)
    } else {
      // Same day: load existing progress
      const completed = JSON.parse(localStorage.getItem("tivexx-tiered-completed-tasks") || "[]")
      setCompletedTasks(Array.isArray(completed) ? completed : [])
    }

    const tier = localStorage.getItem("tivexx-tiered-current-tier") || 'silver'
    setCurrentTier(tier as 'silver' | 'gold' | 'diamond')

    const savedCooldowns = JSON.parse(localStorage.getItem("tivexx-tiered-cooldowns") || "{}")
    setCooldowns(savedCooldowns)
  }, [router, toast])

  // Initialize task timer hook
  const { attachFocusListener, startTaskTimer } = useTaskTimer()

  // Clean up intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(progressIntervals.current).forEach(interval => {
        clearInterval(interval)
      })
    }
  }, [])

  // Set up focus listener on mount
  useEffect(() => {
    const detach = attachFocusListener(
      (taskId: string, elapsed: number) => {
        if (!completedTasks.includes(taskId)) {
          completeVerification(taskId)
          toast({
            title: "Task Completed 🎉",
            description: "Reward has been added to your balance!",
          })
        }
      },
      (taskId: string, elapsed: number) => {
        setVerifyingTasks(prev => {
          const newState = { ...prev }
          delete newState[taskId]
          return newState
        })
        
        if (progressIntervals.current[taskId]) {
          clearInterval(progressIntervals.current[taskId])
          delete progressIntervals.current[taskId]
        }
        
        const timeSpent = Math.round(elapsed)
        toast({
          title: "You didn't interact with the task ❌",
          description: `You only spent ${timeSpent}s outside. Please tap the task again and stay on the page for at least 20 seconds before coming back.`,
          variant: "destructive",
          duration: 6000,
        })
      },
      (taskId: string) => {
        return completedTasks.includes(taskId)
      }
    )
    return detach
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedTasks, toast])

  // Start progress animation for a specific task
  const startProgressAnimation = (taskId: string) => {
    if (progressIntervals.current[taskId]) {
      clearInterval(progressIntervals.current[taskId])
    }
    
    const startTime = Date.now()
    
    setVerifyingTasks(prev => ({
      ...prev,
      [taskId]: {
        progress: 0,
        startTime
      }
    }))
    
    const interval = setInterval(() => {
      setVerifyingTasks(prev => {
        if (!prev[taskId]) return prev
        
        const elapsed = (Date.now() - prev[taskId].startTime) / 1000
        const newProgress = Math.min((elapsed / 20) * 100, 100)
        
        if (newProgress >= 100) {
          clearInterval(progressIntervals.current[taskId])
          delete progressIntervals.current[taskId]
        }
        
        return {
          ...prev,
          [taskId]: {
            ...prev[taskId],
            progress: newProgress
          }
        }
      })
    }, 1000)
    
    progressIntervals.current[taskId] = interval
  }

  // Countdown for cooldowns
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now()
      const updated = { ...cooldowns }
      let changed = false

      Object.keys(updated).forEach((key) => {
        if (updated[key] > now) {
          updated[key] -= 1000
          changed = true
        } else {
          delete updated[key]
          changed = true
        }
      })

      if (changed) {
        setCooldowns({ ...updated })
        localStorage.setItem("tivexx-tiered-cooldowns", JSON.stringify(updated))
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldowns])

  const getNextResetBoundary = (date: Date) => {
    const boundary = new Date(date)
    boundary.setHours(boundary.getHours() + 12)
    return boundary
  }

  const completeVerification = async (taskId: string) => {
    const task = AVAILABLE_TASKS.find((t) => t.id === taskId)
    if (!task) return

    const newBalance = balance + task.reward
    setBalance(newBalance)

    const storedUser = localStorage.getItem("tivexx-user")
    if (storedUser) {
      const user = JSON.parse(storedUser)
      user.balance = newBalance
      localStorage.setItem("tivexx-user", JSON.stringify(user))
      try {
        await fetch(`/api/user-balance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id || user.user_id || user.userId, balance: newBalance }),
        })
      } catch (err) {
        console.error("Failed to sync user balance to server:", err)
      }

      try {
        await fetch(`/api/track-task`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id || user.user_id || user.userId,
            taskId: task.id,
            taskName: task.platform,
            reward: task.reward,
          }),
        })
      } catch (err) {
        console.error("Failed to track task completion:", err)
      }
    }

    const newCompleted = [...completedTasks, task.id]
    setCompletedTasks(newCompleted)
    localStorage.setItem("tivexx-tiered-completed-tasks", JSON.stringify(newCompleted))

    const now = new Date()
    const nextReset = getNextResetBoundary(now).getTime()
    const newCooldowns = { ...cooldowns, [task.id]: nextReset }
    setCooldowns(newCooldowns)
    localStorage.setItem("tivexx-tiered-cooldowns", JSON.stringify(newCooldowns))

    setVerifyingTasks(prev => {
      const newState = { ...prev }
      delete newState[taskId]
      return newState
    })
    
    if (progressIntervals.current[taskId]) {
      clearInterval(progressIntervals.current[taskId])
      delete progressIntervals.current[taskId]
    }

    // Check if user completed all 50 tasks for the day
    if (newCompleted.length === 50) {
      toast({
        title: "🎉 All 50 Tasks Complete!",
        description: "You'll upgrade to the next tier tomorrow!",
      })
    }

    toast({
      title: "Reward Credited 🎉",
      description: `₦${task.reward.toLocaleString()} has been added to your balance.`,
    })

    setShowCoinRain(true)
    setTimeout(() => setShowCoinRain(false), 3000)
  }

  const handleTaskClick = (task: Task) => {
    if (completedTasks.includes(task.id)) {
      toast({
        title: "Task Already Completed",
        description: "You have already earned the reward for this task.",
        variant: "destructive",
      })
      return
    }

    if (cooldowns[task.id] && cooldowns[task.id] > Date.now()) {
      toast({
        title: "Task on Cooldown",
        description: "This task resets at the next 12-hour interval.",
        variant: "destructive",
      })
      return
    }

    if (!task.link) {
      toast({
        title: "No link set",
        description: "This task doesn't have a link yet. Please add one before attempting.",
        variant: "destructive",
      })
      return
    }

    confirmStartTask(task)
  }

  const confirmStartTask = (task: Task) => {
    toast({
      title: "Task Started ⏱️",
      description: "Make sure to spend at least 20 seconds on the site before returning. If you return too quickly, you'll need to try again!",
      duration: 5000,
    })

    startProgressAnimation(task.id)
    try {
      startTaskTimer(task.id)
    } catch (e) {
      console.error("Failed to start task timer:", e)
    }

    window.location.href = task.link
  }

  const formatTime = (ms: number) => {
    if (ms <= 0) return "now"
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    
    const displayHours = hours % 12 || (hours > 0 ? 12 : 0)
    
    return `${displayHours > 0 ? displayHours + "h " : ""}${minutes}m ${seconds}s`
  }

  const getTierColor = (tier: string) => {
    switch(tier) {
      case 'silver': return 'text-gray-300'
      case 'gold': return 'text-yellow-400'
      case 'diamond': return 'text-blue-400'
      default: return 'text-white'
    }
  }

  const getTierBgColor = (tier: string) => {
    switch(tier) {
      case 'silver': return 'bg-gray-500/20 border-gray-500/30'
      case 'gold': return 'bg-yellow-500/20 border-yellow-500/30'
      case 'diamond': return 'bg-blue-500/20 border-blue-500/30'
      default: return 'bg-gray-500/20'
    }
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

      {/* Coin Rain Animation */}
      {showCoinRain && (
        <div className="coin-rain">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="coin"
              style={{
                left: `${Math.random() * 100}vw`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
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
              <h1 className="hh-title">Tiered Tasks</h1>
              <p className="hh-subtitle">Earn by tier progression & compounding rewards</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 space-y-4 pt-2 relative z-10 pb-6">

        {/* Tier Status Card */}
        <div className="hh-card hh-card-hero hh-entry-1 relative overflow-hidden">
          <div className="hh-orb hh-orb-1" aria-hidden="true"></div>
          <div className="hh-orb hh-orb-2" aria-hidden="true"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="hh-icon-ring">
                <Crown className="h-5 w-5 text-amber-300" />
              </div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Tier System</span>
            </div>
            
            <div className="mb-4">
              <div className="text-2xl font-black capitalize mb-2">
                <span className={getTierColor(currentTier)}>
                  {currentTier === 'diamond' ? '💎' : currentTier === 'gold' ? '⭐' : '🌙'} {currentTier} Tier
                </span>
              </div>
              <p className="text-white/70 text-sm">
                Complete {totalCompleted}/50 tasks today to upgrade to next tier
              </p>
            </div>

            {/* Daily Progress Bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-300">Today's Tasks</span>
                <span className="text-sm font-bold text-emerald-400">{totalCompleted}/50</span>
              </div>
              <div className="h-3 bg-gray-900/50 rounded-full overflow-hidden border border-emerald-500/30">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${dailyProgress}%` }}
                ></div>
              </div>
              {totalCompleted === 50 && (
                <div className="mt-2 text-sm font-bold text-emerald-400">
                  ✅ Today's tasks complete! You'll upgrade tomorrow.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Card */}
        <div className="hh-card hh-entry-1 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="hh-icon-ring">
                <Zap className="h-5 w-5 text-amber-300" />
              </div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Today's Earnings</span>
            </div>
            
            <p className="text-white/80 text-sm mb-4">
              💰 Earn compounding rewards! Each task increases. Complete all 50 to upgrade, or withdraw anytime with your current balance.
            </p>

            <div className="hh-stats-row">
              <div className="hh-stat-item">
                <div className="hh-stat-label">Tasks Left</div>
                <div className="hh-stat-value text-emerald-400">{50 - totalCompleted}</div>
              </div>
              <div className="hh-stat-divider"></div>
              <div className="hh-stat-item">
                <div className="hh-stat-label">Completed</div>
                <div className="hh-stat-value text-amber-300">{totalCompleted}</div>
              </div>
            </div>

            <Link href="/withdraw" className="block mt-4">
              <button className="w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all">
                💵 Withdraw Anytime
              </button>
            </Link>
          </div>
        </div>

        {/* Tasks Grid */}
        <div className="space-y-4">
          {AVAILABLE_TASKS.map((task, index) => {
            const isVerifying = verifyingTasks[task.id] !== undefined
            const progress = isVerifying ? verifyingTasks[task.id].progress : 0
            const cooldown = cooldowns[task.id]
            const isCompleted = completedTasks.includes(task.id)
            const isPending = verifyingTasks[task.id] !== undefined
            const isProcessing = isVerifying
            const timeLeft = cooldown ? cooldown - Date.now() : 0

            return (
              <div
                key={task.id}
                className={`hh-task-card hh-entry-${(index % 3) + 2}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="hh-task-header">
                  <div className="flex items-center gap-3">
                    <div className="hh-task-icon">
                      <span className="text-2xl">{task.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="hh-task-title">{task.platform}</h3>
                      <p className="hh-task-desc">{task.description}</p>
                    </div>
                  </div>
                </div>

                <div className="hh-task-body">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="hh-reward-badge">
                        <Gift className="h-3 w-3" />
                        ₦{task.reward.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-500">reward</span>
                    </div>
                    
                    {isCompleted && !isPending && (
                      <span className="hh-status-badge hh-status-completed">
                        <CheckCircle2 className="h-3 w-3" />
                        Claimed
                      </span>
                    )}
                    
                    {isPending && (
                      <span className="hh-status-badge hh-status-pending">
                        <Clock className="h-3 w-3" />
                        Pending
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleTaskClick(task)}
                    disabled={isCompleted || isProcessing}
                    className={`hh-task-btn ${
                      isCompleted
                        ? 'hh-task-btn-completed'
                        : isPending
                        ? 'hh-task-btn-pending'
                        : isProcessing
                        ? 'hh-task-btn-processing'
                        : 'hh-task-btn-available'
                    }`}
                  >
                    {isProcessing ? 'Processing...' : 
                     isPending ? 'Verify & Claim' : 
                     isCompleted ? 'Claimed Today' : 
                     'Claim Now'}
                  </button>

                  {isVerifying && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-400">Verifying task</span>
                        <span className="text-emerald-400 font-bold">{Math.floor(progress)}%</span>
                      </div>
                      <div className="hh-progress-track">
                        <div 
                          className="hh-progress-fill hh-progress-verify" 
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {cooldown && timeLeft > 0 && (
                    <div className="mt-3 hh-cooldown">
                      <Clock className="h-3 w-3" />
                      <span>Available in: {formatTime(timeLeft)}</span>
                    </div>
                  )}
                </div>

                {task.link && (
                  <div className="hh-task-warning">
                    <span className="text-amber-400 font-bold mr-1">⚠️</span>
                    <span>Interact with the task for at least 20 seconds before you can claim the reward.</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Tier Upgrade Notice */}
        <div className="hh-card hh-tip-card hh-entry-6">
          <div className="flex items-start gap-3">
            <div className="hh-tip-icon">
              <Sparkles className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">💡 How It Works</h4>
              <p className="text-sm text-emerald-200/80">
                📈 Complete 50 daily tasks to upgrade to next tier • 💰 Withdraw anytime with current earnings • 📦 Rewards compound (increase per task)
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

        /* ─── STATS ROW ─── */
        .hh-stats-row {
          display: flex;
          align-items: center;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 12px 16px;
        }

        .hh-stat-item {
          flex: 1;
          text-align: center;
        }

        .hh-stat-divider {
          width: 1px;
          height: 32px;
          background: rgba(255,255,255,0.08);
        }

        .hh-stat-label {
          font-size: 11px;
          color: #6b7280;
          font-weight: 500;
        }

        .hh-stat-value {
          font-size: 14px;
          font-weight: 800;
          margin-top: 2px;
        }

        /* ─── TASK CARDS ─── */
        .hh-task-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          overflow: hidden;
          transition: all 0.3s ease;
          animation: hh-card-appear 0.4s ease-out both;
        }

        .hh-task-card:hover {
          transform: translateY(-2px);
          border-color: rgba(16,185,129,0.3);
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }

        .hh-task-header {
          padding: 16px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .hh-task-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(16,185,129,0.1), rgba(245,158,11,0.1));
          border: 1px solid rgba(16,185,129,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hh-task-title {
          font-weight: 700;
          color: white;
          font-size: 15px;
          margin-bottom: 4px;
        }

        .hh-task-desc {
          font-size: 12px;
          color: rgba(255,255,255,0.5);
        }

        .hh-task-body {
          padding: 16px;
        }

        .hh-reward-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(16,185,129,0.15);
          border: 1px solid rgba(16,185,129,0.3);
          border-radius: 8px;
          padding: 4px 12px;
          font-size: 13px;
          font-weight: 700;
          color: #10b981;
        }

        .hh-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 8px;
        }

        .hh-status-completed {
          background: rgba(16,185,129,0.15);
          color: #10b981;
          border: 1px solid rgba(16,185,129,0.3);
        }

        .hh-status-pending {
          background: rgba(245,158,11,0.15);
          color: #f59e0b;
          border: 1px solid rgba(245,158,11,0.3);
        }

        .hh-task-btn {
          width: 100%;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid transparent;
          font-weight: 700;
          font-size: 14px;
          transition: all 0.25s ease;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .hh-task-btn-available {
          background: linear-gradient(135deg, rgba(16,185,129,0.8), rgba(52,211,153,0.8));
          color: white;
          border-color: rgba(16,185,129,0.5);
        }

        .hh-task-btn-available:hover {
          background: linear-gradient(135deg, rgba(16,185,129,0.9), rgba(52,211,153,0.9));
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(16,185,129,0.3);
        }

        .hh-task-btn-available:active {
          transform: scale(0.98);
        }

        .hh-task-btn-completed {
          background: rgba(107,114,128,0.3);
          color: #9ca3af;
          border-color: rgba(107,114,128,0.2);
          cursor: not-allowed;
        }

        .hh-task-btn-pending {
          background: linear-gradient(135deg, rgba(245,158,11,0.8), rgba(251,191,36,0.8));
          color: white;
          border-color: rgba(245,158,11,0.5);
        }

        .hh-task-btn-pending:hover {
          background: linear-gradient(135deg, rgba(245,158,11,0.9), rgba(251,191,36,0.9));
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(245,158,11,0.3);
        }

        .hh-task-btn-processing {
          background: rgba(139,92,246,0.5);
          color: white;
          border-color: rgba(139,92,246,0.3);
          cursor: not-allowed;
        }

        .hh-progress-track {
          width: 100%;
          height: 6px;
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.05);
        }

        .hh-progress-fill {
          height: 100%;
          transition: width 0.25s ease;
        }

        .hh-progress-verify {
          background: linear-gradient(90deg, rgba(16,185,129,0.6), rgba(52,211,153,0.8));
          box-shadow: 0 0 8px rgba(16,185,129,0.4);
        }

        .hh-cooldown {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #f59e0b;
          padding: 8px 12px;
          background: rgba(245,158,11,0.1);
          border-radius: 8px;
          border: 1px solid rgba(245,158,11,0.2);
        }

        .hh-task-warning {
          padding: 8px 12px;
          margin-top: 12px;
          background: rgba(245,158,11,0.08);
          border-left: 3px solid #f59e0b;
          border-radius: 0 8px 8px 0;
          font-size: 12px;
          color: #fcd34d;
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }

        /* ─── TIP CARD ─── */
        .hh-tip-card {
          background: linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(245,158,11,0.1) 100%);
          border-color: rgba(245,158,11,0.2);
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
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(180deg, rgba(5,13,20,0) 0%, rgba(5,13,20,0.95) 50%, rgba(5,13,20,0.98) 100%);
          border-top: 1px solid rgba(255,255,255,0.08);
          display: flex;
          justify-content: space-around;
          align-items: center;
          height: 80px;
          max-width: 500px;
          left: 50%;
          transform: translateX(-50%);
          backdrop-filter: blur(12px);
          z-index: 50;
          padding-bottom: max(16px, env(safe-area-inset-bottom));
        }

        .hh-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          color: rgba(255,255,255,0.6);
          transition: all 0.2s ease;
          text-decoration: none;
          font-size: 11px;
          font-weight: 600;
        }

        .hh-nav-item:hover {
          color: #10b981;
          transform: scale(1.1);
        }

        /* ─── ANIMATIONS ─── */
        @keyframes hh-card-appear {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .hh-entry-1 { animation-delay: 100ms; }
        .hh-entry-2 { animation-delay: 200ms; }
        .hh-entry-3 { animation-delay: 300ms; }
        .hh-entry-4 { animation-delay: 400ms; }
        .hh-entry-5 { animation-delay: 500ms; }
        .hh-entry-6 { animation-delay: 600ms; }

        /* ─── COIN RAIN ─── */
        .coin-rain {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 40;
        }

        .coin {
          position: absolute;
          width: 20px;
          height: 20px;
          background: radial-gradient(circle at 30% 30%, #fbbf24, #f59e0b);
          border-radius: 50%;
          opacity: 0.9;
          animation: coin-fall 3s ease-in forwards;
          box-shadow: 0 0 10px rgba(251,191,36,0.5);
        }

        @keyframes coin-fall {
          0% { transform: translateY(-10px) rotateZ(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotateZ(360deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

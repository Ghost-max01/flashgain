"use client";

import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Gift,
  Sparkles,
  TrendingUp,
  Home,
  Gamepad2,
  User,
  Award,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useTaskTimer } from "@/hooks/useTaskTimer";

interface Task {
  id: string;
  platform: string;
  description: string;
  category: string;
  reward: number;
  link: string;
  icon: string;
}

const TASK_COOLDOWN_MS = 12 * 60 * 60 * 1000;

const AVAILABLE_TASKS: Task[] = [
  {
    id: "Monetage-our-most-earned-spin-to-win-ad.",
    platform: "Monetage Spin-to-Win Ad",
    description: "Tap our premium ad link for extra rewards.",
    category: "Ads",
    reward: 5000,
    link: "https://spin-to-win-hub-6676aed7-phi.vercel.app/",
    icon: "📢",
  },
  {
    id: "Telegram Channel Task 01",
    platform: "Bloggersin Promo",
    description: "Tap our premium ad link for extra rewards",
    category: "Tasks",
    reward: 5000,
    link: "https://spin-to-win-hub-6676aed7-phi.vercel.app/",
    icon: "💬",
  },
  {
    id: "effectivegatecpm-ad",
    platform: "EffectiveGate CPM Ad",
    description: "Tap our ad link to earn Extra money",
    category: "Advertisement",
    reward: 5000,
    link: "https://otieu.com/4/10575212",
    icon: "🎯",
  },
  {
    id: "effectivegatecpm-ad-2",
    platform: "EffectiveGate Offer",
    description: "Tap our premium ad link for extra rewards",
    category: "Advertisement",
    reward: 5000,
    link: "https://omg10.com/4/10676426",
    icon: "🎁",
  },
  {
    id: "spin-to-win-hub",
    platform: "Spin-to-Win Hub",
    description: "Tap our premium ad link for extra rewards",
    category: "Advertisement",
    reward: 5000,
    link: "https://spin-to-win-hub-6676aed7-phi.vercel.app/",
    icon: "🎡",
  },
  {
    id: "Winners hub",
    platform: "Winners Hub Promo",
    description: "Tap our ad link to earn Extra money",
    category: "Advertisement",
    reward: 5000,
    link: "https://omg10.com/4/10676426",
    icon: "💸💲",
  },
  {
    id: "Join Nova Cash",
    platform: "Quick Survey Task",
    description: "Join Nova Cash",
    category: "Tasks",
    reward: 5000,
    link: "https://spin-to-win-hub-6676aed7-phi.vercel.app/",
    icon: "🎵",
  },
  {
    id: "Telegram Channel Task 02",
    platform: "COMMUNITY TELEGRAM CHANNEL 1",
    description: "Tap our premium ad link for extra rewards",
    category: "Social Media",
    reward: 5000,
    link: "https://otieu.com/4/10575212",
    icon: "🤖",
  },
  {
    id: "facebook page",
    platform: "COMMUNITY TELEGRAM CHANNEL 2",
    description: "Tap our premium ad link for extra rewards",
    category: "Social Media",
    reward: 5000,
    link: "https://creditbuzz.online",
    icon: "🎁",
  },
  {
    id: "Task 03",
    platform: "COMMUNITY TELEGRAM CHANNEL 3",
    description: "Tap our premium ad link for extra rewards",
    category: "Social Media",
    reward: 5000,
    link: "https://omg10.com/4/10676426",
    icon: "🌐",
  },
];

export default function TaskPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [balance, setBalance] = useState(0);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [showCoinRain, setShowCoinRain] = useState(false);

  // Tasks where user has clicked "Claim Now" and we're waiting for them to return
  const [activeTasks, setActiveTasks] = useState<Set<string>>(new Set());
  // Tasks where they've returned and spent >=10s (or timer completed) → ready to claim
  const [claimReadyTasks, setClaimReadyTasks] = useState<Set<string>>(
    new Set(),
  );
  // For showing the "Spend 10s" popup temporarily
  const [shortPopupTasks, setShortPopupTasks] = useState<Set<string>>(
    new Set(),
  );

  // Ref to hold cleanup from focus listener
  const focusListenerCleanupRef = useRef<(() => void) | null>(null);
  // Ref to hold interval for progress updates
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize task timer hook
  const { attachFocusListener, startTaskTimer } = useTaskTimer();

  // Load user and tasks
  useEffect(() => {
    const storedUser = localStorage.getItem("tivexx-user");
    if (!storedUser) {
      router.push("/login");
      return;
    }

    const user = JSON.parse(storedUser);
    setBalance(user.balance || 0);

    const completed = JSON.parse(
      localStorage.getItem("tivexx-completed-tasks") || "[]",
    );
    const savedCooldowns = JSON.parse(
      localStorage.getItem("tivexx-task-cooldowns") || "{}",
    );
    const now = Date.now();

    const activeCooldowns = Object.fromEntries(
      Object.entries(savedCooldowns).filter(
        ([, expiry]) => Number(expiry) > now,
      ),
    ) as Record<string, number>;

    const activeCompleted = completed.filter(
      (taskId: string) => activeCooldowns[taskId],
    );

    setCompletedTasks(activeCompleted);
    setCooldowns(activeCooldowns);
    localStorage.setItem(
      "tivexx-completed-tasks",
      JSON.stringify(activeCompleted),
    );
    localStorage.setItem(
      "tivexx-task-cooldowns",
      JSON.stringify(activeCooldowns),
    );

    // Restore active tasks from sessionStorage (tasks that haven't been claimed yet)
    const active = new Set<string>();
    const ready = new Set<string>();
    for (const task of AVAILABLE_TASKS) {
      const startTimeStr = sessionStorage.getItem(`task_start_${task.id}`);
      if (startTimeStr) {
        const startTime = parseInt(startTimeStr, 10);
        if (!isNaN(startTime)) {
          const elapsed = (now - startTime) / 1000;
          if (elapsed >= 10) {
            ready.add(task.id);
          } else {
            active.add(task.id);
          }
        }
      }
    }
    setActiveTasks(active);
    setClaimReadyTasks(ready);
  }, [router]);

  // Set up focus listener
  useEffect(() => {
    const handleTaskSuccess = (taskId: string) => {
      // Called when user returns after >=10s
      setClaimReadyTasks((prev) => new Set(prev).add(taskId));
      setActiveTasks((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
      sessionStorage.removeItem(`task_start_${taskId}`);
      toast({
        title: "Task Done ✅",
        description: "Tap the button to claim your reward.",
      });
    };

    const handleTaskIncomplete = (taskId: string, elapsed: number) => {
      // Called when user returns but spent <10s
      setActiveTasks((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
      sessionStorage.removeItem(`task_start_${taskId}`);
      if (elapsed < 2) {
        toast({
          title: "You didn't interact with the task ❌",
          description: `You only spent ${Math.round(elapsed)}s outside. Please tap the task again and stay on the page for at least 10 seconds before coming back.`,
          variant: "destructive",
          duration: 6000,
        });
      } else {
        toast({
          title: "Almost there ⏱️",
          description: `You spent ${Math.round(elapsed)}s — you need 10 seconds for a successful reward. Please try again.`,
        });
      }
    };

    const isTaskCompleted = (taskId: string) => {
      return completedTasks.includes(taskId);
    };

    const cleanup = attachFocusListener(
      handleTaskSuccess,
      handleTaskIncomplete,
      isTaskCompleted,
    );
    focusListenerCleanupRef.current = cleanup;

    return cleanup;
  }, [attachFocusListener, completedTasks, toast]);

  // Update progress display (visual only) every second
  useEffect(() => {
    if (activeTasks.size === 0) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      return;
    }

    const updateProgress = () => {
      const now = Date.now();
      const newReady = new Set(claimReadyTasks);
      let changed = false;

      for (const taskId of activeTasks) {
        const startTimeStr = sessionStorage.getItem(`task_start_${taskId}`);
        if (!startTimeStr) continue;
        const startTime = parseInt(startTimeStr, 10);
        if (isNaN(startTime)) continue;
        const elapsed = (now - startTime) / 1000;
        if (elapsed >= 10) {
          newReady.add(taskId);
          changed = true;
          sessionStorage.removeItem(`task_start_${taskId}`);
        }
      }

      if (changed) {
        setClaimReadyTasks(newReady);
        setActiveTasks((prev) => {
          const next = new Set(prev);
          for (const id of newReady) next.delete(id);
          return next;
        });
      }
    };

    updateProgress();
    progressIntervalRef.current = setInterval(updateProgress, 1000);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [activeTasks, claimReadyTasks]);

  // Countdown for cooldowns
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const updated = { ...cooldowns };
      const expiredTaskIds: string[] = [];

      Object.keys(updated).forEach((key) => {
        if (updated[key] <= now) {
          delete updated[key];
          expiredTaskIds.push(key);
        }
      });

      if (expiredTaskIds.length > 0) {
        setCooldowns({ ...updated });
        localStorage.setItem("tivexx-task-cooldowns", JSON.stringify(updated));

        const nextCompleted = completedTasks.filter(
          (taskId) => !expiredTaskIds.includes(taskId),
        );
        if (nextCompleted.length !== completedTasks.length) {
          setCompletedTasks(nextCompleted);
          localStorage.setItem(
            "tivexx-completed-tasks",
            JSON.stringify(nextCompleted),
          );
          toast({
            title: "Tasks Refreshed 🔄",
            description: "Some tasks are now available again!",
          });
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldowns, completedTasks, toast]);

  const completeVerification = async (taskId: string) => {
    const task = AVAILABLE_TASKS.find((t) => t.id === taskId);
    if (!task) return;

    // Remove from ready and active sets
    setClaimReadyTasks((prev) => {
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });
    setActiveTasks((prev) => {
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });

    const newBalance = balance + task.reward;
    setBalance(newBalance);

    const storedUser = localStorage.getItem("tivexx-user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      user.balance = newBalance;
      localStorage.setItem("tivexx-user", JSON.stringify(user));
      try {
        await fetch(`/api/user-balance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id || user.user_id || user.userId,
            balance: newBalance,
          }),
        });
      } catch (err) {
        console.error("Failed to sync user balance to server:", err);
      }
    }

    const newCompleted = [...completedTasks, task.id];
    setCompletedTasks(newCompleted);
    localStorage.setItem(
      "tivexx-completed-tasks",
      JSON.stringify(newCompleted),
    );

    const cooldownExpiry = Date.now() + TASK_COOLDOWN_MS;
    const newCooldowns = { ...cooldowns, [task.id]: cooldownExpiry };
    setCooldowns(newCooldowns);
    localStorage.setItem("tivexx-task-cooldowns", JSON.stringify(newCooldowns));

    toast({
      title: "Reward Credited 🎉",
      description: `₦${task.reward.toLocaleString()} has been added to your balance.`,
    });

    setShowCoinRain(true);
    setTimeout(() => setShowCoinRain(false), 3000);
  };

  const handleTaskClick = (task: Task) => {
    // 1. If claim ready → complete immediately
    if (claimReadyTasks.has(task.id)) {
      completeVerification(task.id);
      return;
    }

    // 2. If already completed (on cooldown)
    if (completedTasks.includes(task.id)) {
      toast({
        title: "Task Already Completed",
        description: "You have already earned the reward for this task.",
        variant: "destructive",
      });
      return;
    }

    // 3. If on cooldown
    if (cooldowns[task.id] && cooldowns[task.id] > Date.now()) {
      toast({
        title: "Task on Cooldown",
        description: "You can only do this task once every 12 hours.",
        variant: "destructive",
      });
      return;
    }

    // 4. If task is active (button says "Task Done ✅") → check elapsed time
    if (activeTasks.has(task.id)) {
      const startTimeStr = sessionStorage.getItem(`task_start_${task.id}`);
      if (startTimeStr) {
        const startTime = parseInt(startTimeStr, 10);
        const elapsed = (Date.now() - startTime) / 1000;

        if (elapsed >= 10) {
          // Should have been caught by claimReady, but just in case
          completeVerification(task.id);
        } else {
          // Show popup indicating not enough time
          setShortPopupTasks((prev) => new Set(prev).add(task.id));
          setTimeout(() => {
            setShortPopupTasks((prev) => {
              const next = new Set(prev);
              next.delete(task.id);
              return next;
            });
          }, 2000);
          toast({
            title: "Spend 10s on the task first ⏱️",
            description: `You've only spent ${Math.round(elapsed)} seconds. Stay on the external page for at least 10 seconds before claiming.`,
            variant: "destructive",
          });
        }
      } else {
        // No start time found, clean up state
        setActiveTasks((prev) => {
          const next = new Set(prev);
          next.delete(task.id);
          return next;
        });
      }
      return;
    }

    // 5. Start new task
    confirmStartTask(task);
  };

  const confirmStartTask = (task: Task) => {
    toast({
      title: "Task Started ⏱️",
      description:
        "Make sure to spend at least 10 seconds on the site before returning. If you return too quickly, you'll need to try again!",
      duration: 5000,
    });

    const now = Date.now();
    sessionStorage.setItem(`task_start_${task.id}`, now.toString());
    setActiveTasks((prev) => new Set(prev).add(task.id));

    try {
      startTaskTimer(task.id);
    } catch (e) {
      console.error("Failed to start task timer:", e);
    }

    // Open link in same tab so visibilitychange/blur fires reliably on return
    window.open(task.link, "_self");
  };

  const formatTime = (ms: number) => {
    if (ms <= 0) return "now";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours > 0 ? hours + "h " : ""}${minutes}m ${seconds}s`;
  };

  // Helper to get progress percentage for display
  const getTaskProgress = (taskId: string): number => {
    if (claimReadyTasks.has(taskId)) return 100;
    const startTimeStr = sessionStorage.getItem(`task_start_${taskId}`);
    if (!startTimeStr) return 0;
    const startTime = parseInt(startTimeStr, 10);
    if (isNaN(startTime)) return 0;
    const elapsed = (Date.now() - startTime) / 1000;
    return Math.min((elapsed / 10) * 100, 100);
  };

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
              <h1 className="hh-title">Daily Tasks</h1>
              <p className="hh-subtitle">Complete tasks & earn rewards</p>
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
            <div className="flex items-center gap-2 mb-3">
              <div className="hh-icon-ring">
                <Zap className="h-5 w-5 text-amber-300" />
              </div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Earn Extra Rewards
              </span>
            </div>

            <p className="text-white/80 text-sm">
              Complete tasks to earn bonus credits and boost your earnings
            </p>

            <div className="hh-stats-row mt-4">
              <div className="hh-stat-item">
                <div className="hh-stat-label">Tasks Available</div>
                <div className="hh-stat-value text-emerald-400">
                  {AVAILABLE_TASKS.length - completedTasks.length}
                </div>
              </div>
              <div className="hh-stat-divider"></div>
              <div className="hh-stat-item">
                <div className="hh-stat-label">Completed</div>
                <div className="hh-stat-value text-amber-300">
                  {completedTasks.length}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-4">
          {AVAILABLE_TASKS.map((task, index) => {
            const isClaimReady = claimReadyTasks.has(task.id);
            const isActive = activeTasks.has(task.id);
            const isCompleted = completedTasks.includes(task.id);
            const cooldown = cooldowns[task.id];
            const timeLeft = cooldown ? cooldown - Date.now() : 0;
            const progress = isActive
              ? getTaskProgress(task.id)
              : isClaimReady
                ? 100
                : 0;
            const showShortPopup = shortPopupTasks.has(task.id);

            // Button text and style exactly as original
            let buttonText = "Claim Now";
            let buttonDisabled = false;
            let buttonClass = "hh-task-btn-available";

            if (isCompleted) {
              buttonText = "On Cooldown";
              buttonDisabled = true;
              buttonClass = "hh-task-btn-completed";
            } else if (isClaimReady) {
              buttonText = "Task Done ✅ • Claim Reward";
              buttonClass = "hh-task-btn-ready";
            } else if (isActive) {
              buttonText = "Task Done ✅";
              buttonClass = "hh-task-btn-pending";
            }

            return (
              <div
                key={task.id}
                className={`hh-task-card hh-entry-${(index % 3) + 2} relative`}
                style={{ animationDelay: `${index * 100}ms` }}
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
                        <Gift className="h-3 w-3" />₦
                        {task.reward.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-500">reward</span>
                    </div>

                    {isCompleted && (
                      <span className="hh-status-badge hh-status-completed">
                        <CheckCircle2 className="h-3 w-3" />
                        On Cooldown
                      </span>
                    )}

                    {isActive && !isClaimReady && (
                      <span className="hh-status-badge hh-status-pending">
                        <Clock className="h-3 w-3" />
                        Pending
                      </span>
                    )}

                    {isClaimReady && (
                      <span className="hh-status-badge hh-status-ready">
                        <CheckCircle2 className="h-3 w-3" />
                        Ready to Claim
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleTaskClick(task)}
                    disabled={buttonDisabled}
                    className={`hh-task-btn ${buttonClass}`}
                  >
                    {showShortPopup
                      ? "Spend 10s on the task first ⏱️"
                      : buttonText}
                  </button>

                  {showShortPopup && (
                    <div className="hh-short-popup" role="status">
                      <div className="hh-short-popup-inner">
                        Please spend at least 10 seconds on the task before
                        returning.
                      </div>
                    </div>
                  )}

                  {isActive && !isClaimReady && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-400">Verifying task</span>
                        <span className="text-emerald-400 font-bold">
                          {Math.floor(progress)}%
                        </span>
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

                <div className="hh-task-warning">
                  <div className="hh-task-warning-icon">✨</div>
                  <div className="hh-task-warning-content">
                    <span className="hh-task-warning-title">Quick tip</span>
                    <span className="hh-task-warning-text">
                      Interact with the page naturally and stay for at least 10
                      seconds before coming back to claim.
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reset Notice */}
        <div className="hh-card hh-tip-card hh-entry-6">
          <div className="flex items-start gap-3">
            <div className="hh-tip-icon">
              <Sparkles className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">12-Hour Cooldown</h4>
              <p className="text-sm text-emerald-200/80">
                Each task becomes available again 12 hours after completion.
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
        @import url("https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap");

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

        .hh-header {
          background: linear-gradient(
            180deg,
            rgba(5, 13, 20, 0.95) 0%,
            rgba(5, 13, 20, 0.8) 100%
          );
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(16, 185, 129, 0.15);
        }

        .hh-back-btn {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .hh-back-btn:hover {
          background: rgba(255, 255, 255, 0.1);
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
          color: rgba(16, 185, 129, 0.8);
        }

        .hh-card {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.06) 0%,
            rgba(255, 255, 255, 0.02) 100%
          );
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 20px;
          backdrop-filter: blur(12px);
          position: relative;
          overflow: hidden;
          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease;
        }

        .hh-card:hover {
          transform: translateY(-2px);
          box-shadow:
            0 20px 60px rgba(0, 0, 0, 0.4),
            0 0 30px rgba(16, 185, 129, 0.05);
        }

        .hh-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.15),
            transparent
          );
        }

        .hh-card-hero {
          background: linear-gradient(
            135deg,
            rgba(16, 185, 129, 0.15) 0%,
            rgba(5, 13, 20, 0.9) 50%,
            rgba(245, 158, 11, 0.1) 100%
          );
          border-color: rgba(16, 185, 129, 0.2);
        }

        .hh-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(40px);
          pointer-events: none;
        }

        .hh-orb-1 {
          width: 150px;
          height: 150px;
          background: radial-gradient(
            circle,
            rgba(16, 185, 129, 0.2),
            transparent
          );
          top: -40px;
          right: -40px;
          animation: hh-orb-float 6s ease-in-out infinite;
        }

        .hh-orb-2 {
          width: 100px;
          height: 100px;
          background: radial-gradient(
            circle,
            rgba(245, 158, 11, 0.15),
            transparent
          );
          bottom: 20px;
          left: -20px;
          animation: hh-orb-float 8s ease-in-out infinite reverse;
        }

        @keyframes hh-orb-float {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(8px, -8px) scale(1.05);
          }
          66% {
            transform: translate(-4px, 6px) scale(0.97);
          }
        }

        .hh-icon-ring {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: linear-gradient(
            135deg,
            rgba(16, 185, 129, 0.2),
            rgba(245, 158, 11, 0.2)
          );
          border: 1px solid rgba(245, 158, 11, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hh-stats-row {
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
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
          background: rgba(255, 255, 255, 0.08);
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

        .hh-task-card {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.05) 0%,
            rgba(255, 255, 255, 0.02) 100%
          );
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          overflow: hidden;
          transition: all 0.3s ease;
          animation: hh-card-appear 0.4s ease-out both;
          position: relative;
        }

        .hh-task-card:hover {
          transform: translateY(-2px);
          border-color: rgba(16, 185, 129, 0.3);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .hh-task-header {
          padding: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .hh-task-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: linear-gradient(
            135deg,
            rgba(16, 185, 129, 0.1),
            rgba(245, 158, 11, 0.1)
          );
          border: 1px solid rgba(16, 185, 129, 0.2);
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
          color: rgba(255, 255, 255, 0.5);
        }
        .hh-task-body {
          padding: 16px;
        }

        .hh-reward-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: linear-gradient(
            135deg,
            rgba(245, 158, 11, 0.2),
            rgba(245, 158, 11, 0.1)
          );
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 20px;
          padding: 4px 10px;
          font-size: 13px;
          font-weight: 700;
          color: #fbbf24;
        }

        .hh-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
        }

        .hh-status-completed {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #10b981;
        }
        .hh-status-pending {
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: #fbbf24;
        }
        .hh-status-ready {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #6ee7b7;
        }

        .hh-task-btn {
          width: 100%;
          padding: 14px;
          border-radius: 14px;
          font-weight: 700;
          font-size: 14px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          color: white;
        }

        .hh-task-btn:hover {
          transform: translateY(-2px);
        }
        .hh-task-btn:active {
          transform: scale(0.98);
        }

        .hh-task-btn-available {
          background: linear-gradient(135deg, #10b981, #059669);
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
        }
        .hh-task-btn-pending {
          background: linear-gradient(135deg, #fbbf24, #d97706);
          box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
        }
        .hh-task-btn-ready {
          background: linear-gradient(135deg, #14b8a6, #0d9488);
          box-shadow: 0 4px 15px rgba(20, 184, 166, 0.35);
        }
        .hh-task-btn-completed {
          background: rgba(255, 255, 255, 0.1);
          cursor: not-allowed;
          color: rgba(255, 255, 255, 0.4);
        }
        .hh-task-btn-processing {
          background: rgba(59, 130, 246, 0.3);
          cursor: not-allowed;
          border: 1px solid rgba(59, 130, 246, 0.3);
        }

        .hh-progress-track {
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          overflow: hidden;
        }
        .hh-progress-fill {
          height: 100%;
          border-radius: 10px;
          transition: width 0.3s ease;
        }
        .hh-progress-verify {
          background: linear-gradient(90deg, #fbbf24, #d97706);
          box-shadow: 0 0 10px rgba(245, 158, 11, 0.5);
        }

        .hh-cooldown {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 30px;
          padding: 8px 12px;
          font-size: 12px;
          color: #fbbf24;
        }

        .hh-task-warning {
          background: linear-gradient(
            135deg,
            rgba(245, 158, 11, 0.14),
            rgba(251, 191, 36, 0.08)
          );
          border-top: 1px solid rgba(251, 191, 36, 0.22);
          padding: 12px 14px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .hh-task-warning-icon {
          width: 28px;
          height: 28px;
          border-radius: 10px;
          background: rgba(251, 191, 36, 0.14);
          border: 1px solid rgba(251, 191, 36, 0.24);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          flex-shrink: 0;
        }

        .hh-task-warning-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .hh-task-warning-title {
          font-size: 12px;
          font-weight: 700;
          color: #fde68a;
          letter-spacing: 0.02em;
        }
        .hh-task-warning-text {
          font-size: 11px;
          line-height: 1.45;
          color: rgba(255, 255, 255, 0.78);
        }

        .hh-short-popup {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          bottom: 18px;
          z-index: 60;
          pointer-events: none;
          animation: hh-popup-fade 2s ease-out forwards;
        }

        .hh-short-popup-inner {
          background: rgba(0, 0, 0, 0.85);
          color: #fff;
          padding: 10px 16px;
          border-radius: 12px;
          font-size: 13px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
          pointer-events: none;
          white-space: nowrap;
        }

        @keyframes hh-popup-fade {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(6px);
          }
          10% {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
          85% {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateX(-50%) translateY(-6px);
          }
        }

        .hh-tip-card {
          background: linear-gradient(
            135deg,
            rgba(16, 185, 129, 0.15),
            rgba(16, 185, 129, 0.05)
          );
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .hh-tip-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .coin-rain {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1000;
        }

        .coin {
          position: absolute;
          width: 24px;
          height: 24px;
          background: linear-gradient(135deg, #fbbf24, #d97706);
          border-radius: 50%;
          animation: coin-fall 3s linear forwards;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
          top: -30px;
        }

        @keyframes coin-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        .hh-bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          max-width: 448px;
          margin: 0 auto;
          background: rgba(5, 13, 20, 0.92);
          backdrop-filter: blur(20px);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          justify-content: space-around;
          align-items: center;
          height: 64px;
          z-index: 100;
          box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.5);
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
          transition:
            color 0.2s,
            transform 0.2s;
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
          filter: drop-shadow(0 0 6px rgba(16, 185, 129, 0.6));
        }

        @keyframes hh-card-appear {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .hh-entry-1 {
          animation: hh-entry 0.5s ease-out 0s both;
        }
        .hh-entry-2 {
          animation: hh-entry 0.5s ease-out 0.1s both;
        }
        .hh-entry-3 {
          animation: hh-entry 0.5s ease-out 0.2s both;
        }
        .hh-entry-4 {
          animation: hh-entry 0.5s ease-out 0.3s both;
        }
        .hh-entry-5 {
          animation: hh-entry 0.5s ease-out 0.4s both;
        }
        .hh-entry-6 {
          animation: hh-entry 0.5s ease-out 0.5s both;
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

        @media (prefers-reduced-motion: reduce) {
          .hh-bubble,
          .hh-orb-1,
          .hh-orb-2,
          .coin,
          [class*="hh-entry-"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

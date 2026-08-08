"use client";

import type React from "react";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Gamepad2,
  History,
  Home,
  Bell,
  User,
  Gift,
  Clock,
  Headphones,
  Shield,
  TrendingUp,
  Users,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardImageCarousel } from "@/components/dashboard-image-carousel";
import { WithdrawalNotification } from "@/components/withdrawal-notification";
import { ReferralCard } from "@/components/referral-card";
import { TutorialModal } from "@/components/tutorial-modal";
import { ScrollingText } from "@/components/scrolling-text";
import { LiveChat } from "@/components/live-chat";
import { useToast } from "@/hooks/use-toast";
import {
  ensurePushRegistrationIntegrity,
  registerForFCM,
  requestNotificationPermission,
  showLocalNotification,
} from "@/services/notification-service";
import {
  persistUserSession,
  restoreUserSessionFromCookie,
} from "@/lib/session-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface UserData {
  name: string;
  email: string;
  balance: number;
  userId: string;
  hasMomoNumber: boolean;
  profilePicture?: string;
  id?: string;
}

interface MenuItem {
  name: string;
  icon?: React.ElementType;
  emoji?: string;
  link?: string;
  external?: boolean;
  action?: () => void;
  color: string;
  bgColor: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [showWithdrawalNotification, setShowWithdrawalNotification] =
    useState(false);
  const [balance, setBalance] = useState(50000);
  const [animatedBalance, setAnimatedBalance] = useState(50000);
  const [isBalanceChanging, setIsBalanceChanging] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [canClaim, setCanClaim] = useState(true);
  const [isCounting, setIsCounting] = useState(false);
  const [displayedName, setDisplayedName] = useState("");
  const [nameIndex, setNameIndex] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const [claimCount, setClaimCount] = useState(0);
  const [pauseEndTime, setPauseEndTime] = useState<number | null>(null);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [showClaimSuccess, setShowClaimSuccess] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showBrowserCheck, setShowBrowserCheck] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showLiveChat, setShowLiveChat] = useState(false);
  const [tapCount, setTapCount] = useState(0);

  const notifyClaimReady = useCallback(async () => {
    if (typeof window === "undefined") return;

    console.log("[dashboard] notifyClaimReady called");
    const alreadyNotified =
      localStorage.getItem("tivexx-claim-ready-notified") === "1";
    if (alreadyNotified) {
      console.log("[dashboard] Already notified for this cycle, skipping");
      return;
    }

    console.log("[dashboard] Showing claim-ready toast + notification");
    toast({
      title: "Claim Ready!",
      description: "Your timer is 00:00. Claim your ₦2,000 now.",
    });

    if ("Notification" in window && Notification.permission === "default") {
      await requestNotificationPermission();
    }

    showLocalNotification("Claim Ready!", {
      body: "Your timer is 00:00. Claim your ₦2,000 now.",
      data: { url: "/dashboard" },
    });

    const storedUserRaw = localStorage.getItem("tivexx-user");
    const storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null;
    const targetUserId =
      userData?.id || userData?.userId || storedUser?.id || storedUser?.userId;
    if (targetUserId) {
      try {
        console.log("[dashboard] Sending claim-ready push notification");
        await fetch("/api/notifications/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: targetUserId,
            title: "Claim Ready!",
            body: "Your timer is 00:00. Claim your ₦1,000 now.",
            clickUrl: "/dashboard",
          }),
        });
      } catch (error) {
        console.error("Failed to send claim-ready push:", error);
      }
    }

    localStorage.setItem("tivexx-claim-ready-notified", "1");
  }, [toast, userData]);

  const notifyClaimSuccess = useCallback(
    async (amount: number, newBalance: number) => {
      if (typeof window === "undefined") return;

      console.log(
        "[dashboard] notifyClaimSuccess called with amount:",
        amount,
        "newBalance:",
        newBalance,
      );
      const message = `You successfully claimed ₦${amount.toLocaleString()}. New balance: ₦${newBalance.toLocaleString()}.`;

      console.log("[dashboard] Showing claim-success toast");
      toast({
        title: "Claim Successful!",
        description: message,
      });

      if ("Notification" in window && Notification.permission === "default") {
        await requestNotificationPermission();
      }

      console.log("[dashboard] Showing claim-success browser notification");
      showLocalNotification("Claim Successful!", {
        body: message,
        data: { url: "/dashboard" },
      });

      const storedUserRaw = localStorage.getItem("tivexx-user");
      const storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null;
      const targetUserId =
        userData?.id ||
        userData?.userId ||
        storedUser?.id ||
        storedUser?.userId;

      if (targetUserId) {
        try {
          console.log("[dashboard] Sending claim-success push notification");
          await fetch("/api/notifications/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              uid: targetUserId,
              title: "Claim Successful!",
              body: message,
              clickUrl: "/dashboard",
            }),
          });
        } catch (error) {
          console.error("Failed to send claim-success push:", error);
        }
      }
    },
    [toast, userData],
  );
  // open chat if URL hash is #chat (on mount or when hash changes)
  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === "#chat") {
        setShowLiveChat(true);
      }
    };

    if (typeof window !== "undefined") {
      checkHash();
      window.addEventListener("hashchange", checkHash);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("hashchange", checkHash);
      }
    };
  }, []);

  // tap counter for blog promotion
  useEffect(() => {
    const handleTap = () => {
      setTapCount((prev) => {
        const next = prev + 1;
        if (next <= 50 && next % 10 === 0) {
          toast({
            title: "Check out our blog!",
            description: (
              <span>
                Visit{" "}
                <a
                  href="https://flashgain.online"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 underline"
                >
                  flashgain.online
                </a>{" "}
                for articles and updates.
              </span>
            ),
          });
        }
        return next;
      });
    };

    if (typeof window !== "undefined") {
      window.addEventListener("click", handleTap);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("click", handleTap);
      }
    };
  }, [toast]);

  // Animate balance changes
  useEffect(() => {
    if (balance === animatedBalance) return;

    const difference = balance - animatedBalance;
    const steps = 30;
    const increment = difference / steps;

    setIsBalanceChanging(true);

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      setAnimatedBalance((prev) => {
        const newValue = prev + increment;
        if (currentStep >= steps) {
          clearInterval(timer);
          setIsBalanceChanging(false);
          return balance;
        }
        return Math.round(newValue);
      });
    }, 16);

    return () => clearInterval(timer);
  }, [balance]);

  const handleCloseWithdrawalNotification = useCallback(() => {
    setShowWithdrawalNotification(false);
  }, []);

  useEffect(() => {
    const savedClaimCount = localStorage.getItem("tivexx-claim-count");
    const savedPauseEndTime = localStorage.getItem("tivexx-pause-end-time");

    if (savedClaimCount) {
      setClaimCount(Number.parseInt(savedClaimCount));
    }

    if (savedPauseEndTime) {
      const pauseTime = Number.parseInt(savedPauseEndTime);
      if (pauseTime > Date.now()) {
        setPauseEndTime(pauseTime);
        setCanClaim(false);
      } else {
        localStorage.removeItem("tivexx-pause-end-time");
        localStorage.setItem("tivexx-claim-count", "0");
        setClaimCount(0);
      }
    }

    // Use absolute end time for reliable cross-session timer restore
    const savedTimerEnd = localStorage.getItem("tivexx-timer-end");

    if (savedTimerEnd) {
      const timerEnd = Number.parseInt(savedTimerEnd);
      const remaining = Math.max(0, Math.floor((timerEnd - Date.now()) / 1000));

      if (remaining > 0) {
        setTimeRemaining(remaining);
        setIsCounting(true);
        if (!pauseEndTime) {
          setCanClaim(false);
        }
      } else {
        // Timer already expired while app was closed
        setTimeRemaining(0);
        localStorage.removeItem("tivexx-timer-end");
        if (!pauseEndTime) {
          setCanClaim(true);
          void notifyClaimReady();
        }
        setIsCounting(false);
      }
    } else {
      setCanClaim(!pauseEndTime);
      setIsCounting(false);
    }
  }, [notifyClaimReady, pauseEndTime]);

  useEffect(() => {
    if (!pauseEndTime) return;

    const interval = setInterval(() => {
      const remaining = pauseEndTime - Date.now();
      if (remaining <= 0) {
        setPauseEndTime(null);
        setCanClaim(true);
        setClaimCount(0);
        localStorage.removeItem("tivexx-pause-end-time");
        localStorage.setItem("tivexx-claim-count", "0");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [pauseEndTime]);

  useEffect(() => {
    if (!isCounting) return;

    const timer = setInterval(() => {
      // Compute remaining from absolute end time — works correctly after app wake
      const timerEnd = Number.parseInt(
        localStorage.getItem("tivexx-timer-end") || "0",
      );
      const remaining = timerEnd
        ? Math.max(0, Math.floor((timerEnd - Date.now()) / 1000))
        : 0;

      setTimeRemaining(remaining);

      if (remaining === 0) {
        console.log("[dashboard] Timer hit 00:00, triggering notifyClaimReady");
        localStorage.removeItem("tivexx-timer-end");
        setCanClaim(true);
        setIsCounting(false);
        void notifyClaimReady();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isCounting, notifyClaimReady]);

  const handleClaim = async () => {
    if (pauseEndTime && pauseEndTime > Date.now()) {
      setShowPauseDialog(true);
      return;
    }

    if (canClaim) {
      const newClaimCount = claimCount + 1;
      const newBalance = balance + 2000;

      setBalance(newBalance);
      setClaimCount(newClaimCount);

      localStorage.setItem("tivexx-claim-count", newClaimCount.toString());

      if (userData) {
        const updatedUser = { ...userData, balance: newBalance };
        persistUserSession(updatedUser);
        setUserData(updatedUser);
      }

      setShowClaimSuccess(true);
      setTimeout(() => setShowClaimSuccess(false), 3000);
      void notifyClaimSuccess(2000, newBalance);

      if (newClaimCount >= 50) {
        const fiveHoursLater = Date.now() + 5 * 60 * 60 * 1000;
        setPauseEndTime(fiveHoursLater);
        localStorage.setItem(
          "tivexx-pause-end-time",
          fiveHoursLater.toString(),
        );
        setCanClaim(false);
      } else {
        const timerEndMs = Date.now() + 60 * 1000;
        setCanClaim(false);
        setTimeRemaining(60);
        setIsCounting(true);
        // Save single absolute end time — no need to update every tick
        localStorage.setItem("tivexx-timer-end", timerEndMs.toString());
        localStorage.removeItem("tivexx-claim-ready-notified");

        // Notify server so cron can send push if app is closed before timer ends
        try {
          const userId = userData?.id || userData?.userId;
          if (userId) {
            console.log("[dashboard] Starting server timer for user:", userId);
            await fetch("/api/timer/start", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId,
                timerEndsAt: new Date(timerEndMs).toISOString(),
              }),
            });
          }
        } catch (error) {
          console.error(
            "[dashboard] Error notifying server of timer start:",
            error,
          );
        }
      }

      if (newClaimCount === 50) {
        setTimeout(() => setShowReminderDialog(true), 1000);
      }

      const transactions = JSON.parse(
        localStorage.getItem("tivexx-transactions") || "[]",
      );
      transactions.unshift({
        id: Date.now(),
        type: "credit",
        description: "Daily Claim Reward",
        amount: 2000,
        date: new Date().toISOString(),
      });
      localStorage.setItem("tivexx-transactions", JSON.stringify(transactions));
    }
  };

  const formatCurrency = (amount: number) => {
    if (!showBalance) {
      return (
        <span className="tracking-widest flex items-center gap-1">
          {[...Array(4)].map((_, i) => (
            <span
              key={i}
              className="inline-block w-8 h-5 bg-black/10 rounded-md animate-pulse"
              style={{ animationDelay: `${i * 0.15}s` }}
            ></span>
          ))}
        </span>
      );
    }

    const formatted = new Intl.NumberFormat("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

    return (
      <span
        className={`font-mono transition-colors duration-300 ${isBalanceChanging ? "text-emerald-800" : "text-[#12190f]"}`}
      >
        <span className="text-xl align-top opacity-70">₦</span>
        <span className="text-4xl font-black tracking-tight ml-0.5">
          {formatted.split(".")[0]}
        </span>
        <span className="text-xl opacity-60">
          .{formatted.split(".")[1] || "00"}
        </span>
      </span>
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatPauseTime = () => {
    if (!pauseEndTime) return "";
    const remaining = Math.max(0, pauseEndTime - Date.now());
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const copyLinkToClipboard = async () => {
    const referralLink = `${typeof window !== "undefined" ? window.location.origin : ""}/refer?ref=${userData?.userId || "ref"}`;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const handleProfileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const fallbackRaw =
        typeof window !== "undefined"
          ? localStorage.getItem("tivexx-user") ||
            restoreUserSessionFromCookie()
          : null;
      const fallbackUser =
        typeof fallbackRaw === "string" ? JSON.parse(fallbackRaw) : fallbackRaw;
      const stableFallbackUserId =
        fallbackUser?.userId ||
        fallbackUser?.referral_code ||
        fallbackUser?.referralCode ||
        fallbackUser?.id ||
        "";
      const updatedUser = userData
        ? { ...userData, profilePicture: result }
        : {
            name: "User",
            email: "",
            balance,
            userId: stableFallbackUserId,
            hasMomoNumber: false,
            profilePicture: result,
          };
      setUserData(updatedUser);
      try {
        persistUserSession(updatedUser);
      } catch (err) {
        console.error(
          "Failed to persist profile picture to localStorage:",
          err,
        );
      }
      toast?.({
        title: "Profile updated",
        description: "Your profile picture was updated locally.",
      });
    };
    reader.readAsDataURL(file);
  };

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
    const restoredUser = restoreUserSessionFromCookie();
    const storedUser =
      localStorage.getItem("tivexx-user") ||
      (restoredUser ? JSON.stringify(restoredUser) : null);

    if (!storedUser) {
      router.push("/login");
      return;
    }

    const user = JSON.parse(storedUser);

    // Check if browser check popup was already shown
    const browserCheckShown = localStorage.getItem(
      "tivexx-browser-check-shown",
    );
    if (!browserCheckShown) {
      setShowBrowserCheck(true);
      localStorage.setItem("tivexx-browser-check-shown", "true");
    }

    const tutorialShown = localStorage.getItem("tivexx-tutorial-shown");
    if (!tutorialShown) {
      setShowTutorial(true);
    }

    if (typeof user.balance !== "number") {
      user.balance = 50000;
    }

    if (!user.userId) {
      user.userId = user.referral_code || user.referralCode || user.id || "";
    }

    persistUserSession(user);

    const uid = user.id || user.userId;
    registerForFCM(uid);
    void ensurePushRegistrationIntegrity(uid);

    const handleVisibilityRegistrationCheck = () => {
      if (document.visibilityState === "visible") {
        void ensurePushRegistrationIntegrity(uid);
      }
    };
    document.addEventListener(
      "visibilitychange",
      handleVisibilityRegistrationCheck,
    );

    const handleVisibilityRefresh = () => {
      if (document.visibilityState === "visible") {
        try {
          const stored = localStorage.getItem("tivexx-user");
          if (stored) {
            const parsed = JSON.parse(stored);
            if (typeof parsed.balance === "number") {
              // Update local UI if balance changed while away
              console.log(
                "[dashboard] visibility refresh - stored balance:",
                parsed.balance,
                "current balance:",
                balance,
              );
              if (parsed.balance !== balance) {
                setBalance(parsed.balance);
                setAnimatedBalance(parsed.balance);
              }
            }
            setUserData(parsed);
          }
        } catch (err) {
          console.error(
            "[dashboard] Error refreshing user from localStorage:",
            err,
          );
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityRefresh);

    const recheckInterval = window.setInterval(
      () => {
        void ensurePushRegistrationIntegrity(uid);
      },
      10 * 60 * 1000,
    );

    // Check if timer expired while app was closed
    const checkServerTimer = async () => {
      try {
        const userId = user.id || user.userId;
        console.log("[dashboard] Checking server timer for user:", userId);
        const response = await fetch("/api/timer/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        const data = await response.json();

        if (data.success && data.timerReady) {
          console.log(
            "[dashboard] Timer expired on server, showing claim ready notification",
          );
          setCanClaim(true);
          setIsCounting(false);
          void notifyClaimReady();
        }
      } catch (error) {
        console.error("[dashboard] Error checking server timer:", error);
      }
    };

    const fetchUserBalance = async () => {
      try {
        const response = await fetch(
          `/api/user-balance?userId=${user.id || user.userId}&t=${Date.now()}`,
        );
        const data = await response.json();

        // Read the latest local storage value (in case it changed while user was away)
        const storedLatestRaw = localStorage.getItem("tivexx-user");
        const storedLatest = storedLatestRaw
          ? JSON.parse(storedLatestRaw)
          : null;
        const localStorageBalance =
          storedLatest && typeof storedLatest.balance === "number"
            ? storedLatest.balance
            : user.balance || 50000;
        const dbBalance = data.balance || 50000;
        const baseBalance = Math.max(localStorageBalance, dbBalance);

        const referralEarnings = data.referral_balance || 0;
        const lastSyncedReferrals =
          localStorage.getItem("tivexx-last-synced-referrals") || "0";

        const newReferralEarnings =
          referralEarnings - parseInt(lastSyncedReferrals);
        const totalBalance = baseBalance + Math.max(0, newReferralEarnings);

        console.log(
          "[dashboard] fetchUserBalance -> local:",
          localStorageBalance,
          "db:",
          dbBalance,
          "total:",
          totalBalance,
        );
        setBalance(totalBalance);
        setAnimatedBalance(totalBalance);

        const updatedUser = {
          ...(storedLatest || user),
          balance: totalBalance,
        };
        persistUserSession(updatedUser);

        if (newReferralEarnings > 0) {
          localStorage.setItem(
            "tivexx-last-synced-referrals",
            referralEarnings.toString(),
          );
        }

        setUserData(updatedUser);

        await fetch(`/api/user-balance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id || user.userId,
            balance: totalBalance,
          }),
        });
      } catch (error) {
        console.error("[Dashboard] Error fetching user balance:", error);
        // Prefer most recent client-side stored value when network or server fails
        try {
          const storedLatestRaw = localStorage.getItem("tivexx-user");
          const storedLatest = storedLatestRaw
            ? JSON.parse(storedLatestRaw)
            : null;
          if (storedLatest && typeof storedLatest.balance === "number") {
            console.log(
              "[dashboard] fetchUserBalance error - using local stored balance:",
              storedLatest.balance,
            );
            setBalance(storedLatest.balance);
            setAnimatedBalance(storedLatest.balance);
            setUserData(storedLatest);
          } else {
            // fallback to previously known user object
            setBalance(user.balance);
            setAnimatedBalance(user.balance);
            setUserData(user);
          }
        } catch (e) {
          console.error("[dashboard] Error reading stored user in catch:", e);
          setBalance(user.balance);
          setAnimatedBalance(user.balance);
          setUserData(user);
        }
      }
    };

    fetchUserBalance();
    checkServerTimer();

    setTimeout(() => {
      setShowWithdrawalNotification(true);
    }, 3000);

    const showRandomNotification = () => {
      const randomDelay =
        Math.floor(Math.random() * (30000 - 15000 + 1)) + 15000;
      setTimeout(() => {
        setShowWithdrawalNotification(true);
        showRandomNotification();
      }, randomDelay);
    };

    showRandomNotification();

    // Also refresh when window/tab gains focus so returned users see updated balance
    const handleFocusRefresh = () => {
      try {
        const stored = localStorage.getItem("tivexx-user");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (typeof parsed.balance === "number") {
            if (parsed.balance !== balance) {
              setBalance(parsed.balance);
              setAnimatedBalance(parsed.balance);
            }
          }
          setUserData(parsed);
        }
      } catch (err) {
        console.error("[dashboard] Error on focus refresh:", err);
      }
      void fetchUserBalance();
    };
    window.addEventListener("focus", handleFocusRefresh);

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityRegistrationCheck,
      );
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
      window.removeEventListener("focus", handleFocusRefresh);
      clearInterval(recheckInterval);
    };
  }, [router]);

  useEffect(() => {
    const stored = localStorage.getItem("tivexx-transactions");
    if (stored) {
      try {
        setTransactions(JSON.parse(stored));
      } catch (err) {
        setTransactions([]);
      }
    }
  }, []);

  useEffect(() => {
    if (userData && nameIndex < userData.name.length) {
      const timeout = setTimeout(() => {
        setDisplayedName(userData.name.slice(0, nameIndex + 1));
        setNameIndex(nameIndex + 1);
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [userData, nameIndex]);

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e14]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-ping"></div>
            <div
              className="absolute inset-2 rounded-full border-2 border-amber-400/40 animate-ping"
              style={{ animationDelay: "0.3s" }}
            ></div>
            <div className="absolute inset-4 rounded-full bg-emerald-500/20 animate-pulse"></div>
          </div>
          <p className="text-emerald-400 text-sm font-medium tracking-widest uppercase">
            Loading
          </p>
        </div>
      </div>
    );
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

      {/* Diagonal light beam sheen */}
      <div className="hh-beam-overlay" aria-hidden="true"></div>

      <ScrollingText />

      {/* DIALOGS - unchanged logic */}
      <Dialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <DialogContent className="hh-dialog max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-xl text-white">
              ⏰ Wait Required
            </DialogTitle>
            <DialogDescription className="text-center space-y-4 pt-4">
              <p className="text-base text-gray-300">
                You must wait 5 hours before claiming again.
              </p>
              <p className="text-2xl font-bold text-emerald-400">
                {formatPauseTime()}
              </p>
              <p className="text-sm text-gray-400">
                In the meantime, you can earn by referring or taking loans.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              onClick={() => {
                setShowPauseDialog(false);
                router.push("/refer");
              }}
              className="flex-1 hh-btn-primary"
            >
              Refer Friends
            </Button>
            <Button
              onClick={() => {
                setShowPauseDialog(false);
                router.push("/loan");
              }}
              className="flex-1 hh-btn-secondary"
            >
              Take Loan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
        <DialogContent className="hh-dialog max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-xl text-white">
              📢 Stay Updated!
            </DialogTitle>
            <DialogDescription className="text-center space-y-4 pt-4">
              <p className="text-base text-gray-300">
                Join our channel for updates and tips for earning.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              onClick={() => {
                setShowReminderDialog(false);
                window.open("https://t.me/flashgain9janews", "_self");
              }}
              className="flex-1 hh-btn-blue"
            >
              Join Channel
            </Button>
            <Button
              onClick={() => {
                setShowReminderDialog(false);
                router.push("/refer");
              }}
              className="flex-1 hh-btn-primary"
            >
              Refer More Friends
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {showTutorial && (
        <TutorialModal
          onClose={() => {
            setShowTutorial(false);
            localStorage.setItem("tivexx-tutorial-shown", "true");
          }}
        />
      )}

      {showWithdrawalNotification && (
        <WithdrawalNotification onClose={handleCloseWithdrawalNotification} />
      )}

      {/* Browser Check Popup */}
      {showBrowserCheck && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="hh-browser-check-popup">
            <div className="hh-browser-check-header">
              <div className="hh-browser-check-icon">
                <Shield className="h-6 w-6 text-emerald-400" />
              </div>
              <h2 className="text-base font-bold text-white">
                Secure Your Account
              </h2>
            </div>

            <p className="text-xs text-gray-300 mb-2 text-center">
              ⚠️ Use a Supported Browser
            </p>
            <p className="text-[11px] text-gray-400 mb-3 text-center leading-snug">
              Supported browsers: Chrome, Firefox, Safari, Opera. If you're not
              using one, copy your link below and log in with your credentials
              so you don't lose access to your account.
            </p>

            {/* Secure Link Display */}
            <div className="hh-browser-check-link-container">
              <p className="text-[10px] font-semibold text-emerald-400 mb-1 uppercase tracking-wider">
                Your Secure Link
              </p>
              <div className="hh-browser-check-link-box">
                <code className="text-[10px] text-white break-all">
                  {typeof window !== "undefined"
                    ? `${window.location.origin}/refer?ref=${userData?.userId || "ref"}`
                    : "Loading..."}
                </code>
              </div>
              <button
                onClick={copyLinkToClipboard}
                className={`hh-browser-check-copy-btn ${copiedLink ? "hh-browser-check-copy-copied" : ""}`}
              >
                {copiedLink ? (
                  <>
                    <svg
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Copy Link
                  </>
                )}
              </button>
            </div>

            <div className="hh-browser-check-divider"></div>

            <div className="space-y-1 mb-3">
              <p className="text-[11px] font-semibold text-white uppercase tracking-wider">
                Login with These Credentials:.
              </p>
              <p className="text-[11px] text-gray-400">
                Email:{" "}
                <span className="text-emerald-300 font-mono">
                  {userData?.email}
                </span>
              </p>
              <p className="text-[11px] text-gray-400">
                User ID/Password:{" "}
                <span className="text-emerald-300 font-mono">
                  {userData?.userId}
                </span>
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
      <div className="hh-container max-w-md mx-auto px-4 space-y-4 pt-6 relative z-10">
        {/* ── HEADER / PROFILE CARD ── */}
        <div className="hh-card hh-card-profile hh-entry-1">
          {/* Top row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="hh-avatar-ring">
                <div className="hh-avatar">
                  {userData?.profilePicture ? (
                    <img
                      src={userData.profilePicture || "/placeholder.svg"}
                      alt={userData.name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-emerald-400 text-xs">
                      <span className="text-xl font-black">
                        {userData?.name.charAt(0)}
                      </span>
                      <span className="mt-1">Add photo</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer rounded-full"
                    aria-label="Upload profile picture"
                  />
                </div>
              </div>
              <div>
                <div className="text-xs text-emerald-400 font-semibold uppercase tracking-widest mb-0.5">
                  Welcome back
                </div>
                <div className="text-white font-black text-lg leading-tight">
                  {displayedName} <span>👋</span>
                </div>
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
                <span className="text-xs text-black/55 font-medium uppercase tracking-wider">
                  Available Balance
                </span>
              </div>
              <button
                className="hh-eye-btn"
                onClick={() => setShowBalance(!showBalance)}
                aria-label={showBalance ? "Hide balance" : "Show balance"}
              >
                {showBalance ? "👁️" : "🙈"}
              </button>
            </div>

            {/* Balance amount */}
            <div
              className={`hh-balance-amount ${isBalanceChanging ? "hh-balance-pulse" : ""}`}
            >
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
                    <div className="text-sm font-bold text-white">
                      Daily Reward
                    </div>
                    <div className="text-xs text-gray-400">
                      Click to claim ₦2,000
                    </div>
                  </div>
                </div>
                <div className="hh-timer-badge">
                  <Clock className="h-3 w-3" />
                  <span>
                    {pauseEndTime
                      ? formatPauseTime()
                      : formatTime(timeRemaining)}
                  </span>
                </div>
              </div>

              {/* Claim button */}
              <button
                onClick={handleClaim}
                disabled={!canClaim && !pauseEndTime}
                className={`hh-claim-btn ${canClaim && !pauseEndTime ? "hh-claim-ready" : pauseEndTime ? "hh-claim-paused" : "hh-claim-waiting"}`}
              >
                <span className="hh-claim-shimmer"></span>
                <span className="flex items-center justify-center gap-2 relative">
                  <span className="text-lg">
                    {pauseEndTime ? "⏳" : canClaim ? "🎁" : "⏰"}
                  </span>
                  <span>
                    {pauseEndTime
                      ? `Wait ${formatPauseTime()}`
                      : canClaim
                        ? "Claim ₦2,000 Now"
                        : `Next claim in ${formatTime(timeRemaining)}`}
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
                  <div className="font-black text-white text-lg">
                    ₦2,000 Added!
                  </div>
                  <div className="text-xs text-emerald-300 mt-0.5">
                    Balance updated
                  </div>
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
                    <div
                      className="hh-progress-fill"
                      style={{ width: `${(claimCount / 50) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-bold text-white">
                    {claimCount}
                    <span className="text-gray-500">/50</span>
                  </span>
                  {claimCount >= 50 && (
                    <span className="text-xs text-amber-300 animate-pulse">
                      🔥 Max
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="hh-stats-row mt-4">
              <div className="hh-stat-item">
                <div className="hh-stat-label">Today's income</div>
                <div className="hh-stat-value text-emerald-400">
                  +₦{(claimCount * 2000).toLocaleString()}
                </div>
              </div>
              <div className="hh-stat-divider"></div>
              <div className="hh-stat-item">
                <div className="hh-stat-label">Claims left</div>
                <div className="hh-stat-value text-amber-300">
                  {Math.max(0, 50 - claimCount)} remaining
                </div>
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
          <div className="space-y-3 mt-3">
            {/* Main 2-column grid for first 4 items */}
            <div className="grid grid-cols-2 gap-3 hh-action-grid">
              {menuItems.map((item, idx) => {
                const Icon = item.icon;
                const key = `qa-${idx}`;
                const content = (
                  <div
                    className="hh-action-card"
                    style={{ animationDelay: `${idx * 80 + 400}ms` }}
                  >
                    <div className="hh-action-card-icon">
                      {item.emoji ? (
                        <span className="text-2xl">{item.emoji}</span>
                      ) : (
                        Icon && <Icon size={20} className="text-white" />
                      )}
                    </div>
                    <div className="text-sm font-semibold text-white mt-2">
                      {item.name}
                    </div>
                    <div className="hh-action-card-arrow">→</div>
                  </div>
                );

                return item.external ? (
                  <a
                    key={key}
                    href={item.link}
                    className="block focus:outline-none"
                  >
                    {content}
                  </a>
                ) : (
                  <Link
                    key={key}
                    href={item.link || "#"}
                    className="block focus:outline-none"
                  >
                    {content}
                  </Link>
                );
              })}
            </div>

            {/* Tap & Earn button - takes full width (2 boxes), slim design */}
            <Link href="/earn/tap" className="block focus:outline-none">
              <button
                className="w-full hh-action-btn hh-action-tap"
                style={{ animationDelay: "660ms" }}
              >
                <span className="hh-action-icon">🎮</span>
                <span>Tap & Earn Game</span>
              </button>
            </Link>
          </div>
        </div>

        {/* Support card moved below Referral card per request */}

        {/* ── REFERRAL CARD ── */}
        <div className="hh-entry-5">
          {userData && <ReferralCard userId={userData.id || userData.userId} />}
        </div>

        {/* ── USER EMAIL FOOTER ── */}
        <div className="text-center text-[11px] text-gray-400 pb-24 pt-3">
          {userData?.email ? `Email: ${userData.email}` : "Email not available"}
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
        @import url("https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap");

        /* ─── DESIGN TOKENS ───
           Palette pulled from the "Helping Hands" reference:
           emerald green + warm gold on a deep glass-navy base.
        */
        :root {
          --hh-bg-1: #0a0e14;
          --hh-bg-2: #101a20;
          --hh-bg-3: #0c1115;
          --hh-green-1: #2ecc8f;
          --hh-green-2: #22b57d;
          --hh-gold-1: #f5d76e;
          --hh-gold-2: #e0a838;
          --hh-text-main: #f1f3f5;
          --hh-text-dim: #9aa4ae;
          --hh-text-dark: #12190f;
          --hh-glass-bg: rgba(255, 255, 255, 0.05);
          --hh-glass-border: rgba(255, 255, 255, 0.1);
        }

        /* ─── ROOT & BACKGROUND ─── */
        .hh-root {
          font-family: "Syne", sans-serif;
          background:
            radial-gradient(
              ellipse 700px 420px at 12% 0%,
              rgba(46, 204, 143, 0.13),
              transparent 60%
            ),
            radial-gradient(
              ellipse 700px 420px at 100% 12%,
              rgba(224, 168, 56, 0.1),
              transparent 55%
            ),
            linear-gradient(
              160deg,
              var(--hh-bg-1) 0%,
              var(--hh-bg-2) 45%,
              var(--hh-bg-3) 100%
            );
          color: var(--hh-text-main);
        }

        .hh-container {
          position: relative;
        }

        /* ─── BUBBLES (recolored to the green/gold identity only) ─── */
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
            rgba(46, 204, 143, 0.6),
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
            rgba(245, 215, 110, 0.5),
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
            rgba(46, 204, 143, 0.7),
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
            rgba(224, 168, 56, 0.4),
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
            rgba(46, 204, 143, 0.5),
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
            rgba(245, 215, 110, 0.4),
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
            rgba(46, 204, 143, 0.6),
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
            rgba(46, 204, 143, 0.2),
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
            rgba(224, 168, 56, 0.5),
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
            rgba(245, 215, 110, 0.3),
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

        /* ─── MESH OVERLAY ─── */
        .hh-mesh-overlay {
          position: fixed;
          inset: 0;
          background:
            radial-gradient(
              ellipse 60% 40% at 20% 80%,
              rgba(46, 204, 143, 0.08) 0%,
              transparent 60%
            ),
            radial-gradient(
              ellipse 50% 50% at 80% 20%,
              rgba(224, 168, 56, 0.07) 0%,
              transparent 60%
            ),
            radial-gradient(
              ellipse 40% 30% at 50% 50%,
              rgba(46, 204, 143, 0.04) 0%,
              transparent 60%
            );
          pointer-events: none;
          z-index: 0;
        }

        /* ─── DIAGONAL BEAM SHEEN (matches the reference's glass highlight) ─── */
        .hh-beam-overlay {
          position: fixed;
          inset: -10% -20%;
          background: linear-gradient(
            100deg,
            transparent 42%,
            rgba(255, 255, 255, 0.035) 50%,
            transparent 58%
          );
          transform: rotate(6deg);
          pointer-events: none;
          z-index: 0;
        }

        /* ─── GLASS CARD BASE ─── */
        .hh-card {
          background: var(--hh-glass-bg);
          border: 1px solid var(--hh-glass-border);
          border-radius: 20px;
          padding: 20px;
          backdrop-filter: blur(18px) saturate(140%);
          -webkit-backdrop-filter: blur(18px) saturate(140%);
          position: relative;
          overflow: hidden;
          box-shadow:
            0 8px 30px rgba(0, 0, 0, 0.35),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease;
        }

        .hh-card:hover {
          transform: translateY(-2px);
          box-shadow:
            0 20px 60px rgba(0, 0, 0, 0.4),
            0 0 30px rgba(46, 204, 143, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .hh-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(
            90deg,
            var(--hh-green-1),
            var(--hh-gold-1)
          );
          opacity: 0.55;
        }

        /* Balance card: the same green-to-gold diagonal sweep used on the
           "Rewards & Impact" hero card in the reference, with dark text
           for contrast on the bright gradient. */
        .hh-card-balance {
          background: linear-gradient(
            115deg,
            #33c98f 0%,
            #46c78f 26%,
            #9dcf7f 50%,
            #e3c869 74%,
            #eec95a 100%
          );
          border-color: rgba(255, 255, 255, 0.25);
          box-shadow:
            0 10px 34px rgba(46, 204, 143, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.25);
          padding: 20px 22px;
        }

        .hh-card-balance::before {
          background: linear-gradient(
            90deg,
            rgba(18, 25, 15, 0.25),
            rgba(18, 25, 15, 0.05)
          );
          opacity: 1;
          height: 1px;
        }

        .hh-card-profile {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.07) 0%,
            rgba(255, 255, 255, 0.02) 100%
          );
        }

        /* ─── ORB DECORATIONS (tinted green + gold now) ─── */
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
            rgba(255, 255, 255, 0.35),
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
            rgba(18, 25, 15, 0.15),
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

        /* ─── AVATAR (green → gold looping ring, on-brand) ─── */
        .hh-avatar-ring {
          position: relative;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          padding: 2px;
          background: linear-gradient(135deg, #2ecc8f, #f5d76e, #22b57d);
          animation: hh-ring-spin 4s linear infinite;
        }

        @keyframes hh-ring-spin {
          0% {
            background: linear-gradient(135deg, #2ecc8f, #f5d76e, #22b57d);
          }
          50% {
            background: linear-gradient(135deg, #f5d76e, #22b57d, #2ecc8f);
          }
          100% {
            background: linear-gradient(135deg, #2ecc8f, #f5d76e, #22b57d);
          }
        }

        .hh-avatar {
          width: 100%;
          height: 100%;
          background: var(--hh-bg-1);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
        }

        /* ─── USER ID CHIP ─── */
        .hh-user-id {
          font-family: "JetBrains Mono", monospace;
          font-size: 11px;
          color: var(--hh-green-1);
          background: rgba(46, 204, 143, 0.08);
          border: 1px solid rgba(46, 204, 143, 0.2);
          border-radius: 6px;
          padding: 2px 8px;
          letter-spacing: 0.05em;
        }

        /* ─── ACTION BUTTONS (Task / Withdraw / Tap & Earn) ─── */
        .hh-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 16px;
          border-radius: 999px;
          font-weight: 700;
          font-size: 15px;
          font-family: "Syne", sans-serif;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
          position: relative;
          overflow: hidden;
          cursor: pointer;
          border: none;
        }

        .hh-action-btn:hover {
          transform: translateY(-2px) scale(1.02);
        }
        .hh-action-btn:active {
          transform: scale(0.97);
        }

        .hh-action-purple {
          background: linear-gradient(90deg, #f5d76e, #e0a838);
          color: var(--hh-text-dark);
          box-shadow: 0 0 18px rgba(245, 215, 110, 0.4);
        }

        .hh-action-green {
          background: linear-gradient(90deg, #2ecc8f, #22b57d);
          color: #06150f;
          box-shadow: 0 0 18px rgba(46, 204, 143, 0.35);
        }

        .hh-action-tap {
          background: linear-gradient(90deg, #2ecc8f, #f5d76e);
          color: var(--hh-text-dark);
          box-shadow:
            0 0 20px rgba(245, 215, 110, 0.3),
            0 0 20px rgba(46, 204, 143, 0.25);
        }

        .hh-action-icon {
          font-size: 18px;
        }

        /* ─── LIVE DOT ─── */
        .hh-live-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #0d3324;
          box-shadow:
            0 0 0 2px rgba(13, 51, 36, 0.25),
            0 0 8px rgba(13, 51, 36, 0.4);
          animation: hh-live-pulse 1.5s ease-in-out infinite;
        }

        @keyframes hh-live-pulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.2);
          }
        }

        /* ─── EYE BTN (dark glass chip so it reads on the gold/green card) ─── */
        .hh-eye-btn {
          background: rgba(18, 25, 15, 0.14);
          border: 1px solid rgba(18, 25, 15, 0.18);
          border-radius: 10px;
          padding: 6px 10px;
          font-size: 16px;
          cursor: pointer;
          transition:
            background 0.2s,
            transform 0.15s;
        }

        .hh-eye-btn:hover {
          background: rgba(18, 25, 15, 0.22);
          transform: scale(1.05);
        }
        .hh-eye-btn:active {
          transform: scale(0.95);
        }

        /* ─── BALANCE ─── */
        .hh-balance-amount {
          font-family: "JetBrains Mono", monospace;
          min-height: 48px;
          display: flex;
          align-items: center;
          transition: all 0.3s ease;
        }

        .hh-balance-pulse {
          animation: hh-balance-flash 0.4s ease;
        }

        @keyframes hh-balance-flash {
          0% {
            text-shadow: none;
          }
          50% {
            text-shadow: 0 0 16px rgba(18, 25, 15, 0.25);
          }
          100% {
            text-shadow: none;
          }
        }

        /* ─── CLAIM SECTION (dark glass "well" sitting on top of the gradient,
              styled like the dashed referral-link input from the reference) ─── */
        .hh-claim-section {
          background: rgba(8, 14, 10, 0.55);
          border: 1.5px dashed rgba(245, 215, 110, 0.5);
          border-radius: 16px;
          padding: 16px;
          backdrop-filter: blur(6px);
          box-shadow: 0 0 20px rgba(46, 204, 143, 0.12);
        }

        .hh-reward-icon {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: linear-gradient(135deg, #2ecc8f, #e0a838);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(46, 204, 143, 0.3);
        }

        .hh-timer-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-family: "JetBrains Mono", monospace;
          font-size: 12px;
          font-weight: 700;
          color: var(--hh-gold-1);
          background: rgba(245, 215, 110, 0.08);
          border: 1px dashed rgba(245, 215, 110, 0.4);
          border-radius: 20px;
          padding: 4px 10px;
        }

        /* ─── CLAIM BUTTON (Copy-Link style gradient pill) ─── */
        .hh-claim-btn {
          width: 100%;
          padding: 15px;
          border-radius: 999px;
          font-family: "Syne", sans-serif;
          font-weight: 800;
          font-size: 15px;
          border: none;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .hh-claim-btn:hover {
          transform: translateY(-2px);
        }
        .hh-claim-btn:active {
          transform: scale(0.98);
        }

        .hh-claim-ready {
          background: linear-gradient(90deg, #2ecc8f, #f5d76e);
          color: var(--hh-text-dark);
          box-shadow:
            0 0 22px rgba(245, 215, 110, 0.45),
            0 0 22px rgba(46, 204, 143, 0.3);
          animation: hh-claim-glow 2s ease-in-out infinite;
        }

        @keyframes hh-claim-glow {
          0%,
          100% {
            box-shadow:
              0 0 22px rgba(245, 215, 110, 0.45),
              0 0 22px rgba(46, 204, 143, 0.3);
          }
          50% {
            box-shadow:
              0 0 34px rgba(245, 215, 110, 0.6),
              0 0 34px rgba(46, 204, 143, 0.4);
          }
        }

        .hh-claim-waiting {
          background: rgba(255, 255, 255, 0.07);
          cursor: not-allowed;
          color: rgba(255, 255, 255, 0.4);
        }

        .hh-claim-paused {
          background: linear-gradient(
            135deg,
            rgba(224, 168, 56, 0.3),
            rgba(224, 168, 56, 0.15)
          );
          border: 1px solid rgba(224, 168, 56, 0.3);
          color: var(--hh-gold-1);
          cursor: pointer;
        }

        .hh-claim-shimmer {
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.35),
            transparent
          );
          animation: hh-shimmer-slide 2.5s ease-in-out infinite;
        }

        @keyframes hh-shimmer-slide {
          0% {
            left: -100%;
          }
          100% {
            left: 200%;
          }
        }

        /* ─── CLAIM SUCCESS POPUP ─── */
        .hh-claim-success-popup {
          position: absolute;
          top: -120px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #0f2c22, #123726);
          border: 1px solid rgba(245, 215, 110, 0.35);
          border-radius: 18px;
          padding: 16px 24px;
          text-align: center;
          box-shadow:
            0 20px 60px rgba(0, 0, 0, 0.5),
            0 0 30px rgba(46, 204, 143, 0.2);
          min-width: 160px;
          animation: hh-popup-bounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)
            forwards;
          z-index: 50;
        }

        @keyframes hh-popup-bounce {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(20px) scale(0.9);
          }
          70% {
            opacity: 1;
            transform: translateX(-50%) translateY(-6px) scale(1.05);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
          }
        }

        .hh-success-bar {
          height: 3px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 3px;
          overflow: hidden;
          margin-top: 8px;
        }

        .hh-success-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #2ecc8f, #f5d76e);
          border-radius: 3px;
          animation: hh-bar-drain 3s linear forwards;
        }

        @keyframes hh-bar-drain {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }

        /* ─── CONFETTI (green/gold only) ─── */
        .hh-confetti-dot {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          animation: hh-confetti-fall 0.8s ease-out forwards;
        }

        .hh-confetti-1 {
          top: 5px;
          left: 20%;
          background: #f5d76e;
          animation-delay: 0s;
        }
        .hh-confetti-2 {
          top: 5px;
          left: 40%;
          background: #2ecc8f;
          animation-delay: 0.1s;
        }
        .hh-confetti-3 {
          top: 5px;
          left: 60%;
          background: #e0a838;
          animation-delay: 0.05s;
        }
        .hh-confetti-4 {
          top: 5px;
          left: 75%;
          background: #34d399;
          animation-delay: 0.15s;
        }
        .hh-confetti-5 {
          top: 5px;
          left: 10%;
          background: #f5d76e;
          animation-delay: 0.2s;
        }

        @keyframes hh-confetti-fall {
          0% {
            transform: translateY(0) rotate(0);
            opacity: 1;
          }
          100% {
            transform: translateY(50px) rotate(360deg);
            opacity: 0;
          }
        }

        /* ─── PROGRESS ─── */
        .hh-progress-track {
          width: 80px;
          height: 5px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          overflow: hidden;
        }

        .hh-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #2ecc8f, #f5d76e);
          border-radius: 10px;
          transition: width 0.5s ease;
          box-shadow: 0 0 6px rgba(46, 204, 143, 0.5);
        }

        /* ─── STATS ROW ─── */
        .hh-stats-row {
          display: flex;
          align-items: center;
          background: rgba(8, 14, 10, 0.45);
          border: 1px solid rgba(18, 25, 15, 0.2);
          border-radius: 12px;
          padding: 12px 16px;
          backdrop-filter: blur(4px);
        }

        .hh-stat-item {
          flex: 1;
          text-align: center;
        }
        .hh-stat-divider {
          width: 1px;
          height: 32px;
          background: rgba(255, 255, 255, 0.1);
        }
        .hh-stat-label {
          font-size: 11px;
          color: rgba(241, 243, 245, 0.55);
          font-weight: 500;
        }
        .hh-stat-value {
          font-size: 14px;
          font-weight: 800;
          margin-top: 2px;
        }

        /* ─── SECTION TITLE ─── */
        .hh-section-title {
          font-size: 15px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.01em;
        }

        /* ─── ACTION CARDS GRID (Quick Actions) ───
              Circular glowing-ring icons like the "Earning Steps" row in the
              reference, alternating green / gold rings left-to-right. */
        .hh-action-card {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 16px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.25s ease;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          animation: hh-card-appear 0.4s ease-out both;
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

        .hh-action-card::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg,
            rgba(46, 204, 143, 0.08),
            rgba(245, 215, 110, 0.06)
          );
          opacity: 0;
          transition: opacity 0.25s ease;
          border-radius: 16px;
        }

        .hh-action-card:hover {
          transform: translateY(-4px) scale(1.02);
          border-color: rgba(46, 204, 143, 0.3);
          box-shadow:
            0 12px 30px rgba(0, 0, 0, 0.3),
            0 0 20px rgba(46, 204, 143, 0.08);
        }

        .hh-action-card:hover::before {
          opacity: 1;
        }
        .hh-action-card:active {
          transform: scale(0.97);
        }

        .hh-action-card-icon {
          font-size: 22px;
          line-height: 1;
          width: 46px;
          height: 46px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(
            circle at 40% 35%,
            rgba(255, 255, 255, 0.06),
            rgba(0, 0, 0, 0.25)
          );
          border: 1.5px solid var(--hh-green-1);
          box-shadow:
            0 0 14px rgba(46, 204, 143, 0.45),
            inset 0 0 10px rgba(46, 204, 143, 0.2);
          margin-bottom: 2px;
        }

        /* alternate ring color green / gold across the 2-column grid */
        .hh-action-grid > *:nth-child(even) .hh-action-card-icon {
          border-color: var(--hh-gold-1);
          box-shadow:
            0 0 14px rgba(245, 215, 110, 0.45),
            inset 0 0 10px rgba(245, 215, 110, 0.2);
        }

        .hh-action-card-arrow {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.25);
          margin-top: 8px;
          transition:
            color 0.2s,
            transform 0.2s;
        }

        .hh-action-card:hover .hh-action-card-arrow {
          color: var(--hh-green-1);
          transform: translateX(4px);
        }

        /* ─── SUPPORT BUTTONS (recolored to the green/gold duo) ─── */
        .hh-support-btn {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition:
            transform 0.2s,
            box-shadow 0.2s;
        }

        .hh-support-btn:hover {
          transform: scale(1.08);
        }
        .hh-support-btn:active {
          transform: scale(0.95);
        }

        .hh-support-blue {
          background: linear-gradient(135deg, #e0a838, #b9822a);
          box-shadow: 0 4px 12px rgba(224, 168, 56, 0.3);
        }
        .hh-support-green {
          background: linear-gradient(135deg, #2ecc8f, #22b57d);
          box-shadow: 0 4px 12px rgba(46, 204, 143, 0.3);
        }

        .hh-notif-dot {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 8px;
          height: 8px;
          background: #ef4444;
          border-radius: 50%;
          border: 2px solid var(--hh-bg-1);
          animation: hh-live-pulse 1.5s ease-in-out infinite;
        }

        /* ─── TRANSACTION ITEMS ─── */
        .hh-tx-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          transition: all 0.2s ease;
          animation: hh-card-appear 0.4s ease-out both;
        }

        .hh-tx-item:hover {
          background: rgba(255, 255, 255, 0.06);
          transform: translateX(2px);
        }

        .hh-tx-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 900;
          flex-shrink: 0;
        }

        .hh-tx-credit {
          background: rgba(46, 204, 143, 0.15);
          color: var(--hh-green-1);
          border: 1px solid rgba(46, 204, 143, 0.2);
        }
        .hh-tx-debit {
          background: rgba(224, 168, 56, 0.15);
          color: var(--hh-gold-1);
          border: 1px solid rgba(224, 168, 56, 0.2);
        }

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
          color: var(--hh-green-1);
          background: rgba(46, 204, 143, 0.08);
          border: 1px solid rgba(46, 204, 143, 0.2);
          border-radius: 20px;
          padding: 4px 12px;
          transition: all 0.2s;
          text-decoration: none;
        }

        .hh-see-more-btn:hover {
          background: rgba(46, 204, 143, 0.15);
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
          background: linear-gradient(135deg, #2ecc8f, #f5d76e);
          border: 2px solid rgba(255, 255, 255, 0.25);
          color: #0a150f;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow:
            0 4px 20px rgba(46, 204, 143, 0.4),
            0 4px 20px rgba(245, 215, 110, 0.25);
          transition: all 0.3s ease;
          z-index: 35;
        }

        .hh-floating-chat-btn:hover {
          transform: scale(1.1);
          box-shadow:
            0 6px 30px rgba(46, 204, 143, 0.55),
            0 6px 30px rgba(245, 215, 110, 0.35);
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

        /* ─── BOTTOM NAV (active tab gets the green→gold underline from the
              reference's "Dashboard" nav item) ─── */
        .hh-bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          max-width: 448px;
          margin: 0 auto;
          background: rgba(10, 14, 20, 0.85);
          backdrop-filter: blur(20px) saturate(140%);
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
          color: #5b6672;
          text-decoration: none;
          font-size: 11px;
          font-weight: 600;
          transition:
            color 0.2s,
            transform 0.2s;
          padding: 8px 16px;
          border-radius: 12px;
          position: relative;
        }

        .hh-nav-item:hover {
          color: var(--hh-green-1);
          transform: translateY(-2px);
        }

        .hh-nav-active {
          color: #ffffff !important;
        }
        .hh-nav-active svg {
          filter: drop-shadow(0 0 6px rgba(46, 204, 143, 0.6));
        }
        .hh-nav-active::after {
          content: "";
          position: absolute;
          left: 14px;
          right: 14px;
          bottom: 2px;
          height: 2px;
          border-radius: 2px;
          background: linear-gradient(
            90deg,
            var(--hh-green-1),
            var(--hh-gold-1)
          );
        }

        /* ─── DIALOG ─── */
        .hh-dialog {
          background: linear-gradient(135deg, #0e1c17, #0a1410) !important;
          border: 1px solid rgba(46, 204, 143, 0.18) !important;
          border-radius: 20px !important;
          color: white !important;
        }

        .hh-btn-primary {
          background: linear-gradient(90deg, #2ecc8f, #22b57d);
          color: #06150f;
          font-weight: 700;
          border-radius: 999px;
          padding: 10px;
          box-shadow: 0 0 16px rgba(46, 204, 143, 0.3);
        }

        .hh-btn-secondary {
          background: linear-gradient(90deg, #f5d76e, #e0a838);
          color: var(--hh-text-dark);
          font-weight: 700;
          border-radius: 999px;
          padding: 10px;
          box-shadow: 0 0 16px rgba(245, 215, 110, 0.3);
        }

        .hh-btn-blue {
          background: transparent;
          border: 1.5px dashed rgba(245, 215, 110, 0.55);
          color: var(--hh-gold-1);
          font-weight: 700;
          border-radius: 999px;
          padding: 10px;
        }

        /* ─── STAGGERED ENTRY ANIMATIONS ─── */
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

        /* ─── BROWSER CHECK POPUP (dashed link box mirrors the reference's
              "Share & Grow" referral input treatment) ─── */
        .hh-browser-check-popup {
          background: linear-gradient(135deg, #0e1c17, #0a1410);
          border: 1px solid rgba(46, 204, 143, 0.2);
          border-radius: 18px;
          padding: 16px;
          max-width: 380px;
          width: 100%;
          max-height: 70vh;
          overflow-y: auto;
          margin: auto 0;
          -webkit-overflow-scrolling: touch;
          line-height: 1.25;
          overscroll-behavior: contain;
          box-shadow:
            0 30px 80px rgba(0, 0, 0, 0.6),
            0 0 30px rgba(46, 204, 143, 0.1);
          animation: hh-browser-check-appear 0.4s
            cubic-bezier(0.34, 1.56, 0.64, 1);
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
          gap: 6px;
          margin-bottom: 10px;
        }

        .hh-browser-check-icon {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: linear-gradient(
            135deg,
            rgba(46, 204, 143, 0.2),
            rgba(46, 204, 143, 0.05)
          );
          border: 1px solid rgba(46, 204, 143, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 20px rgba(46, 204, 143, 0.15);
        }

        .hh-browser-check-link-container {
          background: rgba(46, 204, 143, 0.08);
          border: 1px solid rgba(46, 204, 143, 0.2);
          border-radius: 10px;
          padding: 10px;
          margin-bottom: 10px;
        }

        .hh-browser-check-link-box {
          background: rgba(0, 0, 0, 0.3);
          border: 1.5px dashed rgba(245, 215, 110, 0.45);
          border-radius: 8px;
          padding: 6px;
          margin-bottom: 6px;
          overflow-x: auto;
          max-height: 48px;
          overflow-y: auto;
        }

        .hh-browser-check-copy-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 7px;
          background: linear-gradient(90deg, #2ecc8f, #f5d76e);
          border: none;
          border-radius: 999px;
          color: var(--hh-text-dark);
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .hh-browser-check-copy-btn:hover {
          box-shadow:
            0 0 20px rgba(46, 204, 143, 0.35),
            0 0 20px rgba(245, 215, 110, 0.3);
          transform: translateY(-2px);
        }

        .hh-browser-check-copy-btn:active {
          transform: scale(0.98);
        }

        .hh-browser-check-copy-copied {
          background: linear-gradient(90deg, #22b57d, #e0a838);
          box-shadow: 0 0 25px rgba(46, 204, 143, 0.4);
        }

        .hh-browser-check-divider {
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(46, 204, 143, 0.25),
            rgba(245, 215, 110, 0.25),
            transparent
          );
          margin: 10px 0;
        }

        .hh-browser-check-close-btn {
          background: linear-gradient(90deg, #2ecc8f, #22b57d);
          color: #06150f;
          font-weight: 700;
          font-size: 13px;
          border: none;
          border-radius: 999px;
          padding: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 6px 20px rgba(46, 204, 143, 0.3);
        }

        .hh-browser-check-close-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(46, 204, 143, 0.5);
        }

        .hh-browser-check-close-btn:active {
          transform: scale(0.98);
        }

        /* ─── DESKTOP / TABLET REFINEMENT ───
              Layout stays single-column (this is an app dashboard, not a
              marketing page) but breathes a bit more on larger viewports. */
        @media (min-width: 640px) {
          .hh-container.max-w-md {
            max-width: 30rem;
          }
          .hh-bottom-nav {
            max-width: 30rem;
            border-radius: 20px 20px 0 0;
          }
          .hh-card:hover {
            transform: translateY(-3px);
          }
        }

        /* ─── REDUCED MOTION ─── */
        @media (prefers-reduced-motion: reduce) {
          .hh-bubble,
          .hh-orb-1,
          .hh-orb-2,
          .hh-avatar-ring,
          .hh-live-dot,
          .hh-claim-ready,
          .hh-claim-shimmer,
          [class*="hh-entry-"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

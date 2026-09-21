"use client";

import type React from "react";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Gamepad2,
  History,
  Home,
  Bell,
  BellOff,
  User,
  Gift,
  Clock,
  Flame,
  Mail,
  Shield,
  TrendingUp,
  Users,
  MessageCircle,
  Leaf,
  Zap,
  HandCoins,
  Sparkles,
  Star,
  Trophy,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardImageCarousel } from "@/components/dashboard-image-carousel";
import { WithdrawalNotification } from "@/components/withdrawal-notification";
import { ReferralCard } from "@/components/referral-card";
import { TutorialModal } from "@/components/tutorial-modal";
import { ScrollingText } from "@/components/scrolling-text";
import { LiveChat } from "@/components/live-chat";
import dynamic from "next/dynamic";
const GuidedOnboarding = dynamic(() => import("@/components/guided-onboarding").then(m => m.GuidedOnboarding), { ssr: false }) as any;
import { getBankDetails } from "@/lib/bank-details";
import { readyUnseenCount, refreshPendingStatuses, listActivePendings } from "@/lib/pending-withdrawals";
import { BottomNav } from "@/components/bottom-nav";
import { loadMeta, saveMeta, computeScore, getLevel, getNextLabel, getProgress, getEarnPerTap, hydrateTrustFromServer, TRUST_TIME_KEY } from "@/lib/trust-score";
import { useToast } from "@/hooks/use-toast";
import {
  ensurePushRegistrationIntegrity,
  registerForFCM,
  requestNotificationPermission,
  showLocalNotification,
  getSubscriptionStatus,
  getLastPushError,
  mintNotifyToken,
  runPushDiagnostics,
  scheduleReminder,
  pingDueNotifications,
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

const TAP_MAX_ENERGY = 100;
const TAP_EARN_PER = 100;
const TAP_ENERGY_REGEN_MS = 6000;
const TAP_STORAGE_KEY = "tap_earn_state";
const TAP_EXHAUST_COOLDOWN_MS = 10 * 60 * 1000; // 10 mins wait when 100/100 exhausted
const TAP_EXHAUST_KEY = "tap_exhaust_until";
const AUTO_TAP_KEY = "auto_tap_state";
type AutoPlanId = "free1h" | "24h" | "2d" | "3d" | "1w";
const AUTO_PLANS: { id: AutoPlanId; label: string; sub: string; durationMs: number; maxTaps: number; maxEarn: number }[] = [
  { id: "free1h", label: "20 mins FREE", sub: "First time only", durationMs: 20*60*1000, maxTaps: 200, maxEarn: 20000 },
  { id: "24h", label: "24 hours: 1500 taps", sub: "max 150,000", durationMs: 24*60*60*1000, maxTaps: 1500, maxEarn: 150000 },
  { id: "2d", label: "2 days: 3500 taps", sub: "max 350,000", durationMs: 2*24*60*60*1000, maxTaps: 3500, maxEarn: 350000 },
  { id: "3d", label: "3 days: 5500 taps", sub: "max 550,000", durationMs: 3*24*60*60*1000, maxTaps: 5500, maxEarn: 550000 },
  { id: "1w", label: "1 week: 10,000 taps", sub: "max 1,000,000", durationMs: 7*24*60*60*1000, maxTaps: 10000, maxEarn: 1000000 },
];
const AUTO_TAP_INTERVAL_MS = 300; // was 800 (0.8s), reduced by 0.5s per task spec
const getAutoIntervalMs = (planId: AutoPlanId) => {
  const p = AUTO_PLANS.find(x=>x.id===planId);
  if (!p) return AUTO_TAP_INTERVAL_MS;
  return Math.max(900, Math.floor(p.durationMs / p.maxTaps));
};
const AUTO_REQ_TASK: Record<AutoPlanId, number> = { free1h: 0, "24h": 20, "2d": 30, "3d": 40, "1w": 100 };
const AUTO_REQ_REF: Record<AutoPlanId, number> = { free1h: 0, "24h": 10, "2d": 20, "3d": 30, "1w": 50 };
const AUTO_REQ_PAY: Record<AutoPlanId, number> = { free1h: 0, "24h": 15000, "2d": 20000, "3d": 30000, "1w": 50000 };
const AUTO_REF_LINK_KEY = "auto_tap_ref_code";
const AUTO_PLAN_COOLDOWN_KEY = "auto_tap_plan_cooldowns";
const AUTO_PLAN_COOLDOWN_MS = 7*24*60*60*1000;

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
  // Mail inbox (messages only): tapping opens inbox popup. If empty shows
  // "Inbox is empty" and does NOT navigate to chats/history.
  const [mailCount, setMailCount] = useState(0);
  const [showInbox, setShowInbox] = useState(false);
  const [inboxReady, setInboxReady] = useState<any[]>([]);
  const [inboxUnread, setInboxUnread] = useState(0);
  // Server inbox feed (push ↔ inbox sync): pushes land here too, cross-device.
  const [inboxFeed, setInboxFeed] = useState<any[]>([]);
  const [inboxFeedUnread, setInboxFeedUnread] = useState(0);
  const [boochatJoined, setBoochatJoined] = useState(false);
  const [boochatPartnerName, setBoochatPartnerName] = useState("");
  const refreshInboxFeed = useCallback(async (uid: string) => {
    if (!uid) return;
    try {
      const r = await fetch(`/api/notify/inbox?userId=${encodeURIComponent(uid)}&t=${Date.now()}`);
      const d = await r.json().catch(() => ({} as any));
      if (d && (d as any).success && Array.isArray((d as any).items)) {
        setInboxFeed((d as any).items.slice(0, 50));
        setInboxFeedUnread(Number((d as any).unread || 0));
        try { setBoochatJoined(Boolean((d as any).boochatJoined)); } catch {}
        try { setBoochatPartnerName(String((d as any).partnerName || "")); } catch {}
      }
    } catch {}
  }, []);
  const markInboxRead = useCallback(async (uid: string, ids?: string[]) => {
    if (!uid) return;
    try {
      await fetch("/api/notify/inbox/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ids && ids.length > 0 ? { userId: uid, ids } : { userId: uid, all: true }),
      });
    } catch {}
    if (!ids || ids.length === 0) {
      setInboxFeed((prev) => prev.map((f: any) => ({ ...f, read: true })));
      setInboxFeedUnread(0);
    } else {
      const set = new Set(ids);
      setInboxFeed((prev) => prev.map((f: any) => (set.has(String(f.id)) ? { ...f, read: true } : f)));
      setInboxFeedUnread((prev) => Math.max(0, prev - ids.length));
    }
  }, []);
  useEffect(() => {
    const update = () => {
      try {
        refreshPendingStatuses();
        const pend = readyUnseenCount();
        let unread = 0;
        try { unread = Number(localStorage.getItem("tivexx-support-unread") || 0) || 0; } catch {}
        setMailCount(pend + unread);
      } catch {}
    };
    update();
    const id = setInterval(update, 30000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    window.addEventListener("tivexx:support-unread", update as EventListener);
    window.addEventListener("tivexx:update", update as EventListener);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("tivexx:support-unread", update as EventListener);
      window.removeEventListener("tivexx:update", update as EventListener);
    };
  }, []);
  // Foreground expedite: while a session is open, flush THIS user's due
  // server reminders now (auto finish / refill). Throttled to ~60s; the
  // scheduled cron covers truly-offline users. Best-effort, never blocks.
  const lastDuePing = useRef(0);
  useEffect(() => {
    const uid = (userData as any)?.id || (userData as any)?.userId || "";
    if (!uid) return;
    const ping = () => {
      const now = Date.now();
      if (now - lastDuePing.current < 60000) return;
      lastDuePing.current = now;
      void pingDueNotifications(uid).catch(() => {});
    };
    ping();
    const id = setInterval(ping, 60000);
    const onReturn = () => { if (document.visibilityState === "visible") ping(); };
    window.addEventListener("focus", onReturn);
    document.addEventListener("visibilitychange", onReturn);
    return () => { clearInterval(id); window.removeEventListener("focus", onReturn); document.removeEventListener("visibilitychange", onReturn); };
  }, [userData]);
  const openInbox = () => {
    try {
      refreshPendingStatuses();
      const all = listActivePendings();
      setInboxReady(all.filter((p: any) => p.status === "ready"));
      let unread = 0;
      try { unread = Number(localStorage.getItem("tivexx-support-unread") || 0) || 0; } catch {}
      setInboxUnread(unread);
      try {
        const raw = localStorage.getItem("tivexx-user");
        const u = raw ? JSON.parse(raw) : null;
        const uid = u?.id || u?.userId || u?.user_id || "";
        if (uid) void refreshInboxFeed(uid);
      } catch {}
    } catch {
      setInboxReady([]);
      setInboxUnread(0);
    }
    setShowInbox(true);
  };
  // Server inbox feed also refreshes in the background (badge stays live).
  useEffect(() => {
    const raw = (() => { try { return localStorage.getItem("tivexx-user"); } catch { return null; } })();
    const u = raw ? JSON.parse(raw || "null") : null;
    const uid = (u as any)?.id || (u as any)?.userId || (u as any)?.user_id || "";
    if (!uid) return;
    void refreshInboxFeed(uid);
    const id = setInterval(() => { void refreshInboxFeed(uid); }, 30000);
    const onReturn = () => { if (document.visibilityState === "visible") void refreshInboxFeed(uid); };
    const onFocus = () => { void refreshInboxFeed(uid); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onReturn);
    return () => { clearInterval(id); window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onReturn); };
  }, [userData, refreshInboxFeed]);
  // Live-sync round avatar when profile picture/name changes in Profile tab.
  // Also re-attach persisted picture on mount (survives reloads/cookie restores).
  useEffect(() => {
    let unsub: (() => void) | undefined;
    import("@/lib/profile-picture").then((m) => {
      try {
        // Re-attach on mount first.
        try {
          const raw = localStorage.getItem("tivexx-user");
          if (raw) {
            const stored = JSON.parse(raw);
            if (!stored?.profilePicture) {
              import("@/lib/session-client").then((s) => {
                try {
                  const kept = (s as any).getPersistedProfilePicture?.(stored);
                  if (kept) {
                    const merged = { ...stored, profilePicture: kept };
                    try { localStorage.setItem("tivexx-user", JSON.stringify(merged)); } catch {}
                    setUserData((prev: any) => ({ ...((prev || {}) as any), ...merged }));
                  }
                } catch {}
              }).catch(() => {});
            }
          }
        } catch {}
        unsub = m.subscribeToUserUpdates((u: any) => { if (u) setUserData((prev: any) => ({ ...(prev || {}), ...u })); });
      } catch {}
    }).catch(() => {});
    return () => { try { unsub?.(); } catch {} };
  }, []);
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
  // ── Tap-to-Earn inline round orb (carried into balance card) ──
  const [tapEnergy, setTapEnergy] = useState(TAP_MAX_ENERGY);
  const [tapEarned, setTapEarned] = useState(0);
  const [tapTapping, setTapTapping] = useState(false);
  const [tapParticles, setTapParticles] = useState<{id:number,x:number,y:number}[]>([]);
  const tapPid = useRef(0);
  const tapAccum = useRef(0);
  const tapSyncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tapExhaustUntil, setTapExhaustUntil] = useState<number | null>(null);
  const [tapExhaustLeft, setTapExhaustLeft] = useState(0);
  // Rapid tap detection — >3 taps in 1 sec triggers warning
  const [tapTimestamps, setTapTimestamps] = useState<number[]>([]);
  const [showRapidTapWarning, setShowRapidTapWarning] = useState(false);
  const rapidTapWarningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // auto tap
  const [autoActive, setAutoActive] = useState(false);
  const [autoPlan, setAutoPlan] = useState<AutoPlanId | null>(null);
  const [autoExpiresAt, setAutoExpiresAt] = useState<number | null>(null);
  // Wall-clock anchor for auto accrual: progress = f(now - startedAt), so it
  // keeps counting while the tab is throttled, hidden, or the app is closed.
  const [autoStartedAt, setAutoStartedAt] = useState<number | null>(null);
  const [autoTapsDone, setAutoTapsDone] = useState(0);
  const [autoLeftMs, setAutoLeftMs] = useState(0);
  const [autoFirstFreeUsed, setAutoFirstFreeUsed] = useState(false);
  const [showAutoPlans, setShowAutoPlans] = useState(false);
  const [showAutoFreePopup, setShowAutoFreePopup] = useState(false);
  const [showAutoReq, setShowAutoReq] = useState(false);
  const [reqPlan, setReqPlan] = useState<AutoPlanId | null>(null);
  const [reqChoice, setReqChoice] = useState<"task"|"referral"|"payment"|null>(null);
  const [autoRefCode, setAutoRefCode] = useState<string>("");
  const [autoRefCount, setAutoRefCount] = useState(0);
  const [autoTaskDone, setAutoTaskDone] = useState(0);
  const [mtTaskDone, setMtTaskDone] = useState(0);
  const [muTaskDone, setMuTaskDone] = useState(0);
  // per-plan isolated counts — each AutoPlanId tracks its own tasks from 0 (no carry-over)
  const [perPlanTaskDone, setPerPlanTaskDone] = useState<Record<string, number>>({});
  const getPerPlanTaskKey = useCallback((planId: AutoPlanId) => {
    if (planId === "24h") return "mt-completed-tasks-24h";
    if (planId === "3d") return "mt-completed-tasks-3d";
    if (planId === "2d") return "mu-completed-tasks-2d";
    if (planId === "1w") return "mu-completed-tasks-1w";
    return "auto-tap-completed-tasks";
  }, []);
  const getPerPlanDone = useCallback((planId: AutoPlanId | null) => {
    if (!planId) return 0;
    return perPlanTaskDone[planId] ?? 0;
  }, [perPlanTaskDone]);
  const [autoPlanCooldowns, setAutoPlanCooldowns] = useState<Record<string, number>>({});
  const [nowTick, setNowTick] = useState(() => Date.now());
  // Spin & Win 3/3 exhausted guard — popup when entering from dashboard
  const [showSpinExhaustedPopup, setShowSpinExhaustedPopup] = useState(false);
  // Auto-tap toggle-off warning
  const [showAutoToggleWarning, setShowAutoToggleWarning] = useState(false);
  const confirmAutoToggleOff = useCallback(() => {
    setShowAutoToggleWarning(false);
    setAutoActive(false);
    setAutoExpiresAt(null);
    toast({ title: "Auto tap OFF" });
  }, [toast]);
  // ── Spin entry guard: if 3/3 exhausted, show popup instead of navigating ──
  const isSpinExhausted = useCallback(() => {
    try {
      const now = Date.now();
      // 1) Stake per-tier cooldowns (20/30/40) — primary source
      try {
        const raw = localStorage.getItem("spin_tier_cooldowns");
        if (raw) {
          const parsed = JSON.parse(raw);
          const getExp = (pct: number) => {
            const v: any = (parsed as any)[pct];
            if (typeof v === "number") return v;
            if (v && typeof v === "object") {
              const vals = Object.values(v) as number[];
              return vals.length ? Math.max(...vals) : 0;
            }
            return 0;
          };
          const hasAny = [20, 30, 40].some((p) => getExp(p) > 0);
          if (hasAny && [20, 30, 40].every((p) => getExp(p) > now)) return true;
        }
      } catch {}
      // 2) Legacy spin page timestamps (3 spins / 24h)
      try {
        const stored = localStorage.getItem("spinTimestamps");
        if (stored) {
          const ts: number[] = JSON.parse(stored);
          const recent = Array.isArray(ts) ? ts.filter((t) => now - t < 24 * 60 * 60 * 1000) : [];
          if (recent.length >= 3) return true;
        }
      } catch {}
      return false;
    } catch { return false; }
  }, []);
  const handlePlayWinClick = useCallback((e: React.MouseEvent) => {
    if (isSpinExhausted()) {
      e.preventDefault();
      setShowSpinExhaustedPopup(true);
    } else {
      router.push("/stake");
    }
  }, [isSpinExhausted, router]);
  // ── Trust Score (compounding) ──
  const [trustScore, setTrustScore] = useState(0);
  const [trustMeta, setTrustMeta] = useState<any>(null);
  // Per-tap rate grows with trust: Free ₦100, Beginner ₦110, +₦10/level.
  const earnPerTap = getEarnPerTap(trustScore);
  const earnPerTapRef = useRef(earnPerTap);
  earnPerTapRef.current = earnPerTap;
  // Auto-tap orb FX particles (visible fast rewards while auto is ON).
  const [autoFx, setAutoFx] = useState<{ id: number; text: string; emoji: string; x: number }[]>([]);
  const autoFxId = useRef(0);
  const [showTrustInfo, setShowTrustInfo] = useState(false);
  const [showGuided, setShowGuided] = useState(false);
  // Notification prompt — only shown after successful login/signup (gated behind auth, not for guests)
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<{ hasAny: boolean; hasFcm: boolean; hasWebpush: boolean } | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  // One-time offline-alerts unlock for pre-token sessions (password confirm).
  const [confirmPw, setConfirmPw] = useState("");
  const [mintingToken, setMintingToken] = useState(false);
  const [mintMsg, setMintMsg] = useState("");
  // In-app push diagnostics (read-only checklist).
  const [diag, setDiag] = useState<{ marker: string; rows: { key: string; label: string; ok: boolean; detail: string }[] } | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);

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
                  href="https://Moneymate.online"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 underline"
                >
                  Moneymate.online
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

  // ── Tap-to-Earn: load + persist + exhaust 10min + auto tap (NO gradual refill) ──
  // Wall-clock exhaust: tapExhaustUntil timestamp keeps moving while the app
  // is closed, so the FILLING water + countdown catch up on return (same as auto-tap).
  const tapHydratedRef = useRef(false);
  const resyncExhaustFromStorage = useCallback(() => {
    try {
      const ex = localStorage.getItem(TAP_EXHAUST_KEY);
      if (!ex) return false;
      const until = Number(ex);
      if (until > Date.now()) {
        setTapExhaustUntil((prev) => (prev === until ? prev : until));
        setTapEnergy(0);
        return true;
      }
      // Cooldown expired while away (tab closed/hidden) — snap to full
      // instead of restarting a new 10-min timer.
      try { localStorage.removeItem(TAP_EXHAUST_KEY); } catch {}
      setTapExhaustUntil(null);
      setTapExhaustLeft(0);
      setTapEnergy(TAP_MAX_ENERGY);
      try {
        const raw = localStorage.getItem(TAP_STORAGE_KEY);
        const s = raw ? JSON.parse(raw) : {};
        localStorage.setItem(TAP_STORAGE_KEY, JSON.stringify({ energy: TAP_MAX_ENERGY, earned: s.earned || 0, lastTime: Date.now() }));
      } catch {}
      return false;
    } catch { return false; }
  }, []);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TAP_STORAGE_KEY);
      let storedEnergy: number | null = null;
      let storedEarned = 0;
      if (raw) {
        const s = JSON.parse(raw);
        // No gradual refill: keep exact stored energy; only exhaust countdown refills to 100
        storedEnergy = Math.min(TAP_MAX_ENERGY, Math.max(0, s.energy ?? TAP_MAX_ENERGY));
        storedEarned = s.earned || 0;
        setTapEnergy(storedEnergy);
        setTapEarned(storedEarned);
      }
      const ex = localStorage.getItem(TAP_EXHAUST_KEY);
      if (ex) {
        const until = Number(ex);
        if (until > Date.now()) { setTapExhaustUntil(until); setTapEnergy(0); }
        else {
          // Expired while the app was closed — refill to full immediately.
          try { localStorage.removeItem(TAP_EXHAUST_KEY); } catch {}
          setTapExhaustUntil(null);
          setTapExhaustLeft(0);
          setTapEnergy(TAP_MAX_ENERGY);
          try { localStorage.setItem(TAP_STORAGE_KEY, JSON.stringify({ energy: TAP_MAX_ENERGY, earned: storedEarned, lastTime: Date.now() })); } catch {}
        }
      } else if (storedEnergy === 0) {
        // Legacy 0-energy without a timestamp (or first depletion): start cooldown now.
        const until = Date.now() + TAP_EXHAUST_COOLDOWN_MS;
        setTapExhaustUntil(until);
        try { localStorage.setItem(TAP_EXHAUST_KEY, String(until)); } catch {}
      }
      const aRaw = localStorage.getItem(AUTO_TAP_KEY);
      if (aRaw) {
        const a = JSON.parse(aRaw);
        setAutoFirstFreeUsed(!!a.firstFreeUsed);
        if (a.active && a.expiresAt && a.expiresAt > Date.now() && a.tapsDone < (AUTO_PLANS.find(p=>p.id===a.planId)?.maxTaps ?? Infinity)) {
          setAutoActive(true); setAutoPlan(a.planId); setAutoExpiresAt(a.expiresAt); setAutoTapsDone(a.tapsDone||0);
          // startedAt persisted by newer builds; derive for older saved runs.
          const found = AUTO_PLANS.find(p=>p.id===a.planId);
          setAutoStartedAt(typeof a.startedAt === "number" && a.startedAt > 0 ? a.startedAt : (found ? a.expiresAt - found.durationMs : null));
        } else if (a.firstFreeUsed) {
          // keep flag
        }
      }
      try { 
        const cMt = JSON.parse(localStorage.getItem("mt-completed-tasks")||"[]"); setMtTaskDone(Array.isArray(cMt)?cMt.length:0);
        const cMu = JSON.parse(localStorage.getItem("mu-completed-tasks")||"[]"); setMuTaskDone(Array.isArray(cMu)?cMu.length:0);
        // legacy
        const c = JSON.parse(localStorage.getItem("auto-tap-completed-tasks")||"[]"); setAutoTaskDone(Array.isArray(c)?c.length:0);
        // per-plan isolated counts — start at 0 per plan, no carry-over between 2d/1w or 24h/3d
        const per: Record<string, number> = {};
        (["24h","2d","3d","1w"] as AutoPlanId[]).forEach(pid=>{ try{ const k = getPerPlanTaskKey(pid); const arr = JSON.parse(localStorage.getItem(k)||"[]"); per[pid]=Array.isArray(arr)?arr.length:0; }catch{ per[pid]=0; }});
        setPerPlanTaskDone(per);
        try { const cd = JSON.parse(localStorage.getItem(AUTO_PLAN_COOLDOWN_KEY)||"{}"); if (cd && typeof cd==="object") setAutoPlanCooldowns(cd); } catch {}
      } catch {}
    } catch {}
    tapHydratedRef.current = true;
  }, [resyncExhaustFromStorage]);
  useEffect(()=>{
    const id=setInterval(()=>{ try{ 
      const cMt = JSON.parse(localStorage.getItem("mt-completed-tasks")||"[]"); setMtTaskDone(Array.isArray(cMt)?cMt.length:0);
      const cMu = JSON.parse(localStorage.getItem("mu-completed-tasks")||"[]"); setMuTaskDone(Array.isArray(cMu)?cMu.length:0);
      const c = JSON.parse(localStorage.getItem("auto-tap-completed-tasks")||"[]"); setAutoTaskDone(Array.isArray(c)?c.length:0);
      const per: Record<string, number> = {};
      (["24h","2d","3d","1w"] as AutoPlanId[]).forEach(pid=>{ try{ const k = getPerPlanTaskKey(pid); const arr = JSON.parse(localStorage.getItem(k)||"[]"); per[pid]=Array.isArray(arr)?arr.length:0; }catch{ per[pid]=0; }});
      setPerPlanTaskDone(per);
    }catch{} }, 1000);
    const upd=()=>{ try{ 
      const cMt = JSON.parse(localStorage.getItem("mt-completed-tasks")||"[]"); setMtTaskDone(Array.isArray(cMt)?cMt.length:0);
      const cMu = JSON.parse(localStorage.getItem("mu-completed-tasks")||"[]"); setMuTaskDone(Array.isArray(cMu)?cMu.length:0);
      const c = JSON.parse(localStorage.getItem("auto-tap-completed-tasks")||"[]"); setAutoTaskDone(Array.isArray(c)?c.length:0);
      const per: Record<string, number> = {};
      (["24h","2d","3d","1w"] as AutoPlanId[]).forEach(pid=>{ try{ const k = getPerPlanTaskKey(pid); const arr = JSON.parse(localStorage.getItem(k)||"[]"); per[pid]=Array.isArray(arr)?arr.length:0; }catch{ per[pid]=0; }});
      setPerPlanTaskDone(per);
    }catch{} };
    window.addEventListener("focus",upd); window.addEventListener("storage",upd as any);
    return ()=>{ clearInterval(id); window.removeEventListener("focus",upd); window.removeEventListener("storage",upd as any); };
  }, []);
  // tick for 1-week lock countdown display
  useEffect(()=>{ const id=setInterval(()=> setNowTick(Date.now()), 60000); return ()=> clearInterval(id); }, []);
  // Per-plan progress bars read SERVER counts (track-task/status); localStorage keys stay as display cache only.
  useEffect(() => {
    let cancelled = false;
    const fetchServerCounts = async () => {
      try {
        const raw = localStorage.getItem("tivexx-user");
        const u = raw ? JSON.parse(raw) : null;
        const uid = u?.id || u?.userId || u?.user_id || "";
        if (!uid) return;
        const get = async (prefix: string) => {
          try {
            const r = await fetch(`/api/track-task/status?userId=${encodeURIComponent(uid)}&plan=${encodeURIComponent(prefix)}`);
            const j = await r.json().catch(() => ({}));
            return j?.success ? Number(j.count || 0) : 0;
          } catch { return 0; }
        };
        const [mt, mu, tiered] = await Promise.all([get("mt-"), get("mu-"), get("tiered-")]);
        if (cancelled) return;
        // Map server counts onto per-plan keys (24h/3d share mt-, 2d/1w share mu-; display keeps slicing).
        setPerPlanTaskDone((prev) => ({ ...prev, "24h": mt, "3d": mt, "2d": mu, "1w": mu }));
        setMtTaskDone(mt);
        setMuTaskDone(mu);
      } catch {}
    };
    void fetchServerCounts();
    const id = setInterval(fetchServerCounts, 15000);
    const onFocus = () => { void fetchServerCounts(); };
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; clearInterval(id); window.removeEventListener("focus", onFocus); };
  }, []);
  // exhaust countdown (wall-clock: derives from timestamp so background time counts)
  useEffect(() => {
    if (!tapExhaustUntil) { setTapExhaustLeft(0); return; }
    const tick = () => {
      const left = Math.max(0, tapExhaustUntil - Date.now());
      setTapExhaustLeft(left);
      if (left === 0) {
        setTapExhaustUntil(null);
        try { localStorage.removeItem(TAP_EXHAUST_KEY); } catch {}
        try { localStorage.removeItem("tap_refill_scheduled_for"); } catch {}
        setTapEnergy(TAP_MAX_ENERGY);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    // Catch up immediately when the user comes back (hidden tab / closed app).
    const onReturn = () => { if (document.visibilityState === "visible") { resyncExhaustFromStorage(); tick(); } };
    const onFocus = () => { resyncExhaustFromStorage(); tick(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onReturn);
    return () => { clearInterval(id); window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onReturn); };
  }, [tapExhaustUntil, resyncExhaustFromStorage]);
  // No gradual regen — energy stays depleted until 10-min exhaust countdown finishes, then snaps to 100 (handled in exhaust countdown effect)
  // (Removed TAP_ENERGY_REGEN_MS interval per requirement)
  // Guarded by tapHydratedRef so the initial render (energy=100) never
  // overwrites the stored 0-energy + exhaust timestamp before load runs.
  useEffect(() => {
    if (!tapHydratedRef.current) return;
    try { localStorage.setItem(TAP_STORAGE_KEY, JSON.stringify({ energy: tapEnergy, earned: tapEarned, lastTime: Date.now() })); } catch {}
    if (tapEnergy === 0 && !tapExhaustUntil) {
      // Re-check storage first: another tab may have just finished the cooldown.
      try {
        const ex = localStorage.getItem(TAP_EXHAUST_KEY);
        if (ex && Number(ex) <= Date.now()) { resyncExhaustFromStorage(); return; }
      } catch {}
      const until = Date.now() + TAP_EXHAUST_COOLDOWN_MS;
      setTapExhaustUntil(until);
      try { localStorage.setItem(TAP_EXHAUST_KEY, String(until)); } catch {}
      // Offline push: register the refill server-side ONCE per exhaustion so
      // the "energy refilled" notice can arrive even with the app closed.
      try {
        if (localStorage.getItem("tap_refill_scheduled_for") !== String(until)) {
          const raw = localStorage.getItem("tivexx-user");
          const u = raw ? JSON.parse(raw) : null;
          const uid = u?.id || u?.userId || "";
          if (uid) {
            localStorage.setItem("tap_refill_scheduled_for", String(until));
            void scheduleReminder({ kind: "tap_refill", userId: uid, endsAt: until }).catch(() => {});
          }
        }
      } catch {}
    }
  }, [tapEnergy, tapEarned, tapExhaustUntil, resyncExhaustFromStorage]);
  // ── Trust Score engine (compounding) ──
  useEffect(() => {
    // initial load
    try {
      const m = loadMeta();
      // Max-merge the separate counter keys with the meta (which may hold
      // server-merged values the keys don't have yet) — never overwrite
      // downwards, or the score flickers between two values.
      const payRaw = Number(localStorage.getItem("tivexx-pay-count") || "0") || 0;
      const navRaw = Number(localStorage.getItem("tivexx-nav-count") || "0") || 0;
      m.payCount = Math.max(payRaw, Number(m.payCount) || 0);
      m.navCount = Math.max(navRaw, Number(m.navCount) || 0);
      try {
        localStorage.setItem("tivexx-pay-count", String(m.payCount));
        localStorage.setItem("tivexx-nav-count", String(m.navCount));
      } catch {}
      setTrustMeta(m);
      setTrustScore(computeScore(m));
    } catch {}
    // track time spent (every 30s)
    const start = Date.now();
    let lastSave = Date.now();
    const tick = () => {
      try {
        const m = loadMeta();
        const prev = Number(localStorage.getItem(TRUST_TIME_KEY) || "0");
        // Active-time only: cap each tick so closing the app for hours/days
        // does NOT credit trust time. Max ~45s per 30s tick (timer slack).
        const now = Date.now();
        const rawDelta = now - lastSave;
        lastSave = now;
        const delta = Math.min(Math.max(0, rawDelta), 45000);
        const total = prev + delta;
        localStorage.setItem(TRUST_TIME_KEY, String(total));
        m.timeMs = total;
        // pull latest referral count from state if available
        // referralCount will be synced separately
        m.referralCount = autoRefCount || m.referralCount;
        // Max-merge (never overwrite): the meta may hold server-merged
        // counters the separate keys lack. A plain overwrite here dropped
        // the score (e.g. 76 → 6) until the next server hydrate restored
        // it — the visible flicker.
        const nav = Number(localStorage.getItem("tivexx-nav-count") || "0") || 0;
        const pay = Number(localStorage.getItem("tivexx-pay-count") || "0") || 0;
        m.navCount = Math.max(nav, Number(m.navCount) || 0);
        m.payCount = Math.max(pay, Number(m.payCount) || 0);
        try {
          localStorage.setItem("tivexx-nav-count", String(m.navCount));
          localStorage.setItem("tivexx-pay-count", String(m.payCount));
        } catch {}
        saveMeta(m);
        setTrustMeta({ ...m });
        setTrustScore(computeScore(m));
      } catch {}
    };
    const id = setInterval(tick, 30000);
    // count this page as a navigation
    try {
      const n = Number(localStorage.getItem("tivexx-nav-count") || "0");
      localStorage.setItem("tivexx-nav-count", String(n + 1));
    } catch {}
    // listen for future navigations (clicks on links)
    const onNav = () => {
      try {
        const n = Number(localStorage.getItem("tivexx-nav-count") || "0");
        localStorage.setItem("tivexx-nav-count", String(n + 1));
        const m = loadMeta(); m.navCount = n + 1; saveMeta(m); setTrustScore(computeScore(m));
      } catch {}
    };
    window.addEventListener("click", (e) => {
      const a = (e.target as HTMLElement)?.closest?.("a[href]");
      if (a) onNav();
    });
    // after 5 mins toast once
    const t5 = setTimeout(() => {
      try {
        const m = loadMeta();
        if (computeScore(m) > 0) toast({ title: "Trust Score +2", description: "You spent 5 mins — keep compounding!" });
      } catch {}
    }, 5 * 60 * 1000);
    return () => { clearInterval(id); clearTimeout(t5); };
  }, [autoRefCount, toast]);
  // sync referral count into trust meta when referral stats load
  useEffect(() => {
    if (!userData) return;
    try {
      const m = loadMeta();
      const rc = Number(userData.referral_count || userData.referralCount || autoRefCount || 0);
      if (rc !== m.referralCount) {
        m.referralCount = rc;
        saveMeta(m);
        setTrustScore(computeScore(m));
        setTrustMeta({ ...m });
        try{ const uid = (userData as any)?.id || (userData as any)?.userId; if(uid) void fetch("/api/user-trust",{method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ userId: uid, notifyToken: (userData as any)?.notifyToken || undefined, trustScore: computeScore(m), timeMs: m.timeMs, navCount: m.navCount, tapCount: m.tapCount, trustMeta: m })}).catch(()=>{});}catch{}
      }
    } catch {}
  }, [userData, autoRefCount]);
  // Periodically push trust activity to the server so users.trust_score
  // (which gates the ₦500 referral credit at Beginner 30) tracks the real
  // client score. Throttled to at most once per 60s.
  const lastTrustPush = useRef(0);
  useEffect(() => {
    if (!userData) return;
    const now = Date.now();
    if (now - lastTrustPush.current < 60000) return;
    lastTrustPush.current = now;
    try {
      const m = loadMeta();
      const uid = (userData as any)?.id || (userData as any)?.userId;
      if (!uid) return;
      void fetch("/api/user-trust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid, notifyToken: (userData as any)?.notifyToken || undefined, timeMs: m.timeMs, navCount: m.navCount, tapCount: m.tapCount, trustMeta: m }),
      }).catch(() => {});
    } catch {}
  }, [trustScore, userData]);
  // sync completed tasks → +1 each (compounding)
  useEffect(() => {
    try {
      const totalTasks = (mtTaskDone || 0) + (muTaskDone || 0) + (autoTaskDone || 0);
      // also include generic task key if present
      let generic = 0;
      try { const g = JSON.parse(localStorage.getItem("tivexx-completed-tasks") || "[]"); if (Array.isArray(g)) generic = g.length; } catch {}
      const all = totalTasks + generic;
      const m = loadMeta();
      const previous = Number(m.taskCount || 0);
      const nextTaskCount = Math.max(previous, all);
      if (nextTaskCount !== previous) {
        m.taskCount = nextTaskCount;
        saveMeta(m);
        setTrustScore(computeScore(m));
        setTrustMeta({ ...m });
      }
    } catch {}
  }, [mtTaskDone, muTaskDone, autoTaskDone]);
  // detect payment success (paystack callback sets tivexx-pay-count)
  useEffect(() => {
    const onStorage = () => {
      try { const m = loadMeta(); setTrustScore(computeScore(m)); setTrustMeta({ ...m }); } catch {}
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onStorage);
    return () => { window.removeEventListener("storage", onStorage); window.removeEventListener("focus", onStorage); };
  }, []);
  // Guided onboarding must come AFTER TutorialModal (Welcome → Refer & Earn → Withdraw Anytime → Proceed to Dashboard)
  // Order: setup-bank → dashboard → TutorialModal (welcome modal) → GuidedOnboarding (7 steps).
  // This effect only auto-shows Guided if Tutorial has already been completed (so sequence is preserved)
  useEffect(() => {
    try {
      const force = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tour") === "1";
      if (force) {
        const t = setTimeout(() => setShowGuided(true), 600);
        return () => clearTimeout(t);
      }
      const V2_KEY = "tivexx-guided-v2-shown";
      const TUTORIAL_KEY = "tivexx-tutorial-shown";
      // Only auto-show Guided if user already finished TutorialModal; otherwise TutorialModal's onClose will chain into Guided
      if (!localStorage.getItem(V2_KEY) && localStorage.getItem(TUTORIAL_KEY)) {
        const t = setTimeout(() => setShowGuided(true), 900);
        return () => clearTimeout(t);
      }
    } catch {}
  }, []);
  // persist auto
  useEffect(() => {
    try { localStorage.setItem(AUTO_TAP_KEY, JSON.stringify({ active: autoActive, planId: autoPlan, expiresAt: autoExpiresAt, startedAt: autoStartedAt, tapsDone: autoTapsDone, firstFreeUsed: autoFirstFreeUsed })); } catch {}
  }, [autoActive, autoPlan, autoExpiresAt, autoStartedAt, autoTapsDone, autoFirstFreeUsed]);
  // auto countdown + expire
  useEffect(() => {
    if (!autoActive || !autoExpiresAt) { setAutoLeftMs(0); return; }
    const tick = () => {
      const left = Math.max(0, autoExpiresAt - Date.now());
      setAutoLeftMs(left);
      if (left === 0) { setAutoActive(false); setAutoExpiresAt(null); toast({ title: "Auto tap finished" }); }
      const plan = AUTO_PLANS.find(p=>p.id===autoPlan);
      if (plan && autoTapsDone >= plan.maxTaps) { setAutoActive(false); setAutoExpiresAt(null); toast({ title: "Auto tap limit reached", description: `${plan.maxTaps} taps completed` }); }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [autoActive, autoExpiresAt, autoPlan, autoTapsDone, toast]);
  // ── Auto tap accrual (wall-clock): progress derives from now - startedAt,
  // so it keeps counting while the tab is throttled/hidden or the app is
  // closed. The server re-validates the same schedule before crediting, and
  // each flush carries a unique id (replays are harmless). Runs on mount,
  // every 5s, and whenever the app regains focus/visibility.
  const autoStateRef = useRef({ active: false, plan: null as AutoPlanId | null, expiresAt: null as number | null, startedAt: null as number | null, tapsDone: 0 });
  autoStateRef.current = { active: autoActive, plan: autoPlan, expiresAt: autoExpiresAt, startedAt: autoStartedAt, tapsDone: autoTapsDone };
  const accruingRef = useRef(false);
  const newAccrualId = useCallback(() => {
    try {
      if (typeof crypto !== "undefined" && (crypto as any).randomUUID) return (crypto as any).randomUUID();
    } catch {}
    return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  }, []);
  // Fresh trust counters for /api/tap/accrue so the server pays the real
  // tier rate (its stored trust_score can lag behind live activity).
  const getTrustPayload = useCallback(() => {
    try {
      const m = loadMeta();
      return {
        trustScore: computeScore(m),
        trust: {
          timeMs: Math.max(0, Number(m.timeMs) || 0),
          navCount: Math.max(0, Number(m.navCount) || 0),
          tapCount: Math.max(0, Number(m.tapCount) || 0),
        },
      };
    } catch {
      return { trustScore: 0, trust: { timeMs: 0, navCount: 0, tapCount: 0 } };
    }
  }, []);
  const accrueAuto = useCallback(async () => {
    const s = autoStateRef.current;
    if (!s.active || !s.plan || !s.expiresAt || !s.startedAt) return;
    if (accruingRef.current) return;
    const plan = AUTO_PLANS.find((p) => p.id === s.plan);
    if (!plan) return;
    const now = Date.now();
    const intervalMs = getAutoIntervalMs(s.plan);
    const effectiveEnd = Math.min(now, s.expiresAt);
    const earnedTotal = Math.max(0, Math.min(plan.maxTaps, Math.floor((effectiveEnd - s.startedAt) / intervalMs)));
    const finish = () => { setAutoActive(false); setAutoExpiresAt(null); setAutoStartedAt(null); };
    if (earnedTotal <= s.tapsDone) {
      if (now >= s.expiresAt || earnedTotal >= plan.maxTaps) { finish(); toast({ title: "Auto tap finished" }); }
      return;
    }
    accruingRef.current = true;
    const delta = earnedTotal - s.tapsDone;
    try {
      const raw = localStorage.getItem("tivexx-user");
      const u = raw ? JSON.parse(raw) : null;
      const uid = u?.id || u?.userId || "";
      if (!uid) return;
      const res = await fetch("/api/tap/accrue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Unique id per attempt; the server caps credit at schedule-earned
        // minus already-paid, so retries can never double-pay.
        // trustScore + trust counters let the server pay the verified live
        // tier rate instead of a stale stored one.
        body: JSON.stringify({ userId: uid, accrualId: newAccrualId(), kind: "auto", taps: delta, planId: s.plan, startedAt: s.startedAt, ...getTrustPayload() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.success) throw new Error(j?.error || "accrue failed");
      setAutoTapsDone(earnedTotal);
      const creditedAuto = typeof j?.creditedAmount === "number"
        ? j.creditedAmount
        : delta * (earnPerTapRef.current || TAP_EARN_PER);
      setTapEarned((p) => p + creditedAuto);
      setBalance(j.newBalance);
      // NOTE: do NOT setAnimatedBalance here — the [balance] tween below
      // counts animatedBalance up to balance, so auto credits animate the
      // same way manual taps do. Snapping both kills the animation.
      // CREDIT MOMENT: fly the SERVER-confirmed per-tap rate (one item per
      // credited tap) on the exact tick the balance increases. The countdown
      // FX stays emoji-only, so amounts never show before they are paid.
      try {
        const serverRate = typeof j?.earnPerTap === "number" && (j.earnPerTap as number) > 0 ? (j.earnPerTap as number) : 0;
        const creditedN = typeof j?.creditedTaps === "number" && (j.creditedTaps as number) > 0
          ? (j.creditedTaps as number)
          : (typeof j?.creditedAmount === "number" && (j.creditedAmount as number) > 0 && serverRate > 0
              ? Math.max(1, Math.round((j.creditedAmount as number) / serverRate)) : 0);
        const burstEmojis = ["💰", "🔥", "⚡", "💎"];
        for (let k = 0; k < Math.min(creditedN, 5); k++) {
          const em = burstEmojis[k % burstEmojis.length];
          setTimeout(() => {
            const fid = autoFxId.current++;
            setAutoFx((prev) => [...prev.slice(-14), { id: fid, text: `+₦${serverRate.toLocaleString()}`, emoji: em, x: 8 + Math.random() * 84 }]);
            setTimeout(() => setAutoFx((prev) => prev.filter((p) => p.id !== fid)), 1400);
          }, k * 180);
        }
      } catch {}
      try {
        const raw2 = localStorage.getItem("tivexx-user");
        if (raw2) {
          const u2 = JSON.parse(raw2);
          u2.balance = j.newBalance;
          localStorage.setItem("tivexx-user", JSON.stringify(u2));
          persistUserSession(u2);
          setUserData(u2);
        }
      } catch {}
      // Auto taps build trust MUCH slower than manual taps (1/10 rate),
      // otherwise a single 1-week plan would catapult a new account to Elite.
      try { const m = loadMeta(); m.tapCount = (m.tapCount || 0) + Math.max(1, Math.floor(delta / 10)); saveMeta(m); setTrustScore(computeScore(m)); setTrustMeta({ ...m }); } catch {}
      if (now >= s.expiresAt || earnedTotal >= plan.maxTaps) { finish(); toast({ title: "Auto tap finished" }); }
    } catch {
      // Keep tapsDone unchanged so nothing is lost — next tick retries.
    } finally {
      accruingRef.current = false;
    }
  }, [toast, newAccrualId, getTrustPayload]);
  useEffect(() => {
    void accrueAuto();
    const id = setInterval(() => { void accrueAuto(); }, 3000);
    const onReturn = () => { if (document.visibilityState === "visible") void accrueAuto(); };
    window.addEventListener("focus", onReturn);
    document.addEventListener("visibilitychange", onReturn);
    return () => { clearInterval(id); window.removeEventListener("focus", onReturn); document.removeEventListener("visibilitychange", onReturn); };
  }, [accrueAuto]);
  // Auto-tap orb FX while counting down: EMOJIS ONLY. The ₦ amount flies
  // only at the real credit tick (see the accrueAuto burst above), so the
  // orb never shows money before it is actually paid.
  useEffect(() => {
    if (!autoActive) { setAutoFx([]); return; }
    const emojis = ["🔥", "💰", "⚡", "💎"];
    const id = setInterval(() => {
      const n = autoFxId.current++;
      setAutoFx((prev) => [
        ...prev.slice(-14),
        { id: n, text: "", emoji: emojis[n % emojis.length], x: 8 + Math.random() * 84 },
      ]);
      setTimeout(() => setAutoFx((prev) => prev.filter((p) => p.id !== n)), 1400);
    }, 320);
    return () => clearInterval(id);
  }, [autoActive]);
  // Manual tap earnings flush: taps are worthless until THIS succeeds.
  // Sends tap counts (not naira) to /api/accrue, which enforces per-call
  // and daily caps server-side, then adopts the server's balance as truth.
  // Flushes on a debounce, when the app hides/closes, and on return.
  const flushManualTaps = useCallback(async () => {
    const total = tapAccum.current;
    if (total === 0) return;
    tapAccum.current = 0;
    const clientEarnPerTap = earnPerTapRef.current || TAP_EARN_PER;
    console.log(`[FlushTaps] Starting flush: total_naira=₦${total}, clientEarnPerTap=₦${clientEarnPerTap}`);
    try {
      const raw = localStorage.getItem("tivexx-user");
      if (!raw) { tapAccum.current += total; console.log(`[FlushTaps] No user in localStorage, re-queueing`); return; }
      const u = JSON.parse(raw);
      const uid = u.id || u.userId;
      if (!uid) { tapAccum.current += total; console.log(`[FlushTaps] No uid, re-queueing`); return; }
      const taps = Math.max(1, Math.round(total / clientEarnPerTap));
      console.log(`[FlushTaps] Calculated: ${taps} taps (${total}₦ ÷ ${clientEarnPerTap}₦/tap)`);
      const res = await fetch("/api/tap/accrue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid, accrualId: newAccrualId(), kind: "manual", taps, ...getTrustPayload() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.success) {
        console.log(`[FlushTaps] Server returned error: ${j?.error || "unknown"}`, j);
        throw new Error(j?.error || "tap sync failed");
      }
      console.log(`[FlushTaps] Server response: newBalance=₦${j.newBalance}, creditedAmount=₦${j.creditedAmount}, earnPerTap=₦${j.earnPerTap}`);
      try {
        const raw2 = localStorage.getItem("tivexx-user");
        if (raw2) {
          const u2 = JSON.parse(raw2);
          const oldBalance = u2.balance;
          u2.balance = j.newBalance;
          localStorage.setItem("tivexx-user", JSON.stringify(u2));
          persistUserSession(u2);
          setUserData(u2);
          setBalance(j.newBalance);
          setAnimatedBalance(j.newBalance);
          console.log(`[FlushTaps] Balance synced: ${oldBalance} → ${j.newBalance} (change: +₦${j.newBalance - oldBalance})`);
        }
      } catch {}
    } catch (err) {
      console.log(`[FlushTaps] Error during flush:`, err);
      // Re-queue so taps are never silently lost
      tapAccum.current += total;
    }
  }, [newAccrualId, getTrustPayload]);
  const syncTapToBalance = useCallback((amount: number) => {
    tapAccum.current += amount;
    if (tapSyncTimeout.current) clearTimeout(tapSyncTimeout.current);
    tapSyncTimeout.current = setTimeout(() => { void flushManualTaps(); }, 1200);
  }, [flushManualTaps]);
  // Never lose taps when the app hides/closes or comes back.
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === "hidden") void flushManualTaps(); };
    const onShow = () => { if (document.visibilityState === "visible") void flushManualTaps(); };
    const onUnload = () => {
      try {
        const total = tapAccum.current;
        if (total > 0) {
          const raw = localStorage.getItem("tivexx-user");
          const u = raw ? JSON.parse(raw) : null;
          const uid = u?.id || u?.userId || "";
          if (uid) {
            const taps = Math.max(1, Math.round(total / (earnPerTapRef.current || TAP_EARN_PER)));
            const payload = JSON.stringify({ userId: uid, accrualId: newAccrualId(), kind: "manual", taps });
            try { navigator.sendBeacon("/api/tap/accrue", new Blob([payload], { type: "application/json" })); } catch {}
          }
        }
      } catch {}
    };
    document.addEventListener("visibilitychange", onHide);
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("focus", onShow);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("focus", onShow);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [flushManualTaps, newAccrualId]);
  const handleTapEarn = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    try { (e as any).stopPropagation?.(); } catch {}
    // While rapid-tap warning active, block all tap input until popup clears
    if (showRapidTapWarning) return
    if (autoActive) return; // locked while auto
    if (tapExhaustUntil && tapExhaustUntil > Date.now()) { toast({ title: "Exhausted", description: `Wait ${Math.ceil(tapExhaustLeft/60000)}m ${Math.ceil((tapExhaustLeft%60000)/1000)}s to recharge` }); return; }
    if (tapEnergy <= 0) { toast({ title: "Out of energy", description: "Wait 10 mins to recharge or use Auto Tap ⚡" }); return; }
    // Rapid tap detection: >3 taps in 1 second
    const now = Date.now();
    const recentTaps = tapTimestamps.filter(t => now - t < 1000);
    if (recentTaps.length >= 3) {
      setShowRapidTapWarning(true);
      if (rapidTapWarningRef.current) clearTimeout(rapidTapWarningRef.current);
      rapidTapWarningRef.current = setTimeout(() => {
        setShowRapidTapWarning(false);
        setTapTimestamps([]);
      }, 2000); // slower: 2 sec display (vs "100" popup which is faster)
      return;
    }
    // Record this tap timestamp
    setTapTimestamps(prev => [...prev.slice(-10), now]); // keep last 10

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
    if ("touches" in (e as any) && (e as any).touches?.[0]) { cx = (e as any).touches[0].clientX; cy = (e as any).touches[0].clientY; }
    else if ("clientX" in (e as any)) { cx = (e as any).clientX; cy = (e as any).clientY; }
    const id = tapPid.current++;
    setTapParticles((prev) => [...prev, { id, x: cx - rect.left, y: cy - rect.top }]);
    setTimeout(() => setTapParticles((prev) => prev.filter((p) => p.id !== id)), 700);
    setTapTapping(true); setTimeout(() => setTapTapping(false), 140);
    const rate = earnPerTapRef.current || TAP_EARN_PER;
    const currentTapCount = tapCount;
    console.log(`[TapEarn] Tap #${currentTapCount + 1}: earnPerTap=₦${rate}, tapAccum will add ₦${rate}`);
    setTapEnergy((p) => p - 1);
    setTapEarned((p) => p + rate);
    setBalance((p) => p + rate);
    setTapCount((p) => p + 1);
    syncTapToBalance(rate);
    // trust: 20 taps = +1
    try { const m = loadMeta(); m.tapCount = (m.tapCount || 0) + 1; saveMeta(m); setTrustScore(computeScore(m)); setTrustMeta({ ...m }); } catch {}
  }, [tapEnergy, toast, syncTapToBalance, autoActive, tapExhaustUntil, tapExhaustLeft, tapTimestamps, showRapidTapWarning]);
  const handleAutoToggle = useCallback(() => {
    if (autoActive) {
      // Show warning popup before disabling
      setShowAutoToggleWarning(true)
      return
    }
    if (!autoFirstFreeUsed) setShowAutoFreePopup(true);
    setShowAutoPlans(true);
  }, [autoActive, autoFirstFreeUsed, toast]);
  const startAutoPlan = useCallback(async (id: AutoPlanId) => {
    // 1-week lock per paid package
    const cd = autoPlanCooldowns[id];
    if (cd && cd > Date.now()) {
      const left = cd - Date.now();
      const d = Math.floor(left/86400000), h = Math.floor((left%86400000)/3600000);
      toast({ title: "Plan locked for 1 week", description: `${id} — try again in ${d}d ${h}h`, variant: "destructive" });
      return;
    }
    if (id === "free1h" && autoFirstFreeUsed) return;
    if (id !== "free1h") {
      // paid plans require 3-option requirement chooser
      setReqPlan(id); setReqChoice(null); setShowAutoPlans(false); setShowAutoReq(true);
      // prepare referral code if not exists for this plan
      try {
        const stored = localStorage.getItem(AUTO_REF_LINK_KEY);
        const map = stored ? JSON.parse(stored) : {};
        if (!map[id]) {
          const code = `${(userData?.userId||userData?.id||'user').toString().slice(-4)}-AUTO-${id}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
          map[id]=code; localStorage.setItem(AUTO_REF_LINK_KEY, JSON.stringify(map));
        }
        const m2 = JSON.parse(localStorage.getItem(AUTO_REF_LINK_KEY)||"{}");
        setAutoRefCode(m2[id]||"");
        // Isolated per-plan count from the server (this plan's stamped
        // signups only — normal referrals never leak in, starts from zero).
        try {
          const uid2 = (userData as any)?.id || (userData as any)?.userId || "";
          if (uid2) {
            const r = await fetch(`/api/referral-stats?userId=${encodeURIComponent(uid2)}&plan=${encodeURIComponent(id)}&t=${Date.now()}`);
            const j = await r.json().catch(() => ({}));
            setAutoRefCount(typeof j?.plan_count === "number" ? j.plan_count : 0);
          } else setAutoRefCount(0);
        } catch { setAutoRefCount(0); }
      } catch { setAutoRefCode(""); }
      return;
    }
    const plan = AUTO_PLANS.find(p=>p.id===id)!;
    // Server gate for free1h: POST /api/timer/start before activation.
    // NOTE: /api/timer/start issues a 60s CLAIM timer — auto expiry must come
    // from the PLAN duration (20min/24h/...) or auto dies in 60s ("not working").
    try {
      const uid = (userData as any)?.id || (userData as any)?.userId || "";
      if (!uid) return;
      const res = await fetch("/api/timer/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid, timerEndsAt: new Date(Date.now()+plan.durationMs).toISOString() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) return;
    } catch { return; }
    const startedFree = Date.now();
    setAutoExpiresAt(startedFree + plan.durationMs);
    setAutoPlan(id); setAutoTapsDone(0); setAutoStartedAt(startedFree); setAutoActive(true);
    if (id==="free1h") setAutoFirstFreeUsed(true);
    // lock this plan for 1 week after starting (paid packages)
    if (id !== "free1h") {
      const exp = Date.now() + AUTO_PLAN_COOLDOWN_MS;
      const next = { ...autoPlanCooldowns, [id]: exp };
      setAutoPlanCooldowns(next);
      try { localStorage.setItem(AUTO_PLAN_COOLDOWN_KEY, JSON.stringify(next)); } catch {}
    }
    setShowAutoPlans(false); setShowAutoFreePopup(false);
    toast({ title: "Auto tap ON", description: `${plan.label} started` });
    // Offline push: register the run server-side so the finish notice can
    // arrive even when the app is closed (best-effort, never blocks).
    try {
      const uid = (userData as any)?.id || (userData as any)?.userId || "";
      if (uid) void scheduleReminder({ kind: "auto_finish", userId: uid, planId: id, startedAt: startedFree }).catch(() => {});
    } catch {}
  }, [autoFirstFreeUsed, toast, userData, autoPlanCooldowns]);
  const fulfillRequirement = useCallback(async () => {
    if (!reqPlan || !reqChoice) return;
    const plan = AUTO_PLANS.find(p=>p.id===reqPlan)!;
    if (reqChoice==="task") {
      const need = AUTO_REQ_TASK[reqPlan];
      const isMt = reqPlan==="24h" || reqPlan==="3d";
      // Server-confirmed counts only — unlock ONLY on server counts >= need (no pure-localStorage path).
      let done = 0;
      try {
        const uid = (userData as any)?.id || (userData as any)?.userId || "";
        const prefix = isMt ? "mt-" : "mu-";
        if (uid) {
          const r = await fetch(`/api/track-task/status?userId=${encodeURIComponent(uid)}&plan=${encodeURIComponent(prefix)}`);
          const j = await r.json().catch(() => ({}));
          if (j?.success) done = Number(j.count || 0);
        }
      } catch {}
      if (done < need) { toast({ title: "Requirement not met", description: `Need ${need} tasks, server confirms ${done}. Go to ${isMt ? "MT" : "MU"} Tasks — progress for each plan is separate (starts at 0).` }); return; }
    }
    if (reqChoice==="referral") {
      const need = AUTO_REQ_REF[reqPlan];
      // Isolated per-plan count: ONLY this plan's stamped signups count
      // (normal referrals never leak in; each plan starts from zero).
      let planCount = 0;
      try {
        const uid = (userData as any)?.id || (userData as any)?.userId || "";
        if (uid) {
          const r = await fetch(`/api/referral-stats?userId=${encodeURIComponent(uid)}&plan=${encodeURIComponent(reqPlan)}&t=${Date.now()}`);
          const j = await r.json().catch(() => ({}));
          if (typeof j?.plan_count === "number") planCount = j.plan_count;
        }
      } catch {}
      if (planCount < need) { toast({ title: "Requirement not met", description: `Need ${need} Tiered Referral signups for this plan — you have ${planCount}. Share THIS plan's link (each plan counts from zero).` }); return; }
    }
    if (reqChoice==="payment") {
      const need = AUTO_REQ_PAY[reqPlan];
      const email = (userData as any)?.email || JSON.parse(localStorage.getItem("tivexx-user")||"{}")?.email || ""
      if (!email) {
        toast({ title: "Add your email first", description: "We need your email for Paystack receipt", variant: "destructive" })
        return
      }
      try {
        toast({ title: "Starting Paystack...", description: `Pay ₦${need.toLocaleString()} to unlock ${plan.label}` })
        const res = await fetch("/api/paystack/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            amount: need,
            callbackUrl: `${window.location.origin}/paystack/callback`,
            metadata: { type: "auto_tap", planId: reqPlan, userId: (userData as any)?.id || (userData as any)?.userId || "", amount: need },
          }),
        })
        const data = await res.json()
        if (!res.ok || !data?.authorization_url) {
          throw new Error(data?.error || "Could not start Paystack")
        }
        // Save pending for UX; real activation happens in /paystack/callback after verification
        try { localStorage.setItem("pending_auto_tap_payment", JSON.stringify({ planId: reqPlan, amount: need, reference: data.reference, at: Date.now() })); } catch {}
        window.location.href = data.authorization_url
      } catch (e: any) {
        toast({ title: "Payment failed", description: e?.message || "Try again", variant: "destructive" })
      }
      return;
    }
    // start auto — server-gated; expiry from PLAN duration (not the 60s claim timer).
    try {
      const uid = (userData as any)?.id || (userData as any)?.userId || "";
      if (!uid) return;
      const res = await fetch("/api/timer/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid, timerEndsAt: new Date(Date.now()+plan.durationMs).toISOString() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) { toast({ title: "Server denied", description: "Could not confirm unlock", variant: "destructive" }); return; }
    } catch { return; }
    const startedPaid = Date.now();
    setAutoExpiresAt(startedPaid + plan.durationMs);
    setAutoPlan(reqPlan); setAutoTapsDone(0); setAutoStartedAt(startedPaid); setAutoActive(true);
    // lock this plan for 1 week
    if (reqPlan !== "free1h") {
      const exp = Date.now() + AUTO_PLAN_COOLDOWN_MS;
      const next = { ...autoPlanCooldowns, [reqPlan]: exp };
      setAutoPlanCooldowns(next);
      try { localStorage.setItem(AUTO_PLAN_COOLDOWN_KEY, JSON.stringify(next)); } catch {}
    } else {
      setAutoFirstFreeUsed(true);
    }
    setShowAutoReq(false); setReqPlan(null); setReqChoice(null);
    toast({ title: "Auto tap ON", description: `${plan.label} started` });
    // Offline push: register the run server-side so the finish notice can
    // arrive even when the app is closed (best-effort, never blocks).
    try {
      const uid = (userData as any)?.id || (userData as any)?.userId || "";
      if (uid) void scheduleReminder({ kind: "auto_finish", userId: uid, planId: reqPlan, startedAt: startedPaid }).catch(() => {});
    } catch {}
  }, [reqPlan, reqChoice, balance, userData, toast, autoPlanCooldowns]);
  const copyAutoRefLink = useCallback(()=>{
    // NOTE: ?ref= must be the REAL referral_code — fake XXXX-AUTO codes never
    // resolve in signup and silently record no referral.
    const realCode = (userData as any)?.referral_code || userData?.userId || userData?.id || autoRefCode;
    const link = `${window.location.origin}/?ref=${realCode}`;
    navigator.clipboard.writeText(link).then(()=> toast({ title:"Copied", description: link }));
  }, [autoRefCode, userData, toast]);
  // Exact time remaining for the auto-tap countdown — standard HH:MM:SS,
  // with days in front for multi-day plans (e.g. "1d 02:14:33").
  const formatAutoLeft = (ms:number) => {
    const totalS = Math.max(0, Math.floor(ms/1000));
    const d = Math.floor(totalS/86400);
    const h = Math.floor((totalS%86400)/3600);
    const m = Math.floor((totalS%3600)/60);
    const sec = totalS%60;
    const clock = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    return d > 0 ? `${d}d ${clock}` : clock;
  };
  // Live ETA to the NEXT auto credit (same plan schedule the server uses),
  // so the balance feels alive even on slow plans (e.g. 1 tap / ~58s on 24h).
  const nextAutoCreditInMs = (() => {
    void autoLeftMs; // re-evaluates every second while the 1s auto countdown ticks
    if (!autoActive || !autoPlan || !autoStartedAt) return 0;
    try {
      const intervalMs = getAutoIntervalMs(autoPlan);
      if (!intervalMs) return 0;
      const elapsed = Date.now() - autoStartedAt;
      return Math.max(0, intervalMs - (elapsed % intervalMs));
    } catch { return 0; }
  })();
  const formatShortLeft = (ms:number) => {
    const s = Math.max(0, Math.ceil(ms/1000));
    if (s >= 3600) {
      const h = Math.floor(s/3600), m = Math.floor((s%3600)/60);
      return `${h}h ${String(m).padStart(2,'0')}m`;
    }
    if (s >= 60) return `${Math.floor(s/60)}m ${String(s%60).padStart(2,'0')}s`;
    return `${s}s`;
  };

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
      // Server-authoritative claim: balance incremented ONLY server-side.
      try {
        const uid = (userData as any)?.id || (userData as any)?.userId || "";
        if (!uid) return;
        const res = await fetch("/api/timer/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: uid }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) {
          if (data?.error === "Paused" || data?.paused) {
            const until = data.pauseUntil ? new Date(data.pauseUntil).getTime() : Date.now() + 5 * 60 * 60 * 1000;
            setPauseEndTime(until);
            try { localStorage.setItem("tivexx-pause-end-time", until.toString()); } catch {}
            setCanClaim(false);
            setShowPauseDialog(true);
          }
          return;
        }
        // Client sets balance from server response, never balance+2000 locally.
        const newBalance = Number(data.newBalance ?? balance);
        const newClaimCount = Number(data.claimCount ?? claimCount + 1);
        setBalance(newBalance);
        setAnimatedBalance(newBalance);
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

      if (data?.paused) {
        const until = data.pauseUntil ? new Date(data.pauseUntil).getTime() : Date.now() + 5 * 60 * 60 * 1000;
        setPauseEndTime(until);
        try { localStorage.setItem("tivexx-pause-end-time", until.toString()); } catch {}
        setCanClaim(false);
      } else {
        const timerEndMs = Date.now() + 60 * 1000;
        setCanClaim(false);
        setTimeRemaining(60);
        setIsCounting(true);
        // Save single absolute end time — no need to update every tick
        localStorage.setItem("tivexx-timer-end", timerEndMs.toString());
        localStorage.removeItem("tivexx-claim-ready-notified");
      }

      if (newClaimCount === 50 || data?.paused) {
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
      } catch (e) {
        console.error("[dashboard] claim failed", e);
      }
    }
  };

  const formatCurrency = (amount: number) => {
    if (!showBalance) {
      return (
        <span className="tracking-widest flex items-center gap-1">
          {[...Array(4)].map((_, i) => (
            <span
              key={i}
              className="inline-block w-8 h-5 bg-white/15 rounded-md animate-pulse"
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
        className={`font-mono transition-colors duration-300 ${isBalanceChanging ? "text-emerald-300" : "text-white"}`}
      >
        <span className="text-xl align-top opacity-80">₦</span>
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
    const referralLink = `${typeof window !== "undefined" ? window.location.origin : ""}/?ref=${userData?.userId || "ref"}`;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  // ─── Notification handlers — only invoked after successful login/signup (inside dashboard) ───
  const handleEnableNotifications = useCallback(async () => {
    if (!userData) return;
    const uid = (userData as any).id || userData.userId;
    if (!uid) return;
    try {
      const ok = await registerForFCM(uid);
      if (ok) {
        setNotificationPermission("granted");
        toast({ title: "Notifications enabled", description: "You'll receive claim alerts and updates." });
        showLocalNotification("Notifications enabled", { body: "You'll receive claim alerts and updates." });
        const status = await getSubscriptionStatus(uid);
        setSubscriptionStatus(status);
      } else {
        const perm = typeof Notification !== "undefined" ? (Notification.permission as NotificationPermission) : "denied";
        setNotificationPermission(perm);
        if (perm === "denied") {
          toast({ title: "Notifications blocked", description: "Please enable in browser settings." });
        } else {
          // Registration failed AFTER permission — say exactly why.
          const reason = getLastPushError() || "";
          const friendly =
            reason === "no-token"
              ? "Your session predates offline alerts. Log out and back in once, then tap Enable."
              : reason === "bad-token"
                ? "This login's token was rejected. Unlock again with your password (amber box above), then tap Enable."
                : reason === "saved-wrong-uid"
                  ? "Server saved under a different account — screenshot Diagnose and report it."
                  : reason === "saved-unverified"
                    ? "Server didn't confirm the save. Tap Enable again; if it repeats, screenshot Diagnose and report it."
                    : reason === "missing-vapid-key"
                ? "Push service isn't configured on the server yet (VAPID key missing)."
                : reason === "missing-firebase-config"
                  ? "Google push isn't configured; native push also failed — try again."
                  : reason === "ios-needs-install"
                    ? "On iPhone, add the app to your Home Screen first (Share → Add to Home Screen)."
                    : reason === "push-unsupported"
                      ? "This browser doesn't support push notifications."
                      : reason.startsWith("subscribe-rejected")
                        ? `Server rejected the subscription (${reason.split(":").slice(1).join(":") || "error"}). Screenshot this and report it.`
                        : "Subscription failed. Tap Check status, or log out and back in and retry.";
          toast({ title: "Couldn't enable notifications", description: friendly, variant: "destructive" });
        }
      }
    } catch (e) {
      console.error("[dashboard] enable notifications failed", e);
    } finally {
      // consume the just-authenticated flag so prompt doesn't reappear on next visit
      try {
        localStorage.removeItem("tivexx-just-authenticated");
      } catch {}
      setShowNotificationPrompt(false);
    }
  }, [userData, toast]);

  const handleMintNotifyToken = useCallback(async () => {
    if (!userData || mintingToken) return;
    const uid = (userData as any)?.id || (userData as any)?.userId || "";
    if (!uid || !confirmPw) {
      setMintMsg("Enter your account password first.");
      return;
    }
    setMintingToken(true);
    setMintMsg("");
    try {
      const token = await mintNotifyToken(uid, confirmPw);
      if (!token) {
        const reason = getLastPushError() || "";
        setMintMsg(
          reason === "token-rate-limited"
            ? "Too many tries — wait an hour, or log out and back in."
            : reason === "token-server-error"
              ? "Server hiccup — try again in a minute."
              : "That didn't match — try your login password or user ID, or log out and back in.",
        );
        return;
      }
      // Merge the fresh token into live state (persisted to storage already).
      setUserData((prev: any) => {
        if (!prev) return prev;
        try {
          const raw = localStorage.getItem("tivexx-user");
          const stored = raw ? JSON.parse(raw) : {};
          return { ...prev, notifyToken: (stored as any)?.notifyToken || (prev as any)?.notifyToken };
        } catch { return prev; }
      });
      setConfirmPw("");
      setMintMsg("Unlocked ✓ — tap Enable below to finish.");
      toast({ title: "Offline alerts unlocked", description: "Now tap Enable to subscribe this device." });
    } finally {
      setMintingToken(false);
    }
  }, [userData, confirmPw, mintingToken, toast]);

  // DevTools-only entrypoint: run `await window.__diagnosePush()` in the
  // browser console (F12 → Console) to print the full push checklist.
  // The old in-dashboard Notifications card was removed per request.
  useEffect(() => {
    try {
      (window as any).__diagnosePush = async () => {
        try {
          const raw = localStorage.getItem("tivexx-user");
          const u = raw ? JSON.parse(raw) : null;
          const uid = (u as any)?.id || (u as any)?.userId || null;
          const result = await runPushDiagnostics(uid);
          try {
            console.groupCollapsed("[push-diagnostics] checklist");
            console.log("marker:", (result as any)?.marker);
            console.table((result as any)?.rows || []);
            (result as any)?.rows?.forEach?.((r: any) =>
              console.log(`${r?.ok ? "✓" : "✗"} ${r?.label} — ${r?.detail}`),
            );
            console.groupEnd();
          } catch {}
          return result;
        } catch (e) {
          console.error("[push-diagnostics] failed", e);
          return null;
        }
      };
      (window as any).__pushStatus = async () => {
        try {
          const raw = localStorage.getItem("tivexx-user");
          const u = raw ? JSON.parse(raw) : null;
          const uid = (u as any)?.id || (u as any)?.userId || "";
          if (!uid) { console.warn("[push-status] no logged-in user"); return null; }
          const status = await getSubscriptionStatus(uid);
          console.log("[push-status]", {
            permission: typeof Notification !== "undefined" ? Notification.permission : "unknown",
            ...status,
          });
          return status;
        } catch (e) {
          console.error("[push-status] failed", e);
          return null;
        }
      };
    } catch {}
  }, []);

  const handleRunDiagnostics = useCallback(async () => {
    if (!userData || diagnosing) return;
    const uid = (userData as any)?.id || (userData as any)?.userId || "";
    setDiagnosing(true);
    try {
      const result = await runPushDiagnostics(uid || null);
      setDiag(result);
      // DevTools-only: mirror the full push checklist to the browser console
      // (the in-dashboard card was removed — use F12 → Console).
      try {
        console.groupCollapsed("[push-diagnostics] checklist");
        console.log("marker:", (result as any)?.marker);
        console.table((result as any)?.rows || []);
        (result as any)?.rows?.forEach?.((r: any) =>
          console.log(`${r?.ok ? "✓" : "✗"} ${r?.label} — ${r?.detail}`),
        );
        console.groupEnd();
      } catch {}
    } catch (e) {
      console.error("[dashboard] diagnostics failed", e);
    } finally {
      setDiagnosing(false);
    }
  }, [userData, diagnosing]);

  const handleCheckNotificationStatus = useCallback(async () => {    if (!userData) return;
    const uid = (userData as any).id || userData.userId;
    if (!uid) return;
    setIsCheckingStatus(true);
    try {
      if (typeof Notification !== "undefined") setNotificationPermission(Notification.permission as NotificationPermission);
      const status = await getSubscriptionStatus(uid);
      setSubscriptionStatus(status);
      try {
        console.log("[push-status]", {
          permission: typeof Notification !== "undefined" ? Notification.permission : "unknown",
          hasAny: status.hasAny,
          hasFcm: status.hasFcm,
          hasWebpush: status.hasWebpush,
        });
      } catch {}
      toast({
        title: status.hasAny ? "Notifications active" : "No subscription found",
        description: status.hasAny
          ? `FCM: ${status.hasFcm ? "yes" : "no"} • WebPush: ${status.hasWebpush ? "yes" : "no"}`
          : (userData as any)?.notifyToken
            ? "Tap Enable to subscribe."
            : "Tap Enable to subscribe. If it fails: log out and back in once first (old session).",
      });
    } catch (e) {
      console.error("[dashboard] check status failed", e);
    } finally {
      setIsCheckingStatus(false);
    }
  }, [userData, toast]);

  const handleProfileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    // Reset input so the same file can be picked again in profile/dashboard.
    try { e.target.value = ""; } catch {}

    const { saveProfilePictureFromFile } = await import("@/lib/profile-picture");
    const res = await saveProfilePictureFromFile(file);
    if (res.ok && res.dataUrl) {
      setUserData((prev: any) => (prev ? { ...prev, profilePicture: res.dataUrl } : prev));
      toast?.({ title: "Profile updated", description: "Your profile picture was saved and synced." });
    } else if (res.error === "quota") {
      toast?.({ title: "Image too large", description: "Pick a smaller photo — storage is full.", variant: "destructive" } as any);
    } else {
      toast?.({ title: "Upload failed", description: "Pick a valid image file and try again.", variant: "destructive" } as any);
    }
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
      name: "Loans",
      emoji: "💳",
      link: "/loan",
      color: "text-purple-400",
      bgColor: "",
    },
    {
      name: "Channel",
      emoji: "📢",
      link: "https://t.me/Moneymate9janews",
      external: true,
      color: "text-amber-400",
      bgColor: "",
    },
    {
      name: "Q&A",
      emoji: "❓",
      link: "/qa",
      color: "text-emerald-400",
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

    // ── Referral VIP 500 auto-credit on first login (one-time, airtime redeemable)
    try {
      if (!localStorage.getItem("tivexx-referral-vip") && !localStorage.getItem("tivexx-vip-redeemed")) {
        const vip = { available: 500, redeemed: false, history: [] };
        localStorage.setItem("tivexx-referral-vip", JSON.stringify(vip));
        localStorage.setItem("tivexx-vip-redeemed", "0");
        if (uid) void fetch("/api/referral-vip", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: uid, available: 500 }) }).catch(()=>{});
      }
    } catch {}

    if (typeof user.balance !== "number") {
      user.balance = 50000;
    }

    if (!user.userId) {
      user.userId = user.referral_code || user.referralCode || user.id || "";
    }

    persistUserSession(user);

    const uid = user.id || user.userId;
    // ─── Notifications: only after successful login/signup (not for guests) ───
    // We are already inside authenticated dashboard (storedUser exists). Guest users never reach here.
    // Show the enable prompt only if user just authenticated; otherwise don't auto-prompt.
    // If permission already granted, silently ensure push integrity for returning users.
    try {
      const justAuth = localStorage.getItem("tivexx-just-authenticated") === "1";
      const perm = typeof Notification !== "undefined" ? (Notification.permission as NotificationPermission) : ("default" as NotificationPermission);
      setNotificationPermission(perm);
      if (perm === "granted") {
        void ensurePushRegistrationIntegrity(uid);
        // also fetch status for the inside-dashboard status card
        void getSubscriptionStatus(uid).then(setSubscriptionStatus).catch(() => {});
      } else if (justAuth && perm === "default") {
        // defer prompt slightly so dashboard renders first
        setTimeout(() => setShowNotificationPrompt(true), 1200);
      }
      // don't auto-call registerForFCM here — user must tap Enable inside dashboard
    } catch {}

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
        if (!response.ok) {
          console.warn("[dashboard] timer/check non-ok, skipping:", response.status);
          return;
        }
        let data: any = {};
        try {
          data = await response.json();
        } catch {
          const txt = await response.text().catch(() => "");
          console.warn("[dashboard] timer/check non-JSON, skipping:", txt.slice(0, 200));
          return;
        }

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
        if (!response.ok) {
          console.warn("[dashboard] user-balance non-ok:", response.status);
          throw new Error(`user-balance ${response.status}`);
        }
        let data: any = {};
        try {
          data = await response.json();
        } catch {
          const txt = await response.text().catch(() => "");
          console.warn("[dashboard] user-balance non-JSON:", txt.slice(0, 200));
          throw new Error("non-JSON user-balance");
        }

        // Read the latest local storage value (in case it changed while user was away)
        const storedLatestRaw = localStorage.getItem("tivexx-user");
        const storedLatest = storedLatestRaw
          ? JSON.parse(storedLatestRaw)
          : null;
        // Server wins: local = server values (no Math.max merge, no inflated write-back).
        const dbBalance = typeof data.balance === "number" ? data.balance : 50000;

        const referralEarnings = data.referral_balance || 0;
        const lastSyncedReferrals =
          localStorage.getItem("tivexx-last-synced-referrals") || "0";

        const newReferralEarnings =
          referralEarnings - parseInt(lastSyncedReferrals);
        const totalBalance = dbBalance + Math.max(0, newReferralEarnings);

        console.log(
          "[dashboard] fetchUserBalance -> db:",
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
        // No write-back POST of inflated total — server is authoritative.
        // Trust restores here exactly like balance (server snapshot merged
        // with local activity — never moves backwards).
        try {
          const tm = (data as any)?.trust_meta;
          if (tm && typeof tm === "object") {
            const merged = hydrateTrustFromServer(tm);
            setTrustScore(computeScore(merged));
            setTrustMeta({ ...merged });
          }
        } catch {}
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
      <div className="min-h-screen flex items-center justify-center bg-[#050d14]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-ping"></div>
            <div
              className="absolute inset-2 rounded-full border-2 border-emerald-400/50 animate-ping"
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

      <ScrollingText />

      {/* DIALOGS - unchanged logic */}
      <Dialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <DialogContent className="hh-dialog hh-auto-tap-dialog max-w-sm">
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
        <DialogContent className="hh-dialog hh-auto-tap-dialog max-w-sm">
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
                window.open("https://t.me/Moneymate9janews", "_self");
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

      {/* ── Notification Enable Prompt — only after successful login/signup, inside dashboard ── */}
      <Dialog
        open={showNotificationPrompt}
        onOpenChange={(open) => {
          setShowNotificationPrompt(open);
          if (!open) {
            try {
              localStorage.removeItem("tivexx-just-authenticated");
            } catch {}
          }
        }}
      >
        <DialogContent className="hh-dialog hh-auto-tap-dialog max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-xl text-white flex items-center justify-center gap-2">
              <Bell className="h-5 w-5 text-emerald-400" /> Enable notifications?
            </DialogTitle>
            <DialogDescription className="text-center space-y-3 pt-3">
              <p className="text-base text-gray-300">Get instant alerts when your claim is ready and when rewards drop.</p>
              <p className="text-xs text-gray-400">You can change this anytime in Profile → Notification Settings.</p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowNotificationPrompt(false);
                try {
                  localStorage.removeItem("tivexx-just-authenticated");
                } catch {}
              }}
              className="flex-1 rounded-full border-white/15 text-white hover:bg-white/10"
            >
              Maybe later
            </Button>
            <Button onClick={handleEnableNotifications} className="flex-1 hh-btn-primary rounded-full">
              Enable
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {showTutorial && (
        <TutorialModal
          onClose={() => {
            setShowTutorial(false);
            localStorage.setItem("tivexx-tutorial-shown", "true");
            // after static tutorial, launch moving guide
            setTimeout(() => setShowGuided(true), 600);
          }}
        />
      )}
      <GuidedOnboarding open={showGuided} onClose={() => { setShowGuided(false); localStorage.setItem("tivexx-guided-shown", "true"); localStorage.setItem("tivexx-guided-v2-shown", "true"); localStorage.setItem("tivexx-tutorial-shown", "true"); }} />
      {/* Trust Score card now links to /trust-score page (see above) */}

      {showWithdrawalNotification && (
        <WithdrawalNotification onClose={handleCloseWithdrawalNotification} />
      )}

      {/* ── AUTO TAP: Eligible popup (20 mins free) — .hh-popup pattern (same bg as 3/3 Spins Exhausted) ── */}
      {showAutoFreePopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="hh-popup max-w-sm w-full mx-4 relative">
          <button
            onClick={() => setShowAutoFreePopup(false)}
            aria-label="Close"
            className="absolute top-3 right-3 w-8 h-8 grid place-items-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition"
          >
            ✕
          </button>
          <div className="hh-popup-header">
            <h2 className="text-center text-xl text-white font-semibold leading-none tracking-tight">🎉 You are eligible!</h2>
            <p className="text-center pt-2 text-gray-300">You have 20 minutes of FREE auto tap. Your balance will increase automatically without tapping.</p>
          </div>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={()=> setShowAutoFreePopup(false)} className="flex-1 rounded-full border-white/15 text-white">Later</Button>
            <Button onClick={()=> { setShowAutoFreePopup(false); startAutoPlan("free1h"); }} className="flex-1 hh-btn-primary rounded-full">Start FREE 20 mins</Button>
          </div>
          </div>
        </div>
      )}
      {/* ── AUTO TAP: Toggle-off warning popup — .hh-popup pattern (same bg as 3/3 Spins Exhausted) ── */}
      {showAutoToggleWarning && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="hh-popup max-w-sm w-full mx-4">
          <div className="hh-popup-header">
            <h2 className="text-center text-xl text-white font-semibold leading-none tracking-tight">⚠️ Turn Off Auto Tap?</h2>
            <p className="text-center pt-2 text-gray-300 space-y-3">
              Turning off auto-tap while it is still running will <span className="font-bold text-amber-300">forfeit the remaining time and progress</span>.
              <br />
              Your balance will stop increasing and any unused taps will be lost.
            </p>
          </div>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={()=> setShowAutoToggleWarning(false)} className="flex-1 rounded-full border-white/15 text-white">Cancel — Keep Running</Button>
            <Button onClick={confirmAutoToggleOff} className="flex-1 hh-btn-primary rounded-full" style={{ background: "#dc2626", hover: "#b91c1c" }}>End Auto Tap</Button>
          </div>
          </div>
        </div>
      )}
      {/* ── AUTO TAP: Plan selector — .hh-popup pattern (same bg as 3/3 Spins Exhausted) ── */}
      {showAutoPlans && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="hh-popup max-w-sm w-full mx-4 max-h-[85vh] overflow-y-auto relative">
          <button
            onClick={() => setShowAutoPlans(false)}
            aria-label="Close"
            className="absolute top-3 right-3 w-8 h-8 grid place-items-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition z-10"
          >
            ✕
          </button>
          <div className="hh-popup-header">
            <h2 className="text-center text-lg text-white font-semibold leading-none tracking-tight">Choose Auto Tap Plan</h2>
            <p className="text-center text-xs text-gray-400">Only first-time users get 20 mins FREE. After that it is crossed out.</p>
          </div>
          <div className="space-y-3 mt-3">
            {AUTO_PLANS.map((p, idx)=> {
              const isFree = p.id==="free1h";
              const freeDisabled = isFree && autoFirstFreeUsed;
              const cd = autoPlanCooldowns[p.id];
              const isLocked = !isFree && cd && cd > nowTick;
              const disabled = freeDisabled || !!isLocked;
              const lockLeft = isLocked ? cd - nowTick : 0;
              const lockDays = Math.floor(lockLeft/86400000);
              const lockHours = Math.floor((lockLeft%86400000)/3600000);
              return (
                <div key={p.id} className="flex items-center gap-2">
                  <span className="text-xs font-black text-white/70 w-5 text-center shrink-0">{idx+1}</span>
                  <button disabled={disabled} onClick={()=> startAutoPlan(p.id)} className={`flex-1 text-left relative rounded-2xl border p-3 flex items-center justify-between ${disabled ? "bg-white/5 border-white/10 opacity-50" : "bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border-emerald-500/30 hover:border-emerald-400/50"}`}>
                    <div>
                      <div className={`text-sm font-black ${disabled ? "text-gray-400" : "text-white"}`}>{p.label} {isLocked ? "• Locked 1 week" : ""}</div>
                      <div className="text-xs text-white/60">max ₦{p.maxEarn.toLocaleString()} {p.sub.includes("max") ? "" : p.sub} {isLocked ? `• ${lockDays}d ${lockHours}h left` : ""}</div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-black ml-2 shrink-0 ${disabled ? "bg-gray-600 text-white" : "bg-emerald-500 text-white"}`}>{isLocked ? "Locked" : disabled ? "Used" : "Start"}</div>
                    {disabled && <div className="absolute left-3 right-3 top-1/2 h-[2px] bg-gray-400/70 -translate-y-1/2"></div>}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-center text-white/50 mt-3">Auto tap locks the orb (no animation) — balance still rises in real time.</p>
          </div>
        </div>
      )}
      {/* ── AUTO TAP: Requirement chooser for paid plans — .hh-popup pattern (same bg as 3/3 Spins Exhausted) ── */}
      {showAutoReq && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="hh-popup max-w-sm w-full mx-4 max-h-[85vh] overflow-y-auto">
          <div className="hh-popup-header">
            <h2 className="text-center text-lg text-white font-semibold leading-none tracking-tight">Requirement for {reqPlan ? AUTO_PLANS.find(p=>p.id===reqPlan)?.label : ""}</h2>
            <p className="text-center text-xs text-gray-400">Choose one of 3 options. Referrals use a new tracking link and count to your total.</p>
          </div>
          {reqPlan && (
            <div className="space-y-3 mt-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white/70 w-5 text-center shrink-0">a</span>
                <div onClick={()=> setReqChoice("task")} onKeyDown={(e)=> { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setReqChoice("task"); } }} role="button" tabIndex={0} className={`flex-1 text-left rounded-2xl border p-3 flex items-center justify-between cursor-pointer ${reqChoice==="task" ? "border-emerald-400 bg-emerald-500/15" : "border-white/10 bg-white/5"}`}>
                  <div>
                    <div className="text-sm font-black text-white">{AUTO_REQ_TASK[reqPlan]} tasks required</div>
                    <div className="text-xs text-white/70 mt-1">you've only done {getPerPlanDone(reqPlan)}/{AUTO_REQ_TASK[reqPlan]} — this plan counts separately from others</div>
                    <div className="mt-1 text-xs text-white/50">Open {(reqPlan==="24h"||reqPlan==="3d")?"MT":"MU"} Tasks ({AUTO_REQ_TASK[reqPlan]})</div>
                  </div>
                  <button type="button" onClick={(e)=> { e.stopPropagation(); setReqChoice("task"); const need=AUTO_REQ_TASK[reqPlan]; const path=(reqPlan==="24h"||reqPlan==="3d")?`/mt-tasks?need=${need}&plan=${reqPlan}`:`/mu-tasks?need=${need}&plan=${reqPlan}`; router.push(path); }} className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500 text-white ml-2 shrink-0">Start</button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white/70 w-5 text-center shrink-0">b</span>
                <div onClick={()=> setReqChoice("referral")} onKeyDown={(e)=> { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setReqChoice("referral"); } }} role="button" tabIndex={0} className={`flex-1 text-left rounded-2xl border p-3 flex items-center justify-between cursor-pointer ${reqChoice==="referral" ? "border-emerald-400 bg-emerald-500/15" : "border-white/10 bg-white/5"}`}>
                  <div>
                    <div className="text-sm font-black text-white">Referral — {AUTO_REQ_REF[reqPlan]} referrals</div>
                    <div className="text-xs text-white/60 mt-1">New tracking link will be generated for this plan.</div>
                  </div>
                  <button type="button" onClick={(e)=> { e.stopPropagation(); setReqChoice("referral"); router.push(`/refer/auto-tap?plan=${reqPlan}`); setShowAutoReq(false); }} className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500 text-white ml-2 shrink-0">Start</button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white/70 w-5 text-center shrink-0">c</span>
                <div onClick={()=> setReqChoice("payment")} onKeyDown={(e)=> { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setReqChoice("payment"); } }} role="button" tabIndex={0} className={`flex-1 text-left rounded-2xl border p-3 flex items-center justify-between cursor-pointer ${reqChoice==="payment" ? "border-emerald-400 bg-emerald-500/15" : "border-white/10 bg-white/5"}`}>
                  <div>
                    <div className="text-sm font-black text-white">Pay ₦{AUTO_REQ_PAY[reqPlan].toLocaleString()} for {AUTO_PLANS.find(p=>p.id===reqPlan)?.maxEarn.toLocaleString()} estimated taps</div>
                    <div className="text-xs text-white/60 mt-1">One-time payment to unlock auto tap for this plan.</div>
                  </div>
                  <button type="button" onClick={(e)=> { e.stopPropagation(); setReqChoice("payment"); }} className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500 text-white ml-2 shrink-0">Start</button>
                </div>
              </div>
              <Button onClick={fulfillRequirement} disabled={!reqChoice} className="w-full hh-btn-primary rounded-full font-black">Unlock & Start Auto Tap</Button>
              <Button variant="outline" onClick={()=> setShowAutoReq(false)} className="w-full rounded-full border-white/15 text-white">Cancel</Button>
            </div>
          )}
          </div>
        </div>
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
                    ? `${window.location.origin}/?ref=${userData?.userId || "ref"}`
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
      <div className="max-w-md mx-auto px-4 space-y-4 pt-6 relative z-10">
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
                onClick={openInbox}
                className="hh-support-btn hh-support-blue relative"
                aria-label="Messages"
                title="Messages — inbox"
              >
                <Mail className="h-5 w-5 text-white" />
                {(mailCount + inboxFeedUnread) > 0 && (
                  <span
                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center animate-pulse"
                    style={{ boxShadow: "0 0 10px rgba(220,38,38,0.9)" }}
                  >
                    {(mailCount + inboxFeedUnread) > 9 ? "9+" : (mailCount + inboxFeedUnread)}
                  </span>
                )}
              </button>
              <Link href="https://t.me/Moneymate9janews">
                <button className="hh-support-btn hh-support-green relative">
                  <Bell className="h-5 w-5 text-white" />
                  <span className="hh-notif-dot"></span>
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* ── BALANCE CARD ── */}
        <div data-tour="balance" className="hh-card hh-card-balance hh-entry-2 relative overflow-hidden">
          {/* Decorative glow orbs */}
          <div className="hh-orb hh-orb-1" aria-hidden="true"></div>
          <div className="hh-orb hh-orb-2" aria-hidden="true"></div>

          <div className="relative z-10">
            {/* Balance header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={autoActive ? "hh-live-dot hh-live-dot-auto" : "hh-live-dot"} title={autoActive ? "Auto tap ON" : "Live"}></span>
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                  Available Balance{autoActive ? " • Auto ON" : ""}
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

            {/* Tap & Earn — MAIN ROUND ORB directly in Available Balance (squeezed) */}
            <div className="hh-tap-earn-round-wrap mt-4 relative overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="hh-tap-icon-sm"><HandCoins className="h-4 w-4 text-white" /></div>
                  <span className="text-xs font-black tracking-widest text-white">TAP TO EARN</span>
                  <span className="hh-tap-badge">₦{earnPerTap}/tap</span>
                  {autoActive && <span className="hh-auto-on-badge">Auto</span>}
                </div>
                <span className="text-[11px] font-mono font-bold text-emerald-300 flex items-center gap-1"><Sparkles className="h-3 w-3"/> +₦{tapEarned.toLocaleString()}</span>
              </div>
              <div className="flex flex-col items-center py-1">
                <div className="hh-orb-stage-sm">
                  <div className={`te-halo ${autoActive ? "te-halo-auto" : tapEnergy > 0 ? "te-halo-active" : "te-halo-inactive"}`}></div>
                  <div className={`te-ring te-ring-outer ${autoActive ? "te-ring-auto" : ""}`}></div>
                  <div className={`te-ring te-ring-inner ${autoActive ? "te-ring-auto" : ""}`}></div>
                  <button data-tour="tap-orb" onClick={handleTapEarn} disabled={autoActive || (tapExhaustUntil!==null && tapExhaustLeft>0) || showRapidTapWarning} style={{ overflow: "hidden" }} className={`te-orb hh-orb-sm ${autoActive ? "te-orb-auto" : tapEnergy > 0 && !showRapidTapWarning ? "te-orb-active" : "te-orb-depleted"} ${tapTapping && !autoActive && !showRapidTapWarning ? "te-orb-tap" : ""} ${showRapidTapWarning ? "te-orb-locked" : ""}`} aria-label="Tap to earn">
                    {/* ── Water refill: fills bottom→up based on exhaust cooldown ──
                        fill% = 100 - (left / 10min * 100). At 5min left → 50%.
                        Starts the moment taps are used up (tapEnergy 0 → exhaust). */}
                    {tapExhaustUntil !== null && tapExhaustLeft > 0 && (() => {
                      const fill = Math.max(0, Math.min(100, 100 - (tapExhaustLeft / TAP_EXHAUST_COOLDOWN_MS) * 100));
                      return (
                        <span className="te-water" aria-hidden="true" style={{ height: `${fill}%` }}>
                          <span className="te-water-wave te-water-wave-a" />
                          <span className="te-water-wave te-water-wave-b" />
                          <span className="te-water-shimmer" />
                        </span>
                      );
                    })()}
                    <div className="te-orb-shine !top-3 !left-6 !w-10 !h-5"></div>
                    {/* Center icon — same as full game: Flame while auto, hand otherwise (mini sizing kept) */}
                    <div className="te-orb-center"><div className={autoActive ? "te-orb-auto-bounce" : "te-orb-icon-bounce"}>{autoActive ? (<Flame className="w-8 h-8 text-orange-300" strokeWidth={1.5} />) : (<HandCoins className="w-8 h-8 text-white" strokeWidth={1.5} />)}</div><span className="te-tap-label">{autoActive ? `AUTO` : (tapExhaustUntil !== null && tapExhaustLeft > 0 ? "FILLING" : "TAP")}</span></div>
                    {autoActive && autoFx.map((f) => (
                      <span key={f.id} className="te-auto-fx" style={{ left: `${f.x}%` }}>
                        {f.text ? <span className="te-auto-fx-reward">{f.text}</span> : null}
                        <span className="te-auto-fx-emoji">{f.emoji}</span>
                      </span>
                    ))}
                    {/* Orbiting stars — same as full game, radius scaled to fit the 118px mini orb */}
                    {[0, 120, 240].map((deg) => (
                      <div key={deg} className="te-orbit-star">
                        <Star
                          className="text-amber-400/50"
                          size={11}
                          fill="currentColor"
                          style={{
                            transform: `rotate(${deg}deg) translateX(47px) rotate(-${deg}deg)`,
                          }}
                        />
                      </div>
                    ))}
                  </button>
                  {tapParticles.map(p=> (<span key={p.id} className="hh-tap-particle" style={{left: 75 + (p.x - 28), top: 75 + (p.y - 28)}}>+₦{earnPerTap}</span>))}
                  {/* Rapid tap warning — same design as "100" popup but red, slower. Blocks tapping until it clears. */}
                  {showRapidTapWarning && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-auto z-10 rounded-full" aria-hidden="false">
                      <div className="rounded-full bg-red-600/90 border-4 border-red-400 px-6 py-3 text-center animate-pulse" style={{ animationDuration: "2s", boxShadow: "0 0 40px rgba(239,68,68,0.6)" }}>
                        <div className="text-white font-black text-xl">⚠ TOO FAST</div>
                        <div className="text-white/80 text-xs mt-1">Slow down, Two taps per seconds.</div>
                      </div>
                    </div>
                  )}
                  {/* Invisible tap-block overlay while warning is active — prevents orb clicks */}
                  {showRapidTapWarning && (
                    <div className="absolute inset-0 z-[5] cursor-not-allowed" aria-hidden="true" onClick={(e)=> e.preventDefault()} onTouchStart={(e)=> e.preventDefault()} />
                  )}
                </div>
              </div>
              {/* Auto tap toggle — compact row: ON/OFF in front of button */}
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${autoActive ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-white/10 text-white/60 border-white/10"}`}>{autoActive ? "ON" : "OFF"}</span>
                <span className="text-[11px] font-black tracking-widest text-white/80">AUTO TAP</span>
                <button type="button" onClick={handleAutoToggle} className={`hh-toggle ${autoActive ? 'hh-toggle-active' : ''}`} aria-label="Toggle auto tap">
                  <span className={`hh-toggle-dot ${autoActive ? 'hh-toggle-dot-active' : ''}`} />
                </button>
              </div>
              {autoActive ? (
                <>
                  <div className="flex items-center gap-2 mt-1">
                    {/* Same design as the manual bar: starts FULL, drains as auto-taps are used */}
                    <div className="hh-progress-track flex-1 !w-auto !h-2"><div className="hh-progress-fill" style={{ width: `${Math.max(0, Math.min(100, 100 - (autoTapsDone/(AUTO_PLANS.find(p=>p.id===autoPlan)?.maxTaps||1))*100))}%` }}></div></div>
                    <span className="text-[11px] font-mono font-bold whitespace-nowrap text-emerald-300"><Zap className="inline h-3 w-3 -mt-0.5"/>{autoTapsDone}/{AUTO_PLANS.find(p=>p.id===autoPlan)?.maxTaps}</span>
                  </div>
                  <div className="text-center text-[11px] font-bold text-orange-300 mt-1">Next +₦{earnPerTap.toLocaleString()} in {formatShortLeft(nextAutoCreditInMs)} • {formatAutoLeft(autoLeftMs)} left</div>
                </>
              ) : tapExhaustUntil && tapExhaustLeft>0 ? (
                <div className="text-center text-[11px] font-bold text-amber-300 mt-1 flex items-center justify-center gap-1"><Clock className="h-3 w-3"/> Exhausted 100/100 — wait {Math.floor(tapExhaustLeft/60000)}:{String(Math.floor((tapExhaustLeft%60000)/1000)).padStart(2,'0')} to recharge</div>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <div className="hh-progress-track flex-1 !w-auto !h-2"><div className="hh-progress-fill" style={{ width: `${(tapEnergy/TAP_MAX_ENERGY)*100}%` }}></div></div>
                  <span className={`text-[11px] font-mono font-bold whitespace-nowrap ${tapEnergy<20 ? 'text-amber-300' : 'text-white/80'}`}><Zap className="inline h-3 w-3 -mt-0.5"/>{tapEnergy}/{TAP_MAX_ENERGY}</span>
                </div>
              )}
              <div className="flex items-center justify-between mt-2"><span className="text-[11px] text-white/50">{autoActive ? `🔥 Auto tapping +₦${earnPerTap}/tap — balance rising even while away` : `Tap the round orb • balance +₦${earnPerTap} instantly`}</span><Link href="/earn/tap" className="text-[11px] font-bold text-emerald-300 hover:text-emerald-200">Full game →</Link></div>
            </div>
          </div>
        </div>

        {/* ── LOAN & WITHDRAW BUTTONS ── */}
        <div className="flex gap-3 hh-entry-3 mb-2">
          <Link href="/task" className="flex-1">
            <button className="hh-action-btn hh-action-purple w-full">
              <span className="hh-action-icon">💳</span>
              <span>Task</span>
            </button>
          </Link>
          <Link href="/withdraw" className="flex-1">
            <button
              onClick={(e) => {
                try {
                  const bd = getBankDetails();
                  if (!bd?.accountNumber) {
                    e.preventDefault();
                    toast({
                      title: "No payout account set up",
                      description: "Please add your bank account details first.",
                      variant: "destructive",
                    });
                    setTimeout(() => router.push("/setup-bank"), 1500);
                  }
                } catch {
                  e.preventDefault();
                  router.push("/setup-bank");
                }
              }}
              className="hh-action-btn hh-action-green w-full"
            >
              <span className="hh-action-icon">💸</span>
              <span>Withdraw</span>
            </button>
          </Link>
        </div>

        {/* ── TRUST SCORE — compounding, links to /trust-score page ── */}
        <Link href="/trust-score">
          <div
            data-tour="trust"
            className="hh-trust-card hh-entry-3 my-4"
            role="button"
            tabIndex={0}
          >
            <div className="hh-trust-header">
              <div className="hh-trust-icon">
                <Leaf className="h-5 w-5 text-white" />
              </div>
              <div className="hh-trust-text">
                <div className="hh-trust-label">Trust Score</div>
                <div className="hh-trust-value">{trustScore}</div>
              </div>
              <span className="hh-trust-badge">{getLevel(trustScore).label}</span>
            </div>
            <div className="hh-trust-track">
              <div className="hh-trust-fill" style={{ width: `${getProgress(trustScore)}%` }}></div>
            </div>
            <div className="hh-trust-footer">
              {(() => { const nxt = getNextLabel(trustScore); return nxt ? <>{nxt.need} more to <span className="hh-trust-level">{nxt.label}</span> · tap to see breakdown</> : <>Elite — max level unlocked 🎉</>; })()}
            </div>
          </div>
        </Link>

        {/* ── QUICK ACTIONS ── */}
        <div data-tour="quick-actions" className="hh-card hh-entry-4">
          <div className="hh-section-title">Quick Actions</div>
          <div className="space-y-3 mt-3">
            {/* Main 2-column grid: Daily Tasks, Loans, Channel, Q&A — all same hh-action-card design */}
            <div className="grid grid-cols-2 gap-3">
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


          </div>
        </div>

        {/* Support card moved below Referral card per request */}

        {/* ── SPIN & WIN — STAKE (guarded: 3/3 exhausted shows popup) ── */}
        <div data-tour="play-win" onClick={handlePlayWinClick} role="button" tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter") (handlePlayWinClick as any)(e); }}
          className="block hh-entry-4 cursor-pointer">
          <div className="hh-card relative overflow-hidden bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-600 border-amber-500/30 !p-4 flex items-center justify-between hover:from-amber-600 hover:to-emerald-600 transition cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="font-black text-white text-base flex items-center gap-2">Spin & Win <span className="px-2 py-0.5 rounded-full bg-white text-amber-600 text-[10px] font-black">×2</span></div>
                <div className="text-xs font-bold text-white/80">Stake to win — instant payout</div>
              </div>
            </div>
            <span className="px-4 py-2 rounded-full bg-white text-emerald-700 font-black text-sm shadow-lg">Spin →</span>
          </div>
        </div>

        {/* ── REFERRAL CARD ── */}
        <div data-tour="referral" className="hh-entry-5">
          {userData && <ReferralCard userId={userData.id || userData.userId} />}
        </div>

        {/* USER EMAIL FOOTER */}
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

      {/* ── MESSAGES INBOX (mail icon) — empty shows "Inbox is empty", no auto-redirect ── */}
      {showInbox && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setShowInbox(false)}>
          <div className="hh-popup max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                <Mail className="h-7 w-7 text-blue-300" />
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">Messages</h2>
            </div>
            {inboxReady.length === 0 && inboxUnread === 0 && inboxFeed.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm font-bold text-white/70">Inbox is empty</p>
                <p className="text-xs text-white/40 mt-1">No new messages yet.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-2 max-h-[50vh] overflow-y-auto">
                {inboxFeedUnread > 0 && (
                  <button
                    onClick={() => {
                      try {
                        const raw = localStorage.getItem("tivexx-user");
                        const u = raw ? JSON.parse(raw) : null;
                        const uid = u?.id || u?.userId || u?.user_id || "";
                        if (uid) void markInboxRead(uid);
                      } catch {}
                    }}
                    className="w-full text-center text-[11px] font-bold text-blue-300 hover:text-blue-200 py-1"
                  >
                    Mark all as read
                  </button>
                )}
                {inboxFeed.map((f: any) => (
                  <button
                    key={String(f.id)}
                    onClick={() => {
                      const fid = String(f.id);
                      const url = String(f.clickUrl || "/dashboard");
                      try {
                        const raw = localStorage.getItem("tivexx-user");
                        const u = raw ? JSON.parse(raw) : null;
                        const uid = u?.id || u?.userId || u?.user_id || "";
                        if (uid && !f.read) void markInboxRead(uid, [fid]);
                      } catch {}
                      setShowInbox(false);
                      // Channel broadcasts/DMs carry an external Boochat
                      // channel URL — open it (tap takes them to the channel).
                      // In-app paths still route client-side.
                      try {
                        if (/^https?:\/\//i.test(url)) {
                          window.open(url, "_blank", "noopener");
                        } else {
                          router.push(url.startsWith("/") ? url : "/dashboard");
                        }
                      } catch {
                        window.location.href = url;
                      }
                    }}
                    className={`w-full text-left rounded-2xl border p-3 ${f.read ? "border-white/10 bg-white/5" : "border-blue-500/30 bg-blue-500/10"}`}
                  >
                    <div className="flex items-center gap-2">
                      {!f.read && <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />}
                      <div className="text-sm font-black text-white flex-1 min-w-0 truncate">{String(f.title || "Notification")}</div>
                    </div>
                    {!!f.body && <div className="text-xs text-white/55 mt-0.5 line-clamp-2">{String(f.body)}</div>}
                    <div className="text-[10px] text-white/35 mt-1">
                      {(() => { try { const t = new Date(Number(f.at) || 0); return Number.isFinite(t.getTime()) && Number(f.at) > 0 ? t.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""; } catch { return ""; } })()}
                    </div>
                  </button>
                ))}
                {/* Boochat Join card: shows when user hasn't joined the partner channel */}
                {!boochatJoined && (
                  <div className="w-full rounded-2xl border border-emerald-500/20 bg-emerald-500/6 p-3 mb-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-black text-white truncate">Join {boochatPartnerName || "our"} channel to receive notifications and updates</div>
                        <div className="text-xs text-white/55 mt-1">Get announcements and direct messages from the channel.</div>
                      </div>
                      <div className="shrink-0">
                        <button
                          onClick={async () => {
                            // Resolve the signed join link first: on error
                            // (not configured / logged out) show a message
                            // instead of dumping the user on a raw JSON page.
                            try {
                              const r = await fetch("/api/boochat/link", { credentials: "same-origin" });
                              if (r.redirected && r.url) {
                                setShowInbox(false);
                                window.location.href = r.url;
                                return;
                              }
                              const j = await r.json().catch(() => ({} as any));
                              if (!r.ok) throw new Error(String((j as any)?.error || `Join failed (${r.status})`));
                              // No redirect (unexpected) — fall back to direct nav.
                              setShowInbox(false);
                              window.location.href = "/api/boochat/link";
                            } catch (e: any) {
                              try { toast({ title: "Could not open channel", description: String(e?.message || "Please try again later."), variant: "destructive" }); } catch {}
                            }
                          }}
                          className="px-3 py-2 rounded bg-emerald-500 text-white font-semibold"
                        >
                          Join
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {inboxUnread > 0 && (
                  <button
                    onClick={() => { setShowInbox(false); router.push("/chats"); }}
                    className="w-full text-left rounded-2xl border border-white/10 bg-white/5 p-3"
                  >
                    <div className="text-sm font-black text-white">Support reply</div>
                    <div className="text-xs text-white/55">You have {inboxUnread} unread chat message{inboxUnread > 1 ? "s" : ""} — tap to view</div>
                  </button>
                )}
                {inboxReady.map((p: any) => (
                  <button
                    key={p.id || p.reference}
                    onClick={() => { setShowInbox(false); router.push("/history?tab=withdrawals"); }}
                    className="w-full text-left rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3"
                  >
                    <div className="text-sm font-black text-white">Withdrawal ready — ₦{Number(p.amount || 0).toLocaleString()}</div>
                    <div className="text-xs text-white/55">Approved — tap to complete in History → Withdrawals</div>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setShowInbox(false)} className="hh-popup-btn hh-popup-btn-confirm w-full mt-4">Close</button>
          </div>
        </div>
      )}

      {/* ── SPIN 3/3 EXHAUSTED POPUP (dashboard → spin guard) ── */}
      {showSpinExhaustedPopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="hh-popup max-w-sm w-full mx-4 text-center">
            <div className="hh-popup-header flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 border border-amber-400/30 flex items-center justify-center">
                <Trophy className="h-7 w-7 text-amber-400" />
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">Spins Exhausted</h2>
              <span className="text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300">3/3 Used</span>
            </div>
            <p className="text-sm text-white/80 mt-4 leading-relaxed">
              You&apos;ve exceeded your <span className="font-black text-amber-300">3/3 spins</span> for today.
            </p>
            <p className="text-xs text-white/50 mt-2">
              Please come back tomorrow for more spins. Your balance and rewards are safe.
            </p>
            <button
              onClick={() => setShowSpinExhaustedPopup(false)}
              className="hh-popup-btn hh-popup-btn-confirm w-full mt-6"
            >
              Got it — I&apos;ll come back tomorrow
            </button>
          </div>
        </div>
      )}

      {/* ── BOTTOM NAV (shared 5-button: Home • About • Chats • Refer & Earn • Profile) ── */}
      <BottomNav />

      <style jsx global>{`
        /* ─── IMPORT FONT ─── */
        @import url("https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap");

        /* ─── ROOT & BACKGROUND ─── */
        .hh-root {
          font-family: "Syne", sans-serif;
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

        /* ─── MESH OVERLAY ─── */
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

        /* ─── CARDS ─── */
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

        .hh-card-balance {
          /* Task & Loan hero parity: amber accent (not blue), no scale transform — natural size */
          background: linear-gradient(
            135deg,
            rgba(16, 185, 129, 0.15) 0%,
            rgba(5, 13, 20, 0.9) 50%,
            rgba(245, 158, 11, 0.1) 100%
          );
          border-color: rgba(16, 185, 129, 0.2);
          box-shadow:
            0 0 40px rgba(16, 185, 129, 0.08),
            inset 0 0 40px rgba(0, 0, 0, 0.3);
        }

        .hh-card-profile {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.07) 0%,
            rgba(255, 255, 255, 0.02) 100%
          );
        }

        /* ─── ORB DECORATIONS ─── */
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
            rgba(59, 130, 246, 0.15),
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

        /* ─── AVATAR ─── */
        .hh-avatar-ring {
          position: relative;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          padding: 2px;
          background: linear-gradient(135deg, #10b981, #3b82f6, #8b5cf6);
          animation: hh-ring-spin 4s linear infinite;
        }

        @keyframes hh-ring-spin {
          0% {
            background: linear-gradient(135deg, #10b981, #3b82f6, #8b5cf6);
          }
          33% {
            background: linear-gradient(135deg, #3b82f6, #8b5cf6, #10b981);
          }
          66% {
            background: linear-gradient(135deg, #8b5cf6, #10b981, #3b82f6);
          }
          100% {
            background: linear-gradient(135deg, #10b981, #3b82f6, #8b5cf6);
          }
        }

        .hh-avatar {
          width: 100%;
          height: 100%;
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
          font-family: "JetBrains Mono", monospace;
          font-size: 11px;
          color: #10b981;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.2);
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
          font-family: "Syne", sans-serif;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
          position: relative;
          overflow: hidden;
          cursor: pointer;
          border: none;
          color: white;
        }

        .hh-action-btn:hover {
          transform: translateY(-2px) scale(1.02);
        }
        .hh-action-btn:active {
          transform: scale(0.97);
        }

        .hh-action-purple {
          background: linear-gradient(135deg, #7c3aed, #5b21b6);
          box-shadow: 0 4px 20px rgba(124, 58, 237, 0.3);
        }

        .hh-action-green {
          background: linear-gradient(135deg, #059669, #047857);
          box-shadow: 0 4px 20px rgba(5, 150, 105, 0.3);
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
          background: #10b981;
          box-shadow: 0 0 6px #10b981;
          animation: hh-live-pulse 1.5s ease-in-out infinite;
        }

        @keyframes hh-live-pulse {
          0%,
          100% {
            box-shadow: 0 0 4px #10b981;
            transform: scale(1);
          }
          50% {
            box-shadow:
              0 0 10px #10b981,
              0 0 20px rgba(16, 185, 129, 0.4);
            transform: scale(1.15);
          }
        }
        /* Auto-tap ON: green dot turns orange */
        .hh-live-dot-auto {
          background: #f97316 !important;
          box-shadow: 0 0 6px #f97316 !important;
          animation: hh-live-pulse-orange 0.9s ease-in-out infinite !important;
        }
        @keyframes hh-live-pulse-orange {
          0%, 100% { box-shadow: 0 0 4px #f97316; transform: scale(1); }
          50% { box-shadow: 0 0 12px #f97316, 0 0 24px rgba(249,115,22,0.5); transform: scale(1.25); }
        }
        /* Auto-tap orb: fast fire mode */
        .te-halo-auto {
          background: radial-gradient(circle, rgba(249,115,22,0.35) 0%, rgba(245,158,11,0.15) 50%, transparent 70%) !important;
          animation: te-halo-pulse 0.9s ease-in-out infinite !important;
        }
        .te-ring-auto {
          border-color: rgba(249,115,22,0.55) !important;
          animation-duration: 3s !important;
        }
        .te-orb-auto {
          background: radial-gradient(circle at 38% 32%, rgba(253,186,116,0.95), #f97316 48%, rgba(124,45,18,0.95) 100%) !important;
          box-shadow: inset 0 -12px 28px rgba(124,45,18,0.7), inset 0 6px 22px rgba(253,186,116,0.4), 0 0 60px rgba(249,115,22,0.65), 0 0 120px rgba(249,115,22,0.3) !important;
          animation: te-auto-pulse 0.9s ease-in-out infinite;
        }
        @keyframes te-auto-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.045); }
        }
        .te-orb-auto-bounce { animation: te-auto-bounce 0.55s ease-in-out infinite; }
        @keyframes te-auto-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-8px) scale(1.08); }
        }
        .te-auto-fx {
          position: absolute;
          bottom: 12%;
          pointer-events: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          z-index: 4;
          animation: te-auto-rise 1.3s ease-out forwards;
        }
        .te-auto-fx-reward {
          font-family: "JetBrains Mono", monospace;
          font-size: 17px;
          font-weight: 800;
          color: #fdba74;
          text-shadow: 0 0 12px rgba(249,115,22,0.9), 0 0 30px rgba(249,115,22,0.5);
          white-space: nowrap;
        }
        .te-auto-fx-emoji { font-size: 20px; filter: drop-shadow(0 0 8px rgba(249,115,22,0.8)); }
        @keyframes te-auto-rise {
          0% { opacity: 0; transform: translateY(20px) scale(0.6); }
          15% { opacity: 1; transform: translateY(0) scale(1.15); }
          100% { opacity: 0; transform: translateY(-110px) scale(1.3); }
        }

        /* ─── EYE BTN ─── */
        .hh-eye-btn {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 6px 10px;
          font-size: 16px;
          cursor: pointer;
          transition:
            background 0.2s,
            transform 0.15s;
        }

        .hh-eye-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: scale(1.05);
        }
        .hh-eye-btn:active {
          transform: scale(0.95);
        }

        /* ─── BALANCE ─── */
        .hh-balance-amount {
          font-family: "JetBrains Mono", monospace;
          min-height: 56px;
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
            text-shadow:
              0 0 20px rgba(52, 211, 153, 0.6),
              0 0 40px rgba(52, 211, 153, 0.3);
          }
          100% {
            text-shadow: none;
          }
        }

        /* ─── CLAIM SECTION ─── */
        .hh-claim-section {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 16px;
          padding: 16px;
        }

        .hh-reward-icon {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: linear-gradient(135deg, #10b981, #3b82f6);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .hh-timer-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-family: "JetBrains Mono", monospace;
          font-size: 12px;
          font-weight: 700;
          color: #10b981;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 20px;
          padding: 4px 10px;
        }

        /* ─── CLAIM BUTTON ─── */
        .hh-claim-btn {
          width: 100%;
          padding: 15px;
          border-radius: 14px;
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
          color: white;
        }

        .hh-claim-btn:hover {
          transform: translateY(-2px);
        }
        .hh-claim-btn:active {
          transform: scale(0.98);
        }

        .hh-claim-ready {
          background: linear-gradient(135deg, #10b981, #059669, #047857);
          box-shadow:
            0 6px 30px rgba(16, 185, 129, 0.4),
            0 2px 8px rgba(0, 0, 0, 0.3);
          animation: hh-claim-glow 2s ease-in-out infinite;
        }

        @keyframes hh-claim-glow {
          0%,
          100% {
            box-shadow:
              0 6px 30px rgba(16, 185, 129, 0.4),
              0 2px 8px rgba(0, 0, 0, 0.3);
          }
          50% {
            box-shadow:
              0 6px 40px rgba(16, 185, 129, 0.6),
              0 2px 8px rgba(0, 0, 0, 0.3),
              0 0 60px rgba(16, 185, 129, 0.15);
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
            rgba(234, 179, 8, 0.3),
            rgba(202, 138, 4, 0.3)
          );
          border: 1px solid rgba(234, 179, 8, 0.3);
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
            rgba(255, 255, 255, 0.15),
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
          background: linear-gradient(135deg, #065f46, #047857);
          border: 1px solid rgba(52, 211, 153, 0.4);
          border-radius: 18px;
          padding: 16px 24px;
          text-align: center;
          box-shadow:
            0 20px 60px rgba(0, 0, 0, 0.5),
            0 0 30px rgba(16, 185, 129, 0.2);
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
          background: #34d399;
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

        /* ─── CONFETTI ─── */
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
          background: #fbbf24;
          animation-delay: 0s;
        }
        .hh-confetti-2 {
          top: 5px;
          left: 40%;
          background: #f472b6;
          animation-delay: 0.1s;
        }
        .hh-confetti-3 {
          top: 5px;
          left: 60%;
          background: #60a5fa;
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
          background: #a78bfa;
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
          background: linear-gradient(90deg, #10b981, #3b82f6);
          border-radius: 10px;
          transition: width 0.5s ease;
          box-shadow: 0 0 6px rgba(16, 185, 129, 0.5);
        }

        /* ─── STATS ─── */
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

        /* ─── TRUST SCORE (replaces Today's income / Claims left) — image-matched but in site palette ─── */
        .hh-trust-card {
          background: rgba(255, 255, 255, 0.97);
          border: 1px solid rgba(255, 255, 255, 0.9);
          border-radius: 22px;
          padding: 16px 16px 14px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25), 0 2px 10px rgba(16, 185, 129, 0.08);
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .hh-trust-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 50px rgba(0, 0, 0, 0.3), 0 4px 16px rgba(16, 185, 129, 0.12);
        }
        .hh-trust-card:active {
          transform: scale(0.99);
        }
        .hh-trust-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .hh-trust-icon {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: linear-gradient(135deg, #10b981 0%, #059669 45%, #3b82f6 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 18px rgba(16, 185, 129, 0.35);
          flex-shrink: 0;
        }
        .hh-trust-text {
          flex: 1;
          min-width: 0;
        }
        .hh-trust-label {
          font-size: 13px;
          font-weight: 700;
          color: #1f2937;
          letter-spacing: -0.01em;
          line-height: 1;
        }
        .hh-trust-value {
          font-size: 26px;
          font-weight: 900;
          color: #111827;
          line-height: 1;
          margin-top: 4px;
          font-family: "Syne", sans-serif;
        }
        .hh-trust-badge {
          background: rgba(59, 130, 246, 0.12);
          border: 1px solid rgba(59, 130, 246, 0.18);
          color: #2563eb;
          font-size: 12px;
          font-weight: 800;
          padding: 6px 12px;
          border-radius: 9999px;
          letter-spacing: 0.01em;
        }
        .hh-trust-track {
          margin-top: 16px;
          height: 8px;
          background: #e5e7eb;
          border-radius: 9999px;
          overflow: hidden;
        }
        .hh-trust-fill {
          height: 100%;
          background: linear-gradient(90deg, #10b981, #059669);
          border-radius: 9999px;
          transition: width 0.5s ease;
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.45);
        }
        .hh-trust-footer {
          margin-top: 10px;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
          font-weight: 500;
        }
        .hh-trust-level {
          color: #111827;
          font-weight: 800;
        }
        /* dark-mode tuning to keep site cohesion when card sits on #050d14 */
        @media (prefers-color-scheme: dark) {
          .hh-trust-card {
            border-color: rgba(255, 255, 255, 0.9);
          }
        }

        /* ─── TAP & EARN COMPACT (replaces Daily Reward + Claim, squeezed) ─── */
        .hh-tap-earn-compact {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background: linear-gradient(135deg, rgba(16,185,129,0.16), rgba(5,150,105,0.14));
          border: 1px solid rgba(16,185,129,0.22);
          border-radius: 16px;
          padding: 10px 12px;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .hh-tap-earn-compact:hover {
          transform: translateY(-2px);
          border-color: rgba(16,185,129,0.35);
          box-shadow: 0 10px 30px rgba(16,185,129,0.18);
        }
        .hh-tap-earn-compact:active {
          transform: scale(0.98);
        }
        .hh-tap-earn-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .hh-tap-earn-icon {
          width: 36px;
          height: 36px;
          border-radius: 11px;
          background: linear-gradient(135deg, #10b981, #059669);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
          box-shadow: 0 4px 14px rgba(16,185,129,0.35);
        }
        .hh-tap-earn-title {
          font-size: 13px;
          font-weight: 800;
          color: white;
          line-height: 1.1;
          white-space: nowrap;
        }
        .hh-tap-earn-sub {
          font-size: 11px;
          color: rgba(255,255,255,0.65);
          margin-top: 2px;
          white-space: nowrap;
        }
        .hh-tap-earn-cta {
          display: flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          font-weight: 800;
          font-size: 12px;
          padding: 8px 12px;
          border-radius: 9999px;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(16,185,129,0.3);
        }
        .hh-tap-earn-arrow {
          font-size: 14px;
          line-height: 1;
          transition: transform 0.2s ease;
        }
        .hh-tap-earn-compact:hover .hh-tap-earn-arrow {
          transform: translateX(3px);
        }
        .hh-tap-earn-round-wrap {
          /* Matches task/loan card palette — same amber-tinted edge, natural size (no scale) */
          background: linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,13,20,0.5) 50%, rgba(245,158,11,0.08) 100%);
          border: 1px solid rgba(16,185,129,0.22);
          border-radius: 16px;
          padding: 9px 11px;
        }
        .hh-tap-icon-sm { width: 28px; height: 28px; border-radius: 8px; background: linear-gradient(135deg, #10b981, #3b82f6); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(16,185,129,0.25); flex-shrink: 0; }
        .hh-tap-badge { font-size: 9px; font-weight: 900; letter-spacing: 0.08em; background: rgba(16,185,129,0.18); color: #34d399; border: 1px solid rgba(16,185,129,0.3); border-radius: 20px; padding: 2px 6px; }
        .hh-tap-particle { position: absolute; font-size: 12px; font-weight: 900; color: #fbbf24; pointer-events: none; animation: hh-tap-float 0.7s ease-out forwards; text-shadow: 0 1px 6px rgba(0,0,0,0.4); white-space: nowrap; }
        @keyframes hh-tap-float { 0% { transform: translate(-50%, -50%) scale(0.8); opacity: 1; } 100% { transform: translate(-50%, -90px) scale(1.05); opacity: 0; } }
        .te-halo { position: absolute; inset: -28px; border-radius: 50%; animation: te-halo-pulse 2.4s ease-in-out infinite; }
        .te-halo-active { background: radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%); }
        .te-halo-inactive { background: radial-gradient(circle, rgba(107,114,128,0.1) 0%, transparent 70%); animation: none; }
        @keyframes te-halo-pulse { 0%,100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.1); opacity: 0.4; } }
        .te-ring { position: absolute; inset: 0; border-radius: 50%; }
        .te-ring-outer { inset: -38px; border: 2px dashed rgba(16,185,129,0.18); animation: te-spin 22s linear infinite; }
        .te-ring-inner { inset: -22px; border: 1px solid rgba(16,185,129,0.12); animation: te-spin 16s linear infinite reverse; }
        @keyframes te-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .te-orb { position: relative; width: 220px; height: 220px; border-radius: 50%; border: none; outline: none; cursor: pointer; transition: transform 0.12s cubic-bezier(0.34,1.56,0.64,1); user-select: none; -webkit-tap-highlight-color: transparent; }
        .te-orb-active { background: radial-gradient(circle at 38% 32%, rgba(52,211,153,0.95), #10b981 48%, rgba(6,95,70,0.9) 100%); box-shadow: inset 0 -12px 28px rgba(6,95,70,0.7), inset 0 6px 22px rgba(52,211,153,0.35), 0 0 60px rgba(16,185,129,0.45), 0 0 120px rgba(16,185,129,0.15); }
        .te-orb-depleted { background: radial-gradient(circle at 38% 32%, rgba(107,114,128,0.6), rgba(55,65,81,0.8) 100%); box-shadow: inset 0 -8px 20px rgba(0,0,0,0.5); opacity: 0.55; cursor: not-allowed; }
        .te-orb-tap { transform: scale(0.86) !important; }
        .te-orb-active:hover {
          box-shadow:
            inset 0 -12px 28px rgba(6, 95, 70, 0.7),
            inset 0 6px 22px rgba(52, 211, 153, 0.35),
            0 0 80px rgba(16, 185, 129, 0.6),
            0 0 140px rgba(16, 185, 129, 0.2);
        }
        .te-orb-shine { position: absolute; top: 18px; left: 36px; width: 80px; height: 36px; border-radius: 50%; background: linear-gradient(180deg, rgba(255,255,255,0.7), transparent); filter: blur(10px); opacity: 0.25; pointer-events: none; }
        .te-orb-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; }
        .te-orb-icon-bounce { animation: te-icon-bounce 1.6s ease-in-out infinite; }
        @keyframes te-icon-bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .te-tap-label { font-size: 10px; font-weight: 900; letter-spacing: 0.22em; color: rgba(255,255,255,0.65); animation: te-label-pulse 2s ease-in-out infinite; }
        @keyframes te-label-pulse { 0%,100% { opacity: 0.65; } 50% { opacity: 1; } }
        /* Orbiting stars — verbatim from full game */
        .te-orbit-star {
          position: absolute;
          top: 50%;
          left: 50%;
          animation: te-spin 8s linear infinite;
        }
        .hh-orb-stage-sm { position: relative; width: 135px; height: 135px; display: flex; align-items: center; justify-content: center; margin: 2px 0; }
        .hh-orb-stage-sm .te-halo { inset: -18px; }
        .hh-orb-stage-sm .te-ring-outer { inset: -22px; }
        .hh-orb-stage-sm .te-ring-inner { inset: -12px; }
        .hh-orb-sm { width: 118px !important; height: 118px !important; }
        .te-orb-locked { cursor: not-allowed; filter: brightness(0.85); }
        /* ── Calm water refill inside round orb (bottom → up, time-based) ── */
        .te-water { position: absolute; left: 0; right: 0; bottom: 0; height: 0%; overflow: visible;
          background: linear-gradient(to top, rgba(14,165,233,0.9) 0%, rgba(34,211,238,0.65) 55%, rgba(34,211,238,0.35) 100%);
          transition: height 1s linear; pointer-events: none; z-index: 1; }
        .te-orb-center { z-index: 2; }
        .te-orb-shine { z-index: 3; }
        .te-water-wave { position: absolute; top: -7px; left: -50%; width: 200%; height: 14px; pointer-events: none; }
        .te-water-wave-a { background: radial-gradient(ellipse 22px 7px at 22px 7px, rgba(255,255,255,0.45) 60%, transparent 61%);
          background-size: 44px 14px; background-repeat: repeat-x; opacity: 0.55;
          animation: te-water-drift 2.8s ease-in-out infinite; }
        .te-water-wave-b { background: radial-gradient(ellipse 30px 8px at 30px 8px, rgba(186,230,253,0.35) 60%, transparent 61%);
          background-size: 60px 14px; background-repeat: repeat-x; opacity: 0.4; top: -5px;
          animation: te-water-drift 4.2s ease-in-out infinite reverse; }
        .te-water-shimmer { position: absolute; inset: 0; pointer-events: none;
          background: linear-gradient(180deg, rgba(255,255,255,0.14), transparent 40%);
          animation: te-water-bob 3.2s ease-in-out infinite; }
        @keyframes te-water-drift { 0%,100% { transform: translateX(0); } 50% { transform: translateX(22px); } }
        @keyframes te-water-bob { 0%,100% { opacity: 0.7; } 50% { opacity: 1; } }
        .hh-icon-ring { width: 32px; height: 32px; border-radius: 10px; background: linear-gradient(135deg, rgba(16,185,129,0.2), rgba(245,158,11,0.2)); border: 1px solid rgba(245,158,11,0.3); display: flex; align-items: center; justify-content: center; }
        .hh-toggle { position: relative; width: 52px; height: 28px; border-radius: 30px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.1); cursor: pointer; transition: all 0.3s ease; flex-shrink: 0; }
        .hh-toggle-active { background: linear-gradient(135deg, #10b981, #059669); border-color: rgba(16,185,129,0.3); }
        .hh-toggle-dot { position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: white; transition: transform 0.3s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        .hh-toggle-dot-active { transform: translateX(24px); }
        .hh-auto-toggle { font-weight: 900; font-size: 11px; letter-spacing: 0.08em; padding: 6px 14px; border-radius: 9999px; border: 1px solid rgba(255,255,255,0.12); display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s; }
        .hh-auto-toggle-off { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.7); }
        .hh-auto-toggle-on { background: linear-gradient(135deg, #10b981, #059669); color: white; border-color: rgba(16,185,129,0.4); box-shadow: 0 4px 14px rgba(16,185,129,0.35); }
        .hh-auto-toggle-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; opacity: 0.9; }
        .hh-auto-on-badge { font-size: 9px; font-weight: 900; letter-spacing: 0.07em; background: rgba(16,185,129,0.22); color: #6ee7b7; border: 1px solid rgba(16,185,129,0.35); border-radius: 20px; padding: 2px 7px; }

        /* ─── SECTION TITLE ─── */
        .hh-section-title {
          font-size: 15px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.01em;
        }

        /* ─── ACTION CARDS GRID ─── */
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
            rgba(16, 185, 129, 0.08),
            rgba(59, 130, 246, 0.05)
          );
          opacity: 0;
          transition: opacity 0.25s ease;
          border-radius: 16px;
        }

        .hh-action-card:hover {
          transform: translateY(-4px) scale(1.02);
          border-color: rgba(16, 185, 129, 0.25);
          box-shadow:
            0 12px 30px rgba(0, 0, 0, 0.3),
            0 0 20px rgba(16, 185, 129, 0.06);
        }

        .hh-action-card:hover::before {
          opacity: 1;
        }
        .hh-action-card:active {
          transform: scale(0.97);
        }

        .hh-action-card-icon {
          font-size: 26px;
          line-height: 1;
          margin-bottom: 2px;
        }

        .hh-action-card-arrow {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.2);
          margin-top: 6px;
          transition:
            color 0.2s,
            transform 0.2s;
        }

        .hh-action-card:hover .hh-action-card-arrow {
          color: #10b981;
          transform: translateX(4px);
        }

        /* ─── SUPPORT BUTTONS ─── */
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
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }
        .hh-support-green {
          background: linear-gradient(135deg, #059669, #047857);
          box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
        }

        .hh-notif-dot {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 8px;
          height: 8px;
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
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .hh-tx-debit {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
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
          color: #10b981;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 20px;
          padding: 4px 12px;
          transition: all 0.2s;
          text-decoration: none;
        }

        .hh-see-more-btn:hover {
          background: rgba(16, 185, 129, 0.15);
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
          border: 2px solid rgba(16, 185, 129, 0.3);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
          transition: all 0.3s ease;
          z-index: 35;
        }

        .hh-floating-chat-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 30px rgba(16, 185, 129, 0.6);
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

        /* ─── DIALOG ─── */
        .hh-dialog {
          background: linear-gradient(135deg, #0d1f2d, #0a1628) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
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

        /* ─── SPIN-EXHAUSTED POPUP (card + GLOWING button, unmissable CTA) ─── */
        .hh-popup {
          background: linear-gradient(135deg, #0d1f2d, #0a1628);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 30px 60px rgba(0,0,0,0.5);
          animation: hh-popup-appear 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes hh-popup-appear {
          from { opacity: 0; transform: scale(0.8) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .hh-popup-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        .hh-popup-btn {
          display: block;
          width: 100%;
          padding: 15px 16px;
          border-radius: 14px;
          font-weight: 800;
          font-size: 15px;
          border: none;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.2s ease;
        }
        .hh-popup-btn-confirm {
          background: linear-gradient(135deg, #10b981, #059669);
          color: #fff;
          border: 1px solid rgba(16,185,129,0.55);
          box-shadow: 0 0 0 0 rgba(16,185,129,0.55), 0 8px 24px rgba(16,185,129,0.45);
          animation: hh-confirm-glow 1.8s ease-in-out infinite;
        }
        .hh-popup-btn-confirm:hover { transform: translateY(-2px); }
        .hh-popup-btn-confirm:active { transform: scale(0.97); }
        @keyframes hh-confirm-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.55), 0 8px 24px rgba(16,185,129,0.45); }
          50% { box-shadow: 0 0 0 10px rgba(16,185,129,0), 0 10px 32px rgba(16,185,129,0.65), 0 0 28px rgba(52,211,153,0.5); }
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

        /* ─── BROWSER CHECK POPUP ─── */
        .hh-browser-check-popup {
          background: linear-gradient(135deg, #0d1f2d, #0a1628);
          border: 1px solid rgba(16, 185, 129, 0.2);
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
            0 0 30px rgba(16, 185, 129, 0.1);
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
            rgba(16, 185, 129, 0.2),
            rgba(16, 185, 129, 0.05)
          );
          border: 1px solid rgba(16, 185, 129, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.15);
        }

        .hh-browser-check-link-container {
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 10px;
          padding: 10px;
          margin-bottom: 10px;
        }

        .hh-browser-check-link-box {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(16, 185, 129, 0.15);
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
          background: linear-gradient(
            135deg,
            rgba(16, 185, 129, 0.3),
            rgba(16, 185, 129, 0.1)
          );
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 8px;
          color: #10b981;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .hh-browser-check-copy-btn:hover {
          background: linear-gradient(
            135deg,
            rgba(16, 185, 129, 0.4),
            rgba(16, 185, 129, 0.15)
          );
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
          transform: translateY(-2px);
        }

        .hh-browser-check-copy-btn:active {
          transform: scale(0.98);
        }

        .hh-browser-check-copy-copied {
          background: linear-gradient(
            135deg,
            rgba(16, 185, 129, 0.5),
            rgba(16, 185, 129, 0.2)
          );
          color: #10b981;
          box-shadow: 0 0 25px rgba(16, 185, 129, 0.4);
        }

        .hh-browser-check-divider {
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(16, 185, 129, 0.2),
            transparent
          );
          margin: 10px 0;
        }

        .hh-browser-check-close-btn {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          font-weight: 700;
          font-size: 13px;
          border: none;
          border-radius: 10px;
          padding: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
        }

        .hh-browser-check-close-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(16, 185, 129, 0.5);
        }

        .hh-browser-check-close-btn:active {
          transform: scale(0.98);
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

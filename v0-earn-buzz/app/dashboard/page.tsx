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
  Headphones,
  Shield,
  TrendingUp,
  Users,
  MessageCircle,
  Leaf,
  Zap,
  HandCoins,
  Sparkles,
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
import { loadMeta, saveMeta, computeScore, getLevel, getNextLabel, getProgress, TRUST_TIME_KEY } from "@/lib/trust-score";
import { useToast } from "@/hooks/use-toast";
import {
  ensurePushRegistrationIntegrity,
  registerForFCM,
  requestNotificationPermission,
  showLocalNotification,
  getSubscriptionStatus,
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
  { id: "free1h", label: "1 hour FREE", sub: "First time only", durationMs: 60*60*1000, maxTaps: 600, maxEarn: 60000 },
  { id: "24h", label: "24 hours: 1500 taps", sub: "max 150,000", durationMs: 24*60*60*1000, maxTaps: 1500, maxEarn: 150000 },
  { id: "2d", label: "2 days: 3500 taps", sub: "max 350,000", durationMs: 2*24*60*60*1000, maxTaps: 3500, maxEarn: 350000 },
  { id: "3d", label: "3 days: 5500 taps", sub: "max 550,000", durationMs: 3*24*60*60*1000, maxTaps: 5500, maxEarn: 550000 },
  { id: "1w", label: "1 week: 10,000 taps", sub: "max 1,000,000", durationMs: 7*24*60*60*1000, maxTaps: 10000, maxEarn: 1000000 },
];
const AUTO_TAP_INTERVAL_MS = 800;
const getAutoIntervalMs = (planId: AutoPlanId) => {
  const p = AUTO_PLANS.find(x=>x.id===planId);
  if (!p) return AUTO_TAP_INTERVAL_MS;
  return Math.max(900, Math.floor(p.durationMs / p.maxTaps));
};
const AUTO_REQ_TASK: Record<AutoPlanId, number> = { free1h: 0, "24h": 20, "2d": 30, "3d": 40, "1w": 60 };
const AUTO_REQ_REF: Record<AutoPlanId, number> = { free1h: 0, "24h": 10, "2d": 20, "3d": 30, "1w": 50 };
const AUTO_REQ_PAY: Record<AutoPlanId, number> = { free1h: 0, "24h": 20000, "2d": 30000, "3d": 50000, "1w": 100000 };
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
  // auto tap
  const [autoActive, setAutoActive] = useState(false);
  const [autoPlan, setAutoPlan] = useState<AutoPlanId | null>(null);
  const [autoExpiresAt, setAutoExpiresAt] = useState<number | null>(null);
  const [autoTapsDone, setAutoTapsDone] = useState(0);
  const [autoLeftMs, setAutoLeftMs] = useState(0);
  const [autoFirstFreeUsed, setAutoFirstFreeUsed] = useState(false);
  const [showAutoPlans, setShowAutoPlans] = useState(false);
  const [showAutoFreePopup, setShowAutoFreePopup] = useState(false);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showAutoReq, setShowAutoReq] = useState(false);
  const [reqPlan, setReqPlan] = useState<AutoPlanId | null>(null);
  const [reqChoice, setReqChoice] = useState<"task"|"referral"|"payment"|null>(null);
  const [autoRefCode, setAutoRefCode] = useState<string>("");
  const [autoRefCount, setAutoRefCount] = useState(0);
  const [autoTaskDone, setAutoTaskDone] = useState(0);
  const [mtTaskDone, setMtTaskDone] = useState(0);
  const [muTaskDone, setMuTaskDone] = useState(0);
  const [autoPlanCooldowns, setAutoPlanCooldowns] = useState<Record<string, number>>({});
  const [nowTick, setNowTick] = useState(() => Date.now());
  // ── Trust Score (compounding) ──
  const [trustScore, setTrustScore] = useState(0);
  const [trustMeta, setTrustMeta] = useState<any>(null);
  const [showTrustInfo, setShowTrustInfo] = useState(false);
  const [showGuided, setShowGuided] = useState(false);
  // Notification prompt — only shown after successful login/signup (gated behind auth, not for guests)
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<{ hasAny: boolean; hasFcm: boolean; hasWebpush: boolean } | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

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

  // ── Tap-to-Earn: load + regen + persist + exhaust 10min + auto tap ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TAP_STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        const elapsed = Date.now() - (s.lastTime || Date.now());
        const regen = Math.floor(elapsed / TAP_ENERGY_REGEN_MS);
        const energy = Math.min(TAP_MAX_ENERGY, (s.energy ?? TAP_MAX_ENERGY) + regen);
        setTapEnergy(energy);
        setTapEarned(s.earned || 0);
      }
      const ex = localStorage.getItem(TAP_EXHAUST_KEY);
      if (ex) {
        const until = Number(ex);
        if (until > Date.now()) { setTapExhaustUntil(until); setTapEnergy(0); }
        else localStorage.removeItem(TAP_EXHAUST_KEY);
      }
      const aRaw = localStorage.getItem(AUTO_TAP_KEY);
      if (aRaw) {
        const a = JSON.parse(aRaw);
        setAutoFirstFreeUsed(!!a.firstFreeUsed);
        if (a.active && a.expiresAt && a.expiresAt > Date.now() && a.tapsDone < (AUTO_PLANS.find(p=>p.id===a.planId)?.maxTaps ?? Infinity)) {
          setAutoActive(true); setAutoPlan(a.planId); setAutoExpiresAt(a.expiresAt); setAutoTapsDone(a.tapsDone||0);
        } else if (a.firstFreeUsed) {
          // keep flag
        }
      }
      try { 
        const cMt = JSON.parse(localStorage.getItem("mt-completed-tasks")||"[]"); setMtTaskDone(Array.isArray(cMt)?cMt.length:0);
        const cMu = JSON.parse(localStorage.getItem("mu-completed-tasks")||"[]"); setMuTaskDone(Array.isArray(cMu)?cMu.length:0);
        // legacy
        const c = JSON.parse(localStorage.getItem("auto-tap-completed-tasks")||"[]"); setAutoTaskDone(Array.isArray(c)?c.length:0);
        try { const cd = JSON.parse(localStorage.getItem(AUTO_PLAN_COOLDOWN_KEY)||"{}"); if (cd && typeof cd==="object") setAutoPlanCooldowns(cd); } catch {}
      } catch {}
    } catch {}
  }, []);
  useEffect(()=>{
    const id=setInterval(()=>{ try{ 
      const cMt = JSON.parse(localStorage.getItem("mt-completed-tasks")||"[]"); setMtTaskDone(Array.isArray(cMt)?cMt.length:0);
      const cMu = JSON.parse(localStorage.getItem("mu-completed-tasks")||"[]"); setMuTaskDone(Array.isArray(cMu)?cMu.length:0);
      const c = JSON.parse(localStorage.getItem("auto-tap-completed-tasks")||"[]"); setAutoTaskDone(Array.isArray(c)?c.length:0);
    }catch{} }, 1000);
    const upd=()=>{ try{ 
      const cMt = JSON.parse(localStorage.getItem("mt-completed-tasks")||"[]"); setMtTaskDone(Array.isArray(cMt)?cMt.length:0);
      const cMu = JSON.parse(localStorage.getItem("mu-completed-tasks")||"[]"); setMuTaskDone(Array.isArray(cMu)?cMu.length:0);
      const c = JSON.parse(localStorage.getItem("auto-tap-completed-tasks")||"[]"); setAutoTaskDone(Array.isArray(c)?c.length:0);
    }catch{} };
    window.addEventListener("focus",upd); window.addEventListener("storage",upd as any);
    return ()=>{ clearInterval(id); window.removeEventListener("focus",upd); window.removeEventListener("storage",upd as any); };
  }, []);
  // tick for 1-week lock countdown display
  useEffect(()=>{ const id=setInterval(()=> setNowTick(Date.now()), 60000); return ()=> clearInterval(id); }, []);
  // exhaust countdown
  useEffect(() => {
    if (!tapExhaustUntil) { setTapExhaustLeft(0); return; }
    const tick = () => {
      const left = Math.max(0, tapExhaustUntil - Date.now());
      setTapExhaustLeft(left);
      if (left === 0) {
        setTapExhaustUntil(null);
        try { localStorage.removeItem(TAP_EXHAUST_KEY); } catch {}
        setTapEnergy(TAP_MAX_ENERGY);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tapExhaustUntil]);
  // regen (blocked while exhausted)
  useEffect(() => {
    const id = setInterval(() => {
      if (tapExhaustUntil && tapExhaustUntil > Date.now()) return;
      setTapEnergy((prev) => (prev >= TAP_MAX_ENERGY ? prev : Math.min(TAP_MAX_ENERGY, prev + 1)));
    }, TAP_ENERGY_REGEN_MS);
    return () => clearInterval(id);
  }, [tapExhaustUntil]);
  useEffect(() => {
    try { localStorage.setItem(TAP_STORAGE_KEY, JSON.stringify({ energy: tapEnergy, earned: tapEarned, lastTime: Date.now() })); } catch {}
    if (tapEnergy === 0 && !tapExhaustUntil) {
      const until = Date.now() + TAP_EXHAUST_COOLDOWN_MS;
      setTapExhaustUntil(until);
      try { localStorage.setItem(TAP_EXHAUST_KEY, String(until)); } catch {}
    }
  }, [tapEnergy, tapEarned]);
  // ── Trust Score engine (compounding) ──
  useEffect(() => {
    // initial load
    try {
      const m = loadMeta();
      // hydrate referral from /api may come later; pay count from localStorage
      const payRaw = localStorage.getItem("tivexx-pay-count");
      if (payRaw) m.payCount = Number(payRaw) || m.payCount;
      const navRaw = localStorage.getItem("tivexx-nav-count");
      if (navRaw) m.navCount = Number(navRaw) || m.navCount;
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
        // accumulate visible time only
        const now = Date.now();
        const delta = document.visibilityState === "visible" ? now - lastSave : 0;
        lastSave = now;
        const total = prev + delta;
        localStorage.setItem(TRUST_TIME_KEY, String(total));
        m.timeMs = total;
        // pull latest referral count from state if available
        // referralCount will be synced separately
        m.referralCount = autoRefCount || m.referralCount;
        const nav = Number(localStorage.getItem("tivexx-nav-count") || "0");
        m.navCount = nav;
        const pay = Number(localStorage.getItem("tivexx-pay-count") || "0");
        m.payCount = pay;
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
      }
    } catch {}
  }, [userData, autoRefCount]);
  // sync completed tasks → +1 each (compounding)
  useEffect(() => {
    try {
      const totalTasks = (mtTaskDone || 0) + (muTaskDone || 0) + (autoTaskDone || 0);
      // also include generic task key if present
      let generic = 0;
      try { const g = JSON.parse(localStorage.getItem("tivexx-completed-tasks") || "[]"); if (Array.isArray(g)) generic = g.length; } catch {}
      const all = totalTasks + generic;
      const m = loadMeta();
      if (all !== m.taskCount) {
        m.taskCount = all;
        saveMeta(m);
        setTrustScore(computeScore(m));
        setTrustMeta({ ...m });
        if (all > 0 && all > (m.taskCount - 1) && all <= 20) { /* quiet, no spam */ }
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
  // auto-show guided onboarding once for new users (not static — moving spotlight)
  // This deploy: force for BOTH old + new users once (v2), afterwards new users only
  useEffect(() => {
    try {
      const force = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tour") === "1";
      if (force) {
        const t = setTimeout(() => setShowGuided(true), 600);
        return () => clearTimeout(t);
      }
      const V2_KEY = "tivexx-guided-v2-shown";
      if (!localStorage.getItem(V2_KEY)) {
        const t = setTimeout(() => setShowGuided(true), 1200);
        return () => clearTimeout(t);
      }
    } catch {}
  }, []);
  // persist auto
  useEffect(() => {
    try { localStorage.setItem(AUTO_TAP_KEY, JSON.stringify({ active: autoActive, planId: autoPlan, expiresAt: autoExpiresAt, tapsDone: autoTapsDone, firstFreeUsed: autoFirstFreeUsed })); } catch {}
  }, [autoActive, autoPlan, autoExpiresAt, autoTapsDone, autoFirstFreeUsed]);
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
  // auto tap interval — duration-matched: maxTaps spread evenly over plan duration (e.g. 24h/1500 ≈ 57.6s per tap)
  // exhaust/regen returned: auto consumes tapEnergy and will pause on exhaust, but guarantees maxTaps anyway (waits regen, then resumes)
  useEffect(() => {
    if (!autoActive) { if (autoTimerRef.current) clearInterval(autoTimerRef.current); autoTimerRef.current = null; return; }
    const plan = AUTO_PLANS.find(p=>p.id===autoPlan);
    const max = plan?.maxTaps ?? Infinity;
    const intervalMs = getAutoIntervalMs(autoPlan);
    autoTimerRef.current = setInterval(() => {
      if (autoTapsDone >= max) return;
      if (tapExhaustUntil && tapExhaustUntil > Date.now()) return; // wait exhaust regen, but don't abort — will resume
      if (tapEnergy <= 0) return; // wait regen 6s, then next tick will fire
      setTapEnergy(p=> Math.max(0, p-1));
      setTapEarned(p=> p+TAP_EARN_PER);
      setBalance(p=> p+TAP_EARN_PER);
      setAutoTapsDone(p=> p+1);
      syncTapToBalance(TAP_EARN_PER);
      const id = tapPid.current++;
      setTapParticles(prev=> [...prev, { id, x: 75, y: 20 }]);
      setTimeout(()=> setTapParticles(prev=> prev.filter(p=>p.id!==id)), 700);
    }, intervalMs);
    return () => { if (autoTimerRef.current) clearInterval(autoTimerRef.current); };
  }, [autoActive, autoPlan, autoTapsDone, tapEnergy, tapExhaustUntil]);
  const syncTapToBalance = useCallback((amount: number) => {
    tapAccum.current += amount;
    if (tapSyncTimeout.current) clearTimeout(tapSyncTimeout.current);
    tapSyncTimeout.current = setTimeout(() => {
      const total = tapAccum.current;
      if (total === 0) return;
      try {
        const raw = localStorage.getItem("tivexx-user");
        if (raw) {
          const u = JSON.parse(raw);
          const uid = u.id || u.userId;
          u.balance = (u.balance || 0) + total;
          localStorage.setItem("tivexx-user", JSON.stringify(u));
          persistUserSession(u);
          setUserData(u);
          if (uid) void fetch("/api/user-balance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: uid, balance: u.balance }) });
        }
      } catch {}
      tapAccum.current = 0;
    }, 1200);
  }, []);
  const handleTapEarn = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    try { (e as any).stopPropagation?.(); } catch {}
    if (autoActive) return; // locked while auto
    if (tapExhaustUntil && tapExhaustUntil > Date.now()) { toast({ title: "Exhausted", description: `Wait ${Math.ceil(tapExhaustLeft/60000)}m ${Math.ceil((tapExhaustLeft%60000)/1000)}s to recharge` }); return; }
    if (tapEnergy <= 0) { toast({ title: "Out of energy", description: "Wait 10 mins to recharge or use Auto Tap ⚡" }); return; }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
    if ("touches" in (e as any) && (e as any).touches?.[0]) { cx = (e as any).touches[0].clientX; cy = (e as any).touches[0].clientY; }
    else if ("clientX" in (e as any)) { cx = (e as any).clientX; cy = (e as any).clientY; }
    const id = tapPid.current++;
    setTapParticles((prev) => [...prev, { id, x: cx - rect.left, y: cy - rect.top }]);
    setTimeout(() => setTapParticles((prev) => prev.filter((p) => p.id !== id)), 700);
    setTapTapping(true); setTimeout(() => setTapTapping(false), 140);
    setTapEnergy((p) => p - 1);
    setTapEarned((p) => p + TAP_EARN_PER);
    setBalance((p) => p + TAP_EARN_PER);
    setTapCount((p) => p + 1);
    syncTapToBalance(TAP_EARN_PER);
  }, [tapEnergy, toast, syncTapToBalance, autoActive, tapExhaustUntil, tapExhaustLeft]);
  const handleAutoToggle = useCallback(() => {
    if (autoActive) { setAutoActive(false); setAutoExpiresAt(null); toast({ title: "Auto tap OFF" }); return; }
    if (!autoFirstFreeUsed) setShowAutoFreePopup(true);
    setShowAutoPlans(true);
  }, [autoActive, autoFirstFreeUsed, toast]);
  const startAutoPlan = useCallback((id: AutoPlanId) => {
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
        const cntRaw = localStorage.getItem(`auto_ref_count_${id}`);
        setAutoRefCount(cntRaw ? Number(cntRaw) : 0);
      } catch { setAutoRefCode(""); }
      return;
    }
    const plan = AUTO_PLANS.find(p=>p.id===id)!;
    setAutoPlan(id); setAutoExpiresAt(Date.now()+plan.durationMs); setAutoTapsDone(0); setAutoActive(true);
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
  }, [autoFirstFreeUsed, toast, userData, autoPlanCooldowns]);
  const fulfillRequirement = useCallback(async () => {
    if (!reqPlan || !reqChoice) return;
    const plan = AUTO_PLANS.find(p=>p.id===reqPlan)!;
    if (reqChoice==="task") {
      const need = AUTO_REQ_TASK[reqPlan];
      const isMt = reqPlan==="24h" || reqPlan==="3d";
      const key = isMt ? "mt-completed-tasks" : "mu-completed-tasks";
      const completed = JSON.parse(localStorage.getItem(key)||"[]");
      const done = Array.isArray(completed) ? completed.length : 0;
      if (done < need) { toast({ title: "Requirement not met", description: `Need ${need} tasks, you have ${done}. Go to ${isMt ? "MT" : "MU"} Tasks.` }); return; }
    }
    if (reqChoice==="referral") {
      const need = AUTO_REQ_REF[reqPlan];
      const cntRaw = localStorage.getItem(`auto_ref_count_${reqPlan}`);
      const cnt = cntRaw ? Number(cntRaw) : 0;
      // also check total referrals
      let totalRef = 0;
      try { const r = await fetch(`/api/referral-stats?userId=${userData?.id||userData?.userId}`); const j=await r.json(); if(j.success) totalRef=j.referral_count||0; } catch {}
      const effective = Math.max(cnt, totalRef);
      if (effective < need) { toast({ title: "Requirement not met", description: `Need ${need} referrals, you have ${effective}` }); return; }
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
    // start auto
    setAutoPlan(reqPlan); setAutoExpiresAt(Date.now()+plan.durationMs); setAutoTapsDone(0); setAutoActive(true);
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
  }, [reqPlan, reqChoice, balance, userData, toast, autoPlanCooldowns]);
  const copyAutoRefLink = useCallback(()=>{
    const link = `${window.location.origin}/refer?ref=${autoRefCode}`;
    navigator.clipboard.writeText(link).then(()=> toast({ title:"Copied", description: link }));
  }, [autoRefCode, toast]);
  const formatAutoLeft = (ms:number) => {
    const s = Math.floor(ms/1000); const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60;
    if (h>0) return `${h}h ${m}m ${sec}s`; return `${m}m ${sec}s`;
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
    const referralLink = `${typeof window !== "undefined" ? window.location.origin : ""}/refer?ref=${userData?.userId || "ref"}`;
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
        if (perm === "denied") toast({ title: "Notifications blocked", description: "Please enable in browser settings." });
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

  const handleCheckNotificationStatus = useCallback(async () => {
    if (!userData) return;
    const uid = (userData as any).id || userData.userId;
    if (!uid) return;
    setIsCheckingStatus(true);
    try {
      if (typeof Notification !== "undefined") setNotificationPermission(Notification.permission as NotificationPermission);
      const status = await getSubscriptionStatus(uid);
      setSubscriptionStatus(status);
      toast({
        title: status.hasAny ? "Notifications active" : "No subscription found",
        description: status.hasAny
          ? `FCM: ${status.hasFcm ? "yes" : "no"} • WebPush: ${status.hasWebpush ? "yes" : "no"}`
          : "Tap Enable to subscribe.",
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
        <DialogContent className="hh-dialog max-w-sm">
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
      {/* Trust Score breakdown */}
      <Dialog open={showTrustInfo} onOpenChange={setShowTrustInfo}>
        <DialogContent className="hh-dialog max-w-sm">
          <DialogHeader><DialogTitle className="text-white flex items-center gap-2"><Award className="h-5 w-5 text-emerald-400"/> Trust Score — how it compounds</DialogTitle><DialogDescription className="text-white/60 text-xs">Everything compounds. Your score = sum of all actions.</DialogDescription></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="rounded-2xl bg-gradient-to-br from-emerald-500/15 to-blue-500/15 border border-emerald-500/20 p-4 flex items-center justify-between">
              <div><div className="text-xs text-white/60 uppercase tracking-wider font-bold">Your Score</div><div className="text-3xl font-black text-white">{trustScore}</div><div className="text-xs font-bold" style={{color: getLevel(trustScore).color}}>{getLevel(trustScore).label} • {getProgress(trustScore)}%</div></div>
              <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center"><span className="text-2xl font-black" style={{color: getLevel(trustScore).color}}>{trustScore}</span></div>
            </div>
            {(() => { const m = trustMeta || { timeMs:0, referralCount:0, navCount:0, payCount:0, taskCount:0 }; const timePts=Math.floor(m.timeMs/(5*60*1000))*2; const refPts=Math.floor(m.referralCount/10)*2; const navPts=m.navCount*1; const payPts=m.payCount*5; const taskPts=(m.taskCount||0)*1; const rows=[
              { label:"Time in app (5m = +2)", value: `${Math.floor(m.timeMs/60000)}m`, pts: timePts, icon: Clock, color:"text-emerald-400" },
              { label:"Referrals (10 = +2)", value: `${m.referralCount}`, pts: refPts, icon: Users, color:"text-violet-400" },
              { label:"Tasks done (+1 each)", value: `${m.taskCount||0}`, pts: taskPts, icon: Gift, color:"text-emerald-300" },
              { label:"App navigations (+1 each)", value: `${m.navCount}`, pts: navPts, icon: TrendingUp, color:"text-amber-400" },
              { label:"Payments into app (+5 each)", value: `${m.payCount}`, pts: payPts, icon: Wallet, color:"text-blue-400" },
            ]; return rows.map(r=> (<div key={r.label} className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-3 py-2.5"><div className="flex items-center gap-2.5"><div className={`w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center ${r.color}`}><r.icon className="h-4 w-4"/></div><div><div className="text-xs font-bold text-white">{r.label}</div><div className="text-[11px] text-white/50">{r.value} → +{r.pts}</div></div></div><span className="text-sm font-black text-white">+{r.pts}</span></div>)); })()}
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-200 leading-relaxed">💡 Tip: Stay 5 mins, do tasks (+1 each), invite 10 friends, explore, and fund once — you instantly jump to <b>Trusted</b>. Everything compounds.</div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={()=>{ setShowTrustInfo(false); localStorage.removeItem("tivexx-guided-v2-shown"); localStorage.removeItem("tivexx-guided-shown"); setTimeout(()=> setShowGuided(true), 300); }} className="rounded-full border-white/15 text-white">Replay tour</Button>
              <Button onClick={()=>{ setShowTrustInfo(false); setShowGuided(true); }} className="rounded-full bg-white text-[#050d14] font-black">Take guided tour →</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showWithdrawalNotification && (
        <WithdrawalNotification onClose={handleCloseWithdrawalNotification} />
      )}

      {/* ── AUTO TAP: Eligible popup (1hr free) ── */}
      <Dialog open={showAutoFreePopup} onOpenChange={setShowAutoFreePopup}>
        <DialogContent className="hh-dialog max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-xl text-white">🎉 You are eligible!</DialogTitle>
            <DialogDescription className="text-center pt-2 text-gray-300">You have 1 hour of FREE auto tap. Your balance will increase automatically without tapping.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={()=> setShowAutoFreePopup(false)} className="flex-1 rounded-full border-white/15 text-white">Later</Button>
            <Button onClick={()=> { setShowAutoFreePopup(false); startAutoPlan("free1h"); }} className="flex-1 hh-btn-primary rounded-full">Start FREE 1hr</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* ── AUTO TAP: Plan selector ── */}
      <Dialog open={showAutoPlans} onOpenChange={setShowAutoPlans}>
        <DialogContent className="hh-dialog max-w-sm max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-lg text-white">Choose Auto Tap Plan</DialogTitle>
            <DialogDescription className="text-center text-xs text-gray-400">Only first-time users get 1hr FREE. After that it is crossed out.</DialogDescription>
          </DialogHeader>
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
        </DialogContent>
      </Dialog>
      {/* ── AUTO TAP: Requirement chooser for paid plans ── */}
      <Dialog open={showAutoReq} onOpenChange={setShowAutoReq}>
        <DialogContent className="hh-dialog max-w-sm max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-lg text-white">Requirement for {reqPlan ? AUTO_PLANS.find(p=>p.id===reqPlan)?.label : ""}</DialogTitle>
            <DialogDescription className="text-center text-xs text-gray-400">Choose one of 3 options. Referrals use a new tracking link and count to your total.</DialogDescription>
          </DialogHeader>
          {reqPlan && (
            <div className="space-y-3 mt-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white/70 w-5 text-center shrink-0">a</span>
                <button onClick={()=> { setReqChoice("task"); const need=AUTO_REQ_TASK[reqPlan]; const path=(reqPlan==="24h"||reqPlan==="3d")?`/mt-tasks?need=${need}`:`/mu-tasks?need=${need}`; router.push(path); }} className={`flex-1 text-left rounded-2xl border p-3 flex items-center justify-between ${reqChoice==="task" ? "border-emerald-400 bg-emerald-500/15" : "border-white/10 bg-white/5"}`}>
                  <div>
                    <div className="text-sm font-black text-white">{AUTO_REQ_TASK[reqPlan]} tasks required</div>
                    <div className="text-xs text-white/70 mt-1">you've only done {(reqPlan==="24h"||reqPlan==="3d") ? mtTaskDone : muTaskDone}/{AUTO_REQ_TASK[reqPlan]}</div>
                    <div className="mt-1 text-xs text-white/50">Open {(reqPlan==="24h"||reqPlan==="3d")?"MT":"MU"} Tasks ({AUTO_REQ_TASK[reqPlan]})</div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500 text-white ml-2 shrink-0">Start</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white/70 w-5 text-center shrink-0">b</span>
                <button onClick={()=> { setReqChoice("referral"); router.push(`/refer/auto-tap?plan=${reqPlan}`); setShowAutoReq(false); }} className={`flex-1 text-left rounded-2xl border p-3 flex items-center justify-between ${reqChoice==="referral" ? "border-emerald-400 bg-emerald-500/15" : "border-white/10 bg-white/5"}`}>
                  <div>
                    <div className="text-sm font-black text-white">Referral — {AUTO_REQ_REF[reqPlan]} referrals</div>
                    <div className="text-xs text-white/60 mt-1">New tracking link will be generated for this plan.</div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500 text-white ml-2 shrink-0">Start</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white/70 w-5 text-center shrink-0">c</span>
                <button onClick={()=> setReqChoice("payment")} className={`flex-1 text-left rounded-2xl border p-3 flex items-center justify-between ${reqChoice==="payment" ? "border-emerald-400 bg-emerald-500/15" : "border-white/10 bg-white/5"}`}>
                  <div>
                    <div className="text-sm font-black text-white">Pay ₦{AUTO_REQ_PAY[reqPlan].toLocaleString()} for {AUTO_PLANS.find(p=>p.id===reqPlan)?.maxEarn.toLocaleString()} estimated taps</div>
                    <div className="text-xs text-white/60 mt-1">One-time payment to unlock auto tap for this plan.</div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500 text-white ml-2 shrink-0">Start</span>
                </button>
              </div>
              <Button onClick={fulfillRequirement} disabled={!reqChoice} className="w-full hh-btn-primary rounded-full font-black">Unlock & Start Auto Tap</Button>
              <Button variant="outline" onClick={()=> setShowAutoReq(false)} className="w-full rounded-full border-white/15 text-white">Cancel</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
        <div data-tour="balance" className="hh-card hh-card-balance hh-entry-2 relative overflow-hidden">
          {/* Decorative glow orbs */}
          <div className="hh-orb hh-orb-1" aria-hidden="true"></div>
          <div className="hh-orb hh-orb-2" aria-hidden="true"></div>

          <div className="relative z-10">
            {/* Balance header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="hh-live-dot"></span>
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
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

            {/* Tap & Earn — MAIN ROUND ORB directly in Available Balance (squeezed) */}
            <div className="hh-tap-earn-round-wrap mt-4 relative overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="hh-tap-icon-sm"><HandCoins className="h-4 w-4 text-white" /></div>
                  <span className="text-xs font-black tracking-widest text-white">TAP TO EARN</span>
                  <span className="hh-tap-badge">₦{TAP_EARN_PER}/tap</span>
                  {autoActive && <span className="hh-auto-on-badge">AUTO ON • {formatAutoLeft(autoLeftMs)}</span>}
                </div>
                <span className="text-[11px] font-mono font-bold text-emerald-300 flex items-center gap-1"><Sparkles className="h-3 w-3"/> +₦{tapEarned.toLocaleString()}</span>
              </div>
              <div className="flex flex-col items-center py-1">
                <div className="hh-orb-stage-sm">
                  <div className={`te-halo ${tapEnergy > 0 && !autoActive ? "te-halo-active" : "te-halo-inactive"}`}></div>
                  <div className="te-ring te-ring-outer" style={autoActive?{animationPlayState:'paused'}:undefined}></div>
                  <div className="te-ring te-ring-inner" style={autoActive?{animationPlayState:'paused'}:undefined}></div>
                  <button data-tour="tap-orb" onClick={handleTapEarn} disabled={autoActive || (tapExhaustUntil!==null && tapExhaustLeft>0)} className={`te-orb hh-orb-sm ${tapEnergy > 0 && !autoActive ? "te-orb-active" : "te-orb-depleted"} ${tapTapping && !autoActive ? "te-orb-tap" : ""} ${autoActive ? "te-orb-locked" : ""}`} aria-label="Tap to earn">
                    <div className="te-orb-shine !top-3 !left-6 !w-10 !h-5"></div>
                    <div className="te-orb-center"><div className={autoActive ? "" : "te-orb-icon-bounce"}><HandCoins className="w-8 h-8 text-white" strokeWidth={1.5} /></div><span className="te-tap-label">{autoActive ? "AUTO" : "TAP"}</span></div>
                  </button>
                  {tapParticles.map(p=> (<span key={p.id} className="hh-tap-particle" style={{left: 75 + (p.x - 28), top: 75 + (p.y - 28)}}>+₦{TAP_EARN_PER}</span>))}
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
                <div className="flex items-center gap-2 mt-1">
                  <div className="hh-progress-track flex-1 !w-auto !h-2"><div className="hh-progress-fill" style={{ width: `${Math.min(100,(autoTapsDone/(AUTO_PLANS.find(p=>p.id===autoPlan)?.maxTaps||1))*100)}%` }}></div></div>
                  <span className="text-[11px] font-mono font-bold whitespace-nowrap text-emerald-300"><Zap className="inline h-3 w-3 -mt-0.5"/>{TAP_MAX_ENERGY}/{AUTO_PLANS.find(p=>p.id===autoPlan)?.maxTaps}</span>
                </div>
              ) : tapExhaustUntil && tapExhaustLeft>0 ? (
                <div className="text-center text-[11px] font-bold text-amber-300 mt-1 flex items-center justify-center gap-1"><Clock className="h-3 w-3"/> Exhausted 100/100 — wait {Math.floor(tapExhaustLeft/60000)}:{String(Math.floor((tapExhaustLeft%60000)/1000)).padStart(2,'0')} to recharge</div>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <div className="hh-progress-track flex-1 !w-auto !h-2"><div className="hh-progress-fill" style={{ width: `${(tapEnergy/TAP_MAX_ENERGY)*100}%` }}></div></div>
                  <span className={`text-[11px] font-mono font-bold whitespace-nowrap ${tapEnergy<20 ? 'text-amber-300' : 'text-white/80'}`}><Zap className="inline h-3 w-3 -mt-0.5"/>{tapEnergy}/{TAP_MAX_ENERGY}</span>
                </div>
              )}
              <div className="flex items-center justify-between mt-2"><span className="text-[11px] text-white/50">{autoActive ? "Auto tapping — balance rising" : "Tap the round orb • balance +₦100 instantly"}</span><Link href="/earn/tap" className="text-[11px] font-bold text-emerald-300 hover:text-emerald-200">Full game →</Link></div>
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

        {/* ── TRUST SCORE — compounding, tap for breakdown ── */}
        <div
          data-tour="trust"
          className="hh-trust-card hh-entry-3"
          onClick={() => setShowTrustInfo(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter") setShowTrustInfo(true);
          }}
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

        {/* ── QUICK ACTIONS ── */}
        <div data-tour="quick-actions" className="hh-card hh-entry-4">
          <div className="hh-section-title">Quick Actions</div>
          <div className="space-y-3 mt-3">
            {/* Main 2-column grid for first 4 items */}
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

        {/* ── PLAY & WIN — STAKE ── */}
        <Link data-tour="play-win" href="/stake" className="block hh-entry-4">
          <div className="hh-card relative overflow-hidden bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-600 border-amber-500/30 !p-4 flex items-center justify-between hover:from-amber-600 hover:to-emerald-600 transition cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="font-black text-white text-base flex items-center gap-2">Play & Win <span className="px-2 py-0.5 rounded-full bg-white text-amber-600 text-[10px] font-black">×2.2</span></div>
                <div className="text-xs font-bold text-white/80">Stake to win — instant payout</div>
              </div>
            </div>
            <span className="px-4 py-2 rounded-full bg-white text-emerald-700 font-black text-sm shadow-lg">Play →</span>
          </div>
        </Link>

        {/* ── REFERRAL CARD ── */}
        <div data-tour="referral" className="hh-entry-5">
          {userData && <ReferralCard userId={userData.id || userData.userId} />}
        </div>

        {/* ── NOTIFICATIONS — Enable & Check Status (inside dashboard, only after login/signup) ── */}
        <div className="hh-card hh-entry-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${notificationPermission === "granted" ? "bg-emerald-500" : "bg-gray-700"}`}>
                {notificationPermission === "granted" ? <Bell className="h-5 w-5 text-white" /> : <BellOff className="h-5 w-5 text-white/80" />}
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Notifications</h3>
                <p className="text-xs text-gray-400">
                  {notificationPermission === "granted"
                    ? "Enabled — you'll get claim alerts"
                    : notificationPermission === "denied"
                      ? "Blocked — enable in browser settings"
                      : "Enable to get claim-ready alerts"}
                </p>
              </div>
            </div>
            {subscriptionStatus?.hasAny && <span className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">Active</span>}
          </div>

          {subscriptionStatus && (
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-white/5 border border-white/10 py-2">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">Permission</div>
                <div className="text-xs font-bold text-white capitalize">{notificationPermission ?? "unknown"}</div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 py-2">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">FCM</div>
                <div className={`text-xs font-bold ${subscriptionStatus.hasFcm ? "text-emerald-300" : "text-gray-400"}`}>{subscriptionStatus.hasFcm ? "yes" : "no"}</div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 py-2">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">WebPush</div>
                <div className={`text-xs font-bold ${subscriptionStatus.hasWebpush ? "text-emerald-300" : "text-gray-400"}`}>{subscriptionStatus.hasWebpush ? "yes" : "no"}</div>
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button
              onClick={handleEnableNotifications}
              disabled={notificationPermission === "granted" && !!subscriptionStatus?.hasAny}
              className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50"
            >
              {notificationPermission === "granted" ? "Enabled" : "Enable"}
            </Button>
            <Button
              variant="outline"
              onClick={handleCheckNotificationStatus}
              disabled={isCheckingStatus}
              className="rounded-full border-white/15 text-white hover:bg-white/10 bg-transparent"
            >
              {isCheckingStatus ? "Checking…" : "Check status"}
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-gray-500 text-center">Only visible after you log in or sign up. Guests don&apos;t see this.</p>
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
          background: linear-gradient(
            135deg,
            rgba(16, 185, 129, 0.15) 0%,
            rgba(5, 13, 20, 0.9) 50%,
            rgba(59, 130, 246, 0.1) 100%
          );
          border-color: rgba(16, 185, 129, 0.2);
          box-shadow:
            0 0 40px rgba(16, 185, 129, 0.08),
            inset 0 0 40px rgba(0, 0, 0, 0.3);
          /* reduce height by 32% total (20% + 12%) to make box shorter */
          transform: scaleY(0.58);
          transform-origin: top;
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
          background: linear-gradient(135deg, rgba(16,185,129,0.16), rgba(5,150,105,0.14));
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
        .te-orb-shine { position: absolute; top: 18px; left: 36px; width: 80px; height: 36px; border-radius: 50%; background: linear-gradient(180deg, rgba(255,255,255,0.7), transparent); filter: blur(10px); opacity: 0.25; pointer-events: none; }
        .te-orb-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; }
        .te-orb-icon-bounce { animation: te-icon-bounce 1.6s ease-in-out infinite; }
        @keyframes te-icon-bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .te-tap-label { font-size: 10px; font-weight: 900; letter-spacing: 0.22em; color: rgba(255,255,255,0.65); animation: te-label-pulse 2s ease-in-out infinite; }
        @keyframes te-label-pulse { 0%,100% { opacity: 0.65; } 50% { opacity: 1; } }
        .hh-orb-stage-sm { position: relative; width: 135px; height: 135px; display: flex; align-items: center; justify-content: center; margin: 2px 0; }
        .hh-orb-stage-sm .te-halo { inset: -18px; }
        .hh-orb-stage-sm .te-ring-outer { inset: -22px; }
        .hh-orb-stage-sm .te-ring-inner { inset: -12px; }
        .hh-orb-sm { width: 118px !important; height: 118px !important; }
        .te-orb-locked { cursor: not-allowed; filter: brightness(0.85); }
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

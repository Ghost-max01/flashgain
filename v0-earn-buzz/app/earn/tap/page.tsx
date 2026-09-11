"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  ArrowLeft,
  Zap,
  HandCoins,
  Sparkles,
  TrendingUp,
  Crown,
  Star,
  CircleDollarSign,
  Clock,
} from "lucide-react";

// ── Auto Tap constants (same as dashboard) ──
const AUTO_TAP_KEY = "auto_tap_state";
type AutoPlanId = "free1h" | "24h" | "2d" | "3d" | "1w";
const AUTO_PLANS: { id: AutoPlanId; label: string; sub: string; durationMs: number; maxTaps: number; maxEarn: number }[] = [
  { id: "free1h", label: "20 mins FREE", sub: "First time only", durationMs: 20*60*1000, maxTaps: 200, maxEarn: 20000 },
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
const AUTO_REQ_TASK: Record<AutoPlanId, number> = { free1h: 0, "24h": 20, "2d": 30, "3d": 40, "1w": 100 };
const AUTO_REQ_REF: Record<AutoPlanId, number> = { free1h: 0, "24h": 10, "2d": 20, "3d": 30, "1w": 50 };
const AUTO_REQ_PAY: Record<AutoPlanId, number> = { free1h: 0, "24h": 15000, "2d": 20000, "3d": 30000, "1w": 50000 };
const AUTO_REF_LINK_KEY = "auto_tap_ref_code";
const AUTO_PLAN_COOLDOWN_KEY = "auto_tap_plan_cooldowns";
const AUTO_PLAN_COOLDOWN_MS = 7*24*60*60*1000;

const MAX_ENERGY = 100;
const EARN_PER_TAP = 100;
const ENERGY_REGEN_MS = 6000; // kept for reference but gradual regen is disabled per requirement
const TAP_EXHAUST_COOLDOWN_MS = 10 * 60 * 1000;
const TAP_EXHAUST_KEY = "tap_exhaust_until";
const STORAGE_KEY = "tap_earn_state";

interface TapParticle {
  id: number;
  x: number;
  y: number;
  emoji: string;
}

const TAP_EMOJIS = ["💰", "⚡", "✨", "💎", "🔥"];

const loadState = () => {
  if (typeof window === "undefined") {
    return {
      energy: MAX_ENERGY,
      earned: 0,
      lastTime: Date.now(),
      initialBalance: 0,
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const storedUser = localStorage.getItem("tivexx-user");
    const currentBalance = storedUser
      ? JSON.parse(storedUser)?.balance || 0
      : 0;

    if (!raw) {
      return {
        energy: MAX_ENERGY,
        earned: 0,
        lastTime: Date.now(),
        initialBalance: currentBalance,
      };
    }

    const s = JSON.parse(raw);
    // No gradual refill — keep stored energy exactly; exhaust countdown handles full refill to 100
    const energy = Math.min(MAX_ENERGY, Math.max(0, s.energy ?? MAX_ENERGY));

    return {
      energy,
      earned: s.earned || 0,
      lastTime: Date.now(),
      initialBalance: currentBalance,
    };
  } catch {
    const storedUser = localStorage.getItem("tivexx-user");
    const currentBalance = storedUser
      ? JSON.parse(storedUser)?.balance || 0
      : 0;
    return {
      energy: MAX_ENERGY,
      earned: 0,
      lastTime: Date.now(),
      initialBalance: currentBalance,
    };
  }
};

export default function TapAndEarnPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState({
    energy: MAX_ENERGY,
    earned: 0,
    lastTime: Date.now(),
    initialBalance: 0,
  });
  const [particles, setParticles] = useState<TapParticle[]>([]);
  const [tapping, setTapping] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [showPrompt, setShowPrompt] = useState(false);
  const particleId = useRef(0);
  const syncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accumulatedEarned = useRef(0);
  const [showTaskPopup, setShowTaskPopup] = useState(false);
  const [completedTasksCount, setCompletedTasksCount] = useState(0);
  const [hasShownTaskPopup, setHasShownTaskPopup] = useState(false);
  const [mounted, setMounted] = useState(false);
  // Rapid tap warning (same as dashboard) & exhaust (no refill until 10m)
  const [tapTimestamps, setTapTimestamps] = useState<number[]>([]);
  const [showRapidTapWarning, setShowRapidTapWarning] = useState(false);
  const rapidTapWarningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tapExhaustUntil, setTapExhaustUntil] = useState<number | null>(null);
  const [tapExhaustLeft, setTapExhaustLeft] = useState(0);

  // ── Auto Tap state ──
  const [autoActive, setAutoActive] = useState(false);
  const [autoPlan, setAutoPlan] = useState<AutoPlanId | null>(null);
  const [autoExpiresAt, setAutoExpiresAt] = useState<number | null>(null);
  const [autoTapsDone, setAutoTapsDone] = useState(0);
  const [autoFirstFreeUsed, setAutoFirstFreeUsed] = useState(false);
  const [autoLeftMs, setAutoLeftMs] = useState(0);
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
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Global cleanup of stray ad elements (just in case) ──────────────
  // useEffect(() => {
  //   setMounted(true);

  //   // Check task completion status
  //   const checkTaskCompletion = () => {
  //     const completedTasks = JSON.parse(localStorage.getItem("tivexx-completed-tasks") || "[]");
  //     setCompletedTasksCount(completedTasks.length);
  //   };

  //   checkTaskCompletion();

  //   const cleanupAds = () => {
  //     const allAdScripts = document.querySelectorAll(
  //       'script[src*="5gvci.com"], script[src*="llvpn.com"]',
  //     );
  //     allAdScripts.forEach((script) => {
  //       const dataPage = script.getAttribute("data-page");
  //       if (!dataPage || !dataPage.startsWith("tap-earn")) {
  //         if (script.parentNode) script.parentNode.removeChild(script);
  //       }
  //     });
  //     const adContainers = document.querySelectorAll(
  //       '[id*="monetag"], [id*="llvpn"], [class*="monetag"], [class*="llvpn"]',
  //     );
  //     adContainers.forEach((container) => {
  //       if (container && container.parentNode)
  //         container.parentNode.removeChild(container);
  //     });
  //   };
  //   cleanupAds();
  //   return () => cleanupAds();
  // }, []);

  // ─── Watch for task completion changes ──────────────
  useEffect(() => {
    const handleStorageChange = () => {
      const completedTasks = JSON.parse(localStorage.getItem("tivexx-completed-tasks") || "[]");
      setCompletedTasksCount(completedTasks.length);
    };

    // Listen for storage changes (when tasks are completed on other pages)
    window.addEventListener('storage', handleStorageChange);

    // Also check periodically in case tasks are completed in the same tab
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // ─── STRICT CONTAINMENT: sandboxed iframe, only on /earn/tap ─────────
  useEffect(() => {
    // Only run on client and EXACTLY on /earn/tap
    if (typeof window === "undefined" || pathname !== "/earn/tap") return;

    // Avoid duplicates
    if (document.getElementById("tap-ads-iframe")) return;

    const iframe = document.createElement("iframe");
    iframe.id = "tap-ads-iframe";
    iframe.style.display = "none";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    iframe.style.position = "absolute";
    iframe.style.left = "-9999px";

    // Sandbox: allow scripts ONLY – no popups, no top navigation, no same‑origin access
    iframe.sandbox.add("allow-scripts");

    // Minimal HTML that loads both ad scripts
    const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>ads</title></head><body>
      <script src="https://5gvci.com/act/files/tag.min.js?z=10297783" data-cfasync="false" async></script>
      <script src="https://llvpn.com/tag.min.js" data-zone="10297781" async></script>
    </body></html>`;

    iframe.srcdoc = htmlContent;
    document.body.appendChild(iframe);

    // Destroy the iframe when leaving the tap page
    return () => {
      const el = document.getElementById("tap-ads-iframe");
      if (el && el.parentNode) el.parentNode.removeChild(el);
    };
  }, [pathname]);

  // ─── Rest of the component ───────────────────────────────
  useEffect(() => {
    setMounted(true);
    const loaded = loadState();
    setState(loaded);
    // Load exhaust state — if still in cooldown, stay at 0 and not tappable
    try {
      const ex = localStorage.getItem(TAP_EXHAUST_KEY);
      if (ex) {
        const until = Number(ex);
        if (until > Date.now()) {
          setTapExhaustUntil(until);
          setState((prev) => ({ ...prev, energy: 0 }));
        } else localStorage.removeItem(TAP_EXHAUST_KEY);
      }
      // If loaded state has 0 energy and no exhaust yet, start exhaust
      if (loaded.energy <= 0 && !localStorage.getItem(TAP_EXHAUST_KEY)) {
        const until = Date.now() + TAP_EXHAUST_COOLDOWN_MS;
        setTapExhaustUntil(until);
        try { localStorage.setItem(TAP_EXHAUST_KEY, String(until)); } catch {}
      }
    } catch {}
    // Load auto tap state
    try {
      const aRaw = localStorage.getItem(AUTO_TAP_KEY);
      if (aRaw) {
        const a = JSON.parse(aRaw);
        setAutoFirstFreeUsed(!!a.firstFreeUsed);
        if (a.active && a.expiresAt && a.expiresAt > Date.now() && a.tapsDone < (AUTO_PLANS.find(p=>p.id===a.planId)?.maxTaps ?? Infinity)) {
          setAutoActive(true); setAutoPlan(a.planId); setAutoExpiresAt(a.expiresAt); setAutoTapsDone(a.tapsDone||0);
        }
      }
      const cd = JSON.parse(localStorage.getItem(AUTO_PLAN_COOLDOWN_KEY)||"{}");
      if (cd && typeof cd==="object") setAutoPlanCooldowns(cd);
    } catch {}
  }, []);

  // persist auto tap
  useEffect(() => {
    try { localStorage.setItem(AUTO_TAP_KEY, JSON.stringify({ active: autoActive, planId: autoPlan, expiresAt: autoExpiresAt, tapsDone: autoTapsDone, firstFreeUsed: autoFirstFreeUsed })); } catch {}
  }, [autoActive, autoPlan, autoExpiresAt, autoTapsDone, autoFirstFreeUsed]);

  // auto tap countdown + expire
  useEffect(() => {
    if (!autoActive || !autoExpiresAt) { setAutoLeftMs(0); return; }
    const tick = () => {
      const left = Math.max(0, autoExpiresAt - Date.now());
      setAutoLeftMs(left);
      if (left === 0) { setAutoActive(false); setAutoExpiresAt(null); }
      const plan = AUTO_PLANS.find(p=>p.id===autoPlan);
      if (plan && autoTapsDone >= plan.maxTaps) { setAutoActive(false); setAutoExpiresAt(null); }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [autoActive, autoExpiresAt, autoPlan, autoTapsDone]);

  // auto tap interval — duration-matched
  useEffect(() => {
    if (!autoActive) { if (autoTimerRef.current) clearInterval(autoTimerRef.current); autoTimerRef.current = null; return; }
    const plan = AUTO_PLANS.find(p=>p.id===autoPlan);
    const max = plan?.maxTaps ?? Infinity;
    const intervalMs = getAutoIntervalMs(autoPlan);
    autoTimerRef.current = setInterval(() => {
      if (autoTapsDone >= max) return;
      if (state.energy <= 0) return;
      setState((prev) => ({ ...prev, energy: Math.max(0, prev.energy - 1), earned: prev.earned + EARN_PER_TAP }));
      setAutoTapsDone(p=> p+1);
      syncToDb(EARN_PER_TAP);
    }, intervalMs);
    return () => { if (autoTimerRef.current) clearInterval(autoTimerRef.current); };
  }, [autoActive, autoPlan, autoTapsDone, state.energy]);

  // sync tasks count — global + per-plan isolated (each plan starts at 0)
  useEffect(()=>{
    const loadPerPlan = () => {
      const per: Record<string, number> = {};
      (["24h","2d","3d","1w"] as AutoPlanId[]).forEach(pid=>{ try{ const k=getPerPlanTaskKey(pid); const arr=JSON.parse(localStorage.getItem(k)||"[]"); per[pid]=Array.isArray(arr)?arr.length:0;}catch{ per[pid]=0;}});
      setPerPlanTaskDone(per);
    };
    loadPerPlan();
    const id=setInterval(()=>{ try{ 
      const cMt = JSON.parse(localStorage.getItem("mt-completed-tasks")||"[]"); setMtTaskDone(Array.isArray(cMt)?cMt.length:0);
      const cMu = JSON.parse(localStorage.getItem("mu-completed-tasks")||"[]"); setMuTaskDone(Array.isArray(cMu)?cMu.length:0);
      const c = JSON.parse(localStorage.getItem("auto-tap-completed-tasks")||"[]"); setAutoTaskDone(Array.isArray(c)?c.length:0);
      loadPerPlan();
    }catch{} }, 1000);
    const upd=()=>{ try{ 
      const cMt = JSON.parse(localStorage.getItem("mt-completed-tasks")||"[]"); setMtTaskDone(Array.isArray(cMt)?cMt.length:0);
      const cMu = JSON.parse(localStorage.getItem("mu-completed-tasks")||"[]"); setMuTaskDone(Array.isArray(cMu)?cMu.length:0);
      const c = JSON.parse(localStorage.getItem("auto-tap-completed-tasks")||"[]"); setAutoTaskDone(Array.isArray(c)?c.length:0);
      loadPerPlan();
    }catch{} };
    window.addEventListener("focus",upd); window.addEventListener("storage",upd as any);
    return ()=>{ clearInterval(id); window.removeEventListener("focus",upd); window.removeEventListener("storage",upd as any); };
  }, []);

  // Exhaust countdown — snaps to 100 when done, stays 0 until then (no gradual refill)
  useEffect(() => {
    if (!tapExhaustUntil) { setTapExhaustLeft(0); return; }
    const tick = () => {
      const left = Math.max(0, tapExhaustUntil - Date.now());
      setTapExhaustLeft(left);
      if (left === 0) {
        setTapExhaustUntil(null);
        try { localStorage.removeItem(TAP_EXHAUST_KEY); } catch {}
        setState((prev) => ({ ...prev, energy: MAX_ENERGY }));
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tapExhaustUntil]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...state, lastTime: Date.now() }),
    );
    if (state.energy === 0 && !tapExhaustUntil) {
      const until = Date.now() + TAP_EXHAUST_COOLDOWN_MS;
      setTapExhaustUntil(until);
      try { localStorage.setItem(TAP_EXHAUST_KEY, String(until)); } catch {}
    }
  }, [state]);

  useEffect(() => {
    return () => {
      if (syncTimeout.current) clearTimeout(syncTimeout.current);
      if (accumulatedEarned.current > 0) {
        try {
          const storedUser = localStorage.getItem("tivexx-user");
          if (storedUser) {
            const currentUser = JSON.parse(storedUser);
            const uid = currentUser.id || currentUser.userId;
            if (uid) {
              currentUser.balance =
                (currentUser.balance || 0) + accumulatedEarned.current;
              localStorage.setItem("tivexx-user", JSON.stringify(currentUser));
              console.log(
                `[Tap Earn] Unmount sync: ₦${accumulatedEarned.current} to balance. Final: ₦${currentUser.balance}`,
              );
              try {
                void fetch("/api/user-balance", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    userId: uid,
                    balance: currentUser.balance,
                  }),
                });
              } catch (err) {
                console.error("[Tap Earn] Unmount server sync failed:", err);
              }
              accumulatedEarned.current = 0;
            }
          }
        } catch (error) {
          console.error("Unmount sync error:", error);
        }
      }
    };
  }, []);

  // Removed gradual ENERGY_REGEN_MS interval — energy does not refill until 10-min exhaust finishes

  const syncToDb = useCallback((earnedAmount: number) => {
    accumulatedEarned.current += earnedAmount;
    if (syncTimeout.current) clearTimeout(syncTimeout.current);
    syncTimeout.current = setTimeout(() => {
      const totalEarned = accumulatedEarned.current;
      if (totalEarned === 0) return;
      try {
        const storedUser = localStorage.getItem("tivexx-user");
        if (storedUser) {
          const currentUser = JSON.parse(storedUser);
          const uid = currentUser.id || currentUser.userId;
          if (uid) {
            currentUser.balance = (currentUser.balance || 0) + totalEarned;
            localStorage.setItem("tivexx-user", JSON.stringify(currentUser));
            console.log(
              `[Tap Earn] Synced ₦${totalEarned} to balance. New balance: ₦${currentUser.balance}`,
            );
            try {
              void fetch("/api/user-balance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  userId: uid,
                  balance: currentUser.balance,
                }),
              });
            } catch (err) {
              console.error("[Tap Earn] Server sync failed:", err);
            }
            accumulatedEarned.current = 0;
          }
        }
      } catch (error) {
        console.error("Sync error:", error);
      }
    }, 1500);
  }, []);

  const pressEarningsToDb = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        const totalEarned = accumulatedEarned.current;
        if (totalEarned === 0) {
          resolve(false);
          return;
        }
        if (syncTimeout.current) clearTimeout(syncTimeout.current);
        const storedUser = localStorage.getItem("tivexx-user");
        if (storedUser) {
          const currentUser = JSON.parse(storedUser);
          const uid = currentUser.id || currentUser.userId;
          if (uid) {
            currentUser.balance = (currentUser.balance || 0) + totalEarned;
            localStorage.setItem("tivexx-user", JSON.stringify(currentUser));
            console.log(
              `[Tap Earn] Force synced ₦${totalEarned} to balance. New balance: ₦${currentUser.balance}`,
            );
            (async () => {
              try {
                await fetch("/api/user-balance", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    userId: uid,
                    balance: currentUser.balance,
                  }),
                });
              } catch (err) {
                console.error("[Tap Earn] Force server sync failed:", err);
              }
            })();
            accumulatedEarned.current = 0;
            resolve(true);
            return;
          }
        }
        resolve(false);
      } catch (error) {
        console.error("Force sync error:", error);
        resolve(false);
      }
    });
  }, []);

  const handleNavigateBack = useCallback(async () => {
    await pressEarningsToDb();
    router.push("/dashboard");
  }, [pressEarningsToDb, router]);

  const handleTap = useCallback(
    (
      e:
        | React.MouseEvent<HTMLButtonElement>
        | React.TouchEvent<HTMLButtonElement>,
    ) => {
      // No task gate — user can tap immediately (requirement removed)
      if (showRapidTapWarning) return;
      if (autoActive) return; // locked while auto
      if (tapExhaustUntil && tapExhaustUntil > Date.now()) return;
      if (state.energy <= 0) {
        setShowPrompt(true);
        return;
      }
      // Rapid tap detection — >3 taps in 1 sec triggers warning (same as dashboard)
      const now = Date.now();
      const recentTaps = tapTimestamps.filter((t) => now - t < 1000);
      if (recentTaps.length >= 3) {
        setShowRapidTapWarning(true);
        if (rapidTapWarningRef.current) clearTimeout(rapidTapWarningRef.current);
        rapidTapWarningRef.current = setTimeout(() => {
          setShowRapidTapWarning(false);
          setTapTimestamps([]);
        }, 2000);
        return;
      }
      setTapTimestamps((prev) => [...prev.slice(-10), now]);
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      let clientX: number, clientY: number;
      if ("touches" in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      const id = particleId.current++;
      const emoji = TAP_EMOJIS[id % TAP_EMOJIS.length];
      setParticles((prev) => [
        ...prev,
        { id, x: clientX - rect.left, y: clientY - rect.top, emoji },
      ]);
      setTimeout(
        () => setParticles((prev) => prev.filter((p) => p.id !== id)),
        900,
      );
      setTapping(true);
      setTapCount((prev) => prev + 1);
      setTimeout(() => setTapping(false), 120);
      setState((prev) => ({
        ...prev,
        energy: prev.energy - 1,
        earned: prev.earned + EARN_PER_TAP,
      }));
      syncToDb(EARN_PER_TAP);
    },
    [state.energy, syncToDb, autoActive, tapExhaustUntil, tapTimestamps, showRapidTapWarning],
  );

  // ── Auto Tap handlers ──
  const handleAutoToggle = useCallback(() => {
    if (autoActive) { setAutoActive(false); setAutoExpiresAt(null); return; }
    if (!autoFirstFreeUsed) setShowAutoFreePopup(true);
    setShowAutoPlans(true);
  }, [autoActive, autoFirstFreeUsed]);

  const startAutoPlan = useCallback((id: AutoPlanId) => {
    const cd = autoPlanCooldowns[id];
    if (cd && cd > Date.now()) return;
    if (id === "free1h" && autoFirstFreeUsed) return;
    if (id !== "free1h") {
      setReqPlan(id); setReqChoice(null); setShowAutoPlans(false); setShowAutoReq(true);
      try {
        const stored = localStorage.getItem(AUTO_REF_LINK_KEY);
        const map = stored ? JSON.parse(stored) : {};
        if (!map[id]) {
          const code = `${(localStorage.getItem("tivexx-user")||"").toString().slice(-4)}-AUTO-${id}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
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
    if (id !== "free1h") {
      const exp = Date.now() + AUTO_PLAN_COOLDOWN_MS;
      const next = { ...autoPlanCooldowns, [id]: exp };
      setAutoPlanCooldowns(next);
      try { localStorage.setItem(AUTO_PLAN_COOLDOWN_KEY, JSON.stringify(next)); } catch {}
    }
    setShowAutoPlans(false); setShowAutoFreePopup(false);
  }, [autoFirstFreeUsed, autoPlanCooldowns]);

  const fulfillRequirement = useCallback(async () => {
    if (!reqPlan || !reqChoice) return;
    const plan = AUTO_PLANS.find(p=>p.id===reqPlan)!;
    if (reqChoice==="task") {
      const need = AUTO_REQ_TASK[reqPlan];
      const key = getPerPlanTaskKey(reqPlan);
      const completed = JSON.parse(localStorage.getItem(key)||"[]");
      const done = Array.isArray(completed) ? completed.length : 0;
      if (done < need) return;
    }
    if (reqChoice==="referral") {
      const need = AUTO_REQ_REF[reqPlan];
      const cntRaw = localStorage.getItem(`auto_ref_count_${reqPlan}`);
      const cnt = cntRaw ? Number(cntRaw) : 0;
      if (cnt < need) return;
    }
    if (reqChoice==="payment") {
      // Payment flow - redirect to payment page
      return;
    }
    setAutoPlan(reqPlan); setAutoExpiresAt(Date.now()+plan.durationMs); setAutoTapsDone(0); setAutoActive(true);
    if (reqPlan !== "free1h") {
      const exp = Date.now() + AUTO_PLAN_COOLDOWN_MS;
      const next = { ...autoPlanCooldowns, [reqPlan]: exp };
      setAutoPlanCooldowns(next);
      try { localStorage.setItem(AUTO_PLAN_COOLDOWN_KEY, JSON.stringify(next)); } catch {}
    }
    setShowAutoReq(false);
  }, [reqPlan, reqChoice, autoPlanCooldowns]);

  const energyPercent = (state.energy / MAX_ENERGY) * 100;

  if (!mounted) return null;

  return (
    <div className="te-root min-h-screen pb-28 relative overflow-hidden">
      {/* ── Animated background bubbles ── */}
      <div className="hh-bubbles-container" aria-hidden="true">
        {[...Array(12)].map((_, i) => (
          <div key={i} className={`hh-bubble hh-bubble-${i + 1}`}></div>
        ))}
      </div>

      {/* ── Mesh gradient overlay ── */}
      <div className="hh-mesh-overlay" aria-hidden="true"></div>

      {/* ── Decorative grid lines ── */}
      <div className="te-grid-lines" aria-hidden="true"></div>

      {/* ── Header ── */}
      <div className="sticky top-0 z-20 te-header">
        <div className="max-w-md mx-auto px-6 pt-8 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleNavigateBack}
              className="hh-back-btn"
              title="Go back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <h1 className="hh-title">Tap & Earn</h1>
              <p className="hh-subtitle flex items-center gap-1">
                <Sparkles className="w-3 h-3" />₦{EARN_PER_TAP.toLocaleString()}{" "}
                per tap
              </p>
            </div>
            {/* Live earned chip */}
            <div className="te-live-chip">
              <span className="te-live-dot"></span>
              <span>LIVE</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-md mx-auto px-4 relative z-10 space-y-5 pt-3">
        {/* ── Stats Row ── */}
        <div className="grid grid-cols-3 gap-3 hh-entry-1">
          {/* Earned */}
          <div className="hh-card te-stat-card te-stat-green">
            <div className="te-stat-icon-wrap te-icon-green">
              <CircleDollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="te-stat-value text-emerald-400">
              ₦{state.earned.toLocaleString()}
            </p>
            <p className="te-stat-label">Earned</p>
          </div>

          {/* Taps */}
          <div className="hh-card te-stat-card te-stat-amber">
            <div className="te-stat-icon-wrap te-icon-amber">
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <p className="te-stat-value text-amber-300">{tapCount}</p>
            <p className="te-stat-label">Taps</p>
          </div>

          {/* Per tap */}
          <div className="hh-card te-stat-card te-stat-violet">
            <div className="te-stat-icon-wrap te-icon-violet">
              <Crown className="w-4 h-4 text-violet-400" />
            </div>
            <p className="te-stat-value te-violet-text">₦{EARN_PER_TAP}</p>
            <p className="te-stat-label">Per Tap</p>
          </div>
        </div>

        {/* ── Orb Zone — matched to dashboard (small round orb, no gradual refill, not tappable till full) ── */}
        <div className="hh-entry-2 flex flex-col items-center py-4 hh-tap-earn-round-wrap !py-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="hh-tap-icon-sm"><HandCoins className="h-4 w-4 text-white" /></div>
            <span className="text-xs font-black tracking-widest text-white">TAP TO EARN</span>
            <span className="hh-tap-badge">₦{EARN_PER_TAP}/tap</span>
          </div>
          <div className="hh-orb-stage-sm">
            <div
              className={`te-halo ${state.energy > 0 && !autoActive && !showRapidTapWarning ? "te-halo-active" : "te-halo-inactive"}`}
              style={autoActive ? { animationPlayState: "paused" } : undefined}
            ></div>
            <div className="te-ring te-ring-outer" style={autoActive ? { animationPlayState: "paused" } : undefined}></div>
            <div className="te-ring te-ring-inner" style={autoActive ? { animationPlayState: "paused" } : undefined}></div>
            <button
              onClick={handleTap}
              disabled={autoActive || (tapExhaustUntil !== null && tapExhaustLeft > 0) || showRapidTapWarning || state.energy <= 0}
              className={`te-orb hh-orb-sm ${state.energy > 0 && !autoActive && !showRapidTapWarning ? "te-orb-active" : "te-orb-depleted"} ${tapping && !autoActive && !showRapidTapWarning ? "te-orb-tap" : ""} ${autoActive || showRapidTapWarning ? "te-orb-locked" : ""}`}
              title="Tap to earn coins"
            >
              {/* Glass shine */}
              <div className="te-orb-shine"></div>

              {/* Center icon */}
              <div className="te-orb-center">
                <div className="te-orb-icon-bounce">
                  <HandCoins
                    className="w-14 h-14 text-white"
                    strokeWidth={1.5}
                  />
                </div>
                <span className="te-tap-label">TAP</span>
              </div>

              {/* Orbiting stars */}
              {[0, 120, 240].map((deg) => (
                <div key={deg} className="te-orbit-star">
                  <Star
                    className="text-amber-400/50"
                    size={11}
                    fill="currentColor"
                    style={{
                      transform: `rotate(${deg}deg) translateX(88px) rotate(-${deg}deg)`,
                    }}
                  />
                </div>
              ))}

              {/* Tap particles */}
              {particles.map((p) => (
                <div
                  key={p.id}
                  className="te-particle"
                  style={{ left: `${p.x}px`, top: `${p.y}px` }}
                >
                  <span className="te-particle-reward">+₦{EARN_PER_TAP}</span>
                  <span className="te-particle-emoji">{p.emoji}</span>
                </div>
              ))}
              {/* Rapid tap warning — same as dashboard */}
              {showRapidTapWarning && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-auto z-10 rounded-full">
                  <div className="rounded-full bg-red-600/90 border-4 border-red-400 px-6 py-3 text-center animate-pulse" style={{ animationDuration: "2s", boxShadow: "0 0 40px rgba(239,68,68,0.6)" }}>
                    <div className="text-white font-black text-xl">⚠ TOO FAST</div>
                    <div className="text-white/80 text-xs mt-1">Slow down! Tap again in a moment</div>
                  </div>
                </div>
              )}
              {showRapidTapWarning && (
                <div className="absolute inset-0 z-[5] cursor-not-allowed" aria-hidden="true" onClick={(e) => e.preventDefault()} onTouchStart={(e) => e.preventDefault()} />
              )}
            </button>
            {tapExhaustUntil && tapExhaustLeft > 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="rounded-full bg-black/70 border border-amber-400/30 px-3 py-1.5 text-center">
                  <div className="text-amber-300 font-black text-[10px] flex items-center justify-center gap-1"><Clock className="h-3 w-3" /> {Math.floor(tapExhaustLeft/60000)}:{String(Math.floor((tapExhaustLeft%60000)/1000)).padStart(2,"0")}</div>
                </div>
              </div>
            )}
          </div>

          {/* Hint label — not refillable until 10-min countdown */}
          <p className="te-tap-hint mt-3">
            {autoActive
              ? "Auto tapping — balance rising"
              : tapExhaustUntil && tapExhaustLeft > 0
                ? `Exhausted 100/100 — wait ${Math.floor(tapExhaustLeft/60000)}:${String(Math.floor((tapExhaustLeft%60000)/1000)).padStart(2,"0")} to recharge`
                : state.energy > 0
                  ? `${state.energy} taps remaining • not refilling until exhausted`
                  : "Energy depleted — wait 10 mins to recharge"}
          </p>

          {/* Auto tap toggle + status */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${autoActive ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-white/10 text-white/60 border-white/10"}`}>{autoActive ? "ON" : "OFF"}</span>
            <span className="text-[11px] font-black tracking-widest text-white/80">AUTO TAP</span>
            <button type="button" onClick={handleAutoToggle} className={`hh-toggle ${autoActive ? 'hh-toggle-active' : ''}`} aria-label="Toggle auto tap">
              <span className={`hh-toggle-dot ${autoActive ? 'hh-toggle-dot-active' : ''}`} />
            </button>
          </div>
          {autoActive ? (
            <div className="flex items-center gap-2 mt-2">
              <div className="hh-progress-track flex-1 !w-auto !h-2"><div className="hh-progress-fill" style={{ width: `${Math.min(100,(autoTapsDone/(AUTO_PLANS.find(p=>p.id===autoPlan)?.maxTaps||1))*100)}%` }}></div></div>
              <span className="text-[11px] font-mono font-bold whitespace-nowrap text-emerald-300"><Zap className="inline h-3 w-3 -mt-0.5"/>{state.energy}/{AUTO_PLANS.find(p=>p.id===autoPlan)?.maxTaps}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-2">
              <div className="hh-progress-track flex-1 !w-auto !h-2"><div className="hh-progress-fill" style={{ width: `${(state.energy/MAX_ENERGY)*100}%` }}></div></div>
              <span className={`text-[11px] font-mono font-bold whitespace-nowrap ${state.energy<20 ? 'text-amber-300' : 'text-white/80'}`}><Zap className="inline h-3 w-3 -mt-0.5"/>{state.energy}/{MAX_ENERGY}</span>
            </div>
          )}
        </div>

        {/* ── Energy Card ── */}
        <div className="hh-card hh-entry-3 relative overflow-hidden">
          {/* Subtle orb behind card */}
          <div className="hh-orb hh-orb-1" aria-hidden="true"></div>

          <div className="relative z-10 space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="hh-icon-ring">
                  <Zap className="w-4 h-4 text-amber-300" fill="currentColor" />
                </div>
                <span className="text-sm font-bold text-white">
                  Energy Level
                </span>
              </div>
              <div className="te-energy-counter">
                <span
                  className={
                    state.energy <= 10
                      ? "text-red-400"
                      : state.energy <= 30
                        ? "text-amber-400"
                        : "text-emerald-400"
                  }
                >
                  {state.energy}
                </span>
                <span className="text-white/40"> / {MAX_ENERGY}</span>
              </div>
            </div>

            {/* Progress track */}
            <div className="hh-progress-track te-energy-track">
              <div
                className="hh-progress-fill te-energy-fill"
                style={{
                  width: `${energyPercent}%`,
                  background:
                    energyPercent > 30
                      ? "linear-gradient(90deg, #10b981, #34d399)"
                      : energyPercent > 10
                        ? "linear-gradient(90deg, #fbbf24, #f59e0b)"
                        : "linear-gradient(90deg, #ef4444, #dc2626)",
                  boxShadow:
                    energyPercent > 30
                      ? "0 0 12px rgba(16,185,129,0.6)"
                      : energyPercent > 10
                        ? "0 0 12px rgba(245,158,11,0.6)"
                        : "0 0 12px rgba(239,68,68,0.6)",
                }}
              />
              {/* Tick markers */}
              {[25, 50, 75].map((t) => (
                <div
                  key={t}
                  className="te-tick"
                  style={{ left: `${t}%` }}
                ></div>
              ))}
            </div>

            {/* Footer row */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/50 font-semibold">
                Rate:{" "}
                <span className="text-emerald-400 font-black">
                  ₦{EARN_PER_TAP.toLocaleString()}
                </span>{" "}
                / tap
              </p>
              {state.energy < MAX_ENERGY && (
                <span className="te-recharge-badge">
                  <Sparkles className="w-3 h-3" />
                  Recharging…
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Tips card ── */}
        <div className="hh-card hh-tip-card hh-entry-4">
          <div className="flex items-start gap-3">
            <div className="hh-tip-icon">
              <Sparkles className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">Pro Tips</h4>
              <p className="text-sm text-emerald-200/80">
                Tap rapidly to maximise your session. Energy recharges over time
                — check back every hour for a full bar.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Energy Depleted Modal (fixed fullscreen flex overlay) ── */}
      {showPrompt && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 te-fadeIn flex items-center justify-center p-4"
          onClick={() => setShowPrompt(false)}
        >
          {/* Modal container – centered by parent flex layout */}
          <div
            className="te-slideUp w-full max-w-[420px] h-auto max-h-[85vh] overflow-auto z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="hh-modal">
              {/* Glow accent */}
              <div className="te-modal-glow"></div>

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="hh-icon-ring">
                    <Zap
                      className="w-4 h-4 text-amber-300"
                      fill="currentColor"
                    />
                  </div>
                  <h2 className="hh-modal-title text-lg">Energy Depleted!</h2>
                </div>

                <p className="hh-modal-desc mb-5">
                  You've used all your taps. Complete tasks to earn more rewards
                  or wait for energy to recharge automatically.
                </p>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={async () => {
                      setShowPrompt(false);
                      await pressEarningsToDb();
                      router.push("/task");
                    }}
                    className="te-modal-primary-btn"
                    title="Complete tasks to earn more energy"
                  >
                    <Star className="w-4 h-4" />
                    Complete Tasks
                  </button>
                  <button
                    onClick={() => setShowPrompt(false)}
                    className="te-modal-secondary-btn"
                    title="Close this dialog"
                  >
                    Come Back Later
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Task Completion Required Modal ── */}
      {showTaskPopup && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 te-fadeIn flex items-center justify-center p-4"
          onClick={() => setShowTaskPopup(false)}
        >
          <div
            className="te-slideUp w-full max-w-[420px] h-auto max-h-[85vh] overflow-auto z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="hh-modal">
              <div className="te-modal-glow"></div>

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="hh-icon-ring">
                    <Star
                      className="w-4 h-4 text-emerald-300"
                      fill="currentColor"
                    />
                  </div>
                  <h2 className="hh-modal-title text-lg">Complete Tasks First!</h2>
                </div>

                <p className="hh-modal-desc mb-4">
                  You need to complete all tasks before you can start tapping to earn rewards.
                </p>

                {/* Progress Bar */}
                <div className="mb-5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-300">Progress</span>
                    <span className="text-sm text-emerald-400 font-medium">
                      {completedTasksCount}/10 tasks
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(completedTasksCount / 10) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setShowTaskPopup(false);
                      router.push("/task");
                    }}
                    className="te-modal-primary-btn"
                    title="Go to tasks page"
                  >
                    <Star className="w-4 h-4" />
                    Go to Tasks
                  </button>
                  <button
                    onClick={() => setShowTaskPopup(false)}
                    className="te-modal-secondary-btn"
                    title="Close this dialog"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Global styles ── */}
      {/* ── AUTO TAP: Eligible popup (20 mins free) ── */}
      {showAutoFreePopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4" onClick={() => setShowAutoFreePopup(false)}>
          <div className="te-slideUp w-full max-w-[420px]" onClick={(e) => e.stopPropagation()}>
            <div className="hh-modal">
              <div className="te-modal-glow"></div>
              <div className="relative z-10 text-center">
                <h2 className="text-xl font-black text-white mb-2">🎉 You are eligible!</h2>
                <p className="text-gray-300 mb-4">You have 20 minutes of FREE auto tap. Your balance will increase automatically without tapping.</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowAutoFreePopup(false)} className="flex-1 rounded-full border border-white/15 text-white py-2">Later</button>
                  <button onClick={() => { setShowAutoFreePopup(false); startAutoPlan("free1h"); }} className="flex-1 hh-btn-primary rounded-full py-2">Start FREE 20 mins</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── AUTO TAP: Plan selector ── */}
      {showAutoPlans && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4" onClick={() => setShowAutoPlans(false)}>
          <div className="te-slideUp w-full max-w-[420px] max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="hh-modal">
              <div className="te-modal-glow"></div>
              <div className="relative z-10">
                <h2 className="text-lg font-black text-white text-center mb-1">Choose Auto Tap Plan</h2>
                <p className="text-xs text-gray-400 text-center mb-3">Only first-time users get 20 mins FREE. After that it is crossed out.</p>
                <div className="space-y-3">
                  {AUTO_PLANS.map((p, idx) => {
                    const isFree = p.id === "free1h";
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
                        <button disabled={disabled} onClick={() => startAutoPlan(p.id)} className={`flex-1 text-left relative rounded-2xl border p-3 flex items-center justify-between ${disabled ? "bg-white/5 border-white/10 opacity-50" : "bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border-emerald-500/30 hover:border-emerald-400/50"}`}>
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
          </div>
        </div>
      )}

      {/* ── AUTO TAP: Requirement chooser for paid plans ── */}
      {showAutoReq && reqPlan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4" onClick={() => setShowAutoReq(false)}>
          <div className="te-slideUp w-full max-w-[420px] max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="hh-modal">
              <div className="te-modal-glow"></div>
              <div className="relative z-10">
                <h2 className="text-lg font-black text-white text-center mb-1">Requirement for {AUTO_PLANS.find(p=>p.id===reqPlan)?.label}</h2>
                <p className="text-xs text-gray-400 text-center mb-3">Choose one of 3 options. Referrals use a new tracking link and count to your total.</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white/70 w-5 text-center shrink-0">a</span>
                    <button onClick={() => { setReqChoice("task"); const need=AUTO_REQ_TASK[reqPlan]; const path=(reqPlan==="24h"||reqPlan==="3d")?`/mt-tasks?need=${need}&plan=${reqPlan}`:`/mu-tasks?need=${need}&plan=${reqPlan}`; router.push(path); }} className={`flex-1 text-left rounded-2xl border p-3 flex items-center justify-between ${reqChoice==="task" ? "border-emerald-400 bg-emerald-500/15" : "border-white/10 bg-white/5"}`}>
                      <div>
                        <div className="text-sm font-black text-white">{AUTO_REQ_TASK[reqPlan]} tasks required</div>
                        <div className="text-xs text-white/70 mt-1">you've only done {getPerPlanDone(reqPlan)}/{AUTO_REQ_TASK[reqPlan]} — this plan counts separately from others</div>
                        <div className="mt-1 text-xs text-white/50">Open {(reqPlan==="24h"||reqPlan==="3d")?"MT":"MU"} Tasks ({AUTO_REQ_TASK[reqPlan]})</div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500 text-white ml-2 shrink-0">Start</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white/70 w-5 text-center shrink-0">b</span>
                    <button onClick={() => { setReqChoice("referral"); router.push(`/refer/auto-tap?plan=${reqPlan}`); setShowAutoReq(false); }} className={`flex-1 text-left rounded-2xl border p-3 flex items-center justify-between ${reqChoice==="referral" ? "border-emerald-400 bg-emerald-500/15" : "border-white/10 bg-white/5"}`}>
                      <div>
                        <div className="text-sm font-black text-white">Referral — {AUTO_REQ_REF[reqPlan]} referrals</div>
                        <div className="text-xs text-white/60 mt-1">New tracking link will be generated for this plan.</div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500 text-white ml-2 shrink-0">Start</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white/70 w-5 text-center shrink-0">c</span>
                    <button onClick={() => setReqChoice("payment")} className={`flex-1 text-left rounded-2xl border p-3 flex items-center justify-between ${reqChoice==="payment" ? "border-emerald-400 bg-emerald-500/15" : "border-white/10 bg-white/5"}`}>
                      <div>
                        <div className="text-sm font-black text-white">Pay ₦{AUTO_REQ_PAY[reqPlan].toLocaleString()} for {AUTO_PLANS.find(p=>p.id===reqPlan)?.maxEarn.toLocaleString()} estimated taps</div>
                        <div className="text-xs text-white/60 mt-1">One-time payment to unlock auto tap for this plan.</div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500 text-white ml-2 shrink-0">Start</span>
                    </button>
                  </div>
                  <button onClick={fulfillRequirement} disabled={!reqChoice} className="w-full hh-btn-primary rounded-full font-black py-2">Unlock & Start Auto Tap</button>
                  <button onClick={() => setShowAutoReq(false)} className="w-full rounded-full border border-white/15 text-white py-2">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap");

        /* ─── ROOT ─── */
        .te-root {
          font-family: "Syne", sans-serif;
          background: #050d14;
          color: white;
        }

        /* ─── GRID LINES DECORATION ─── */
        .te-grid-lines {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background-image:
            linear-gradient(rgba(16, 185, 129, 0.025) 1px, transparent 1px),
            linear-gradient(
              90deg,
              rgba(16, 185, 129, 0.025) 1px,
              transparent 1px
            );
          background-size: 48px 48px;
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
            rgba(245, 158, 11, 0.4),
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
            rgba(245, 158, 11, 0.3),
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

        /* ─── HEADER ─── */
        .te-header {
          background: linear-gradient(
            180deg,
            rgba(5, 13, 20, 0.95) 0%,
            rgba(5, 13, 20, 0.8) 100%
          );
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(16, 185, 129, 0.15);
        }

        .te-live-chip {
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 20px;
          padding: 4px 10px;
          font-size: 10px;
          font-weight: 800;
          color: #34d399;
          letter-spacing: 0.08em;
        }

        .te-live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 6px #10b981;
          animation: te-pulse-dot 1.4s ease-in-out infinite;
        }

        @keyframes te-pulse-dot {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.7);
          }
        }

        /* ─── SHARED BACK BUTTON & TITLES ─── */
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
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
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
          font-weight: 600;
        }

        /* ─── STAT CARDS ─── */
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
        .hh-card:hover {
          transform: translateY(-2px);
          box-shadow:
            0 20px 60px rgba(0, 0, 0, 0.4),
            0 0 30px rgba(16, 185, 129, 0.05);
        }

        .te-stat-card {
          padding: 16px 12px;
          text-align: center;
        }

        .te-stat-green {
          border-color: rgba(16, 185, 129, 0.2);
          background: linear-gradient(
            135deg,
            rgba(16, 185, 129, 0.12),
            rgba(16, 185, 129, 0.04)
          );
        }
        .te-stat-amber {
          border-color: rgba(245, 158, 11, 0.2);
          background: linear-gradient(
            135deg,
            rgba(245, 158, 11, 0.12),
            rgba(245, 158, 11, 0.04)
          );
        }
        .te-stat-violet {
          border-color: rgba(139, 92, 246, 0.2);
          background: linear-gradient(
            135deg,
            rgba(139, 92, 246, 0.12),
            rgba(139, 92, 246, 0.04)
          );
        }

        .te-stat-icon-wrap {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 8px;
        }
        .te-icon-green {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.25);
        }
        .te-icon-amber {
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.25);
        }
        .te-icon-violet {
          background: rgba(139, 92, 246, 0.15);
          border: 1px solid rgba(139, 92, 246, 0.25);
        }

        .te-stat-value {
          font-size: 16px;
          font-weight: 900;
          line-height: 1.1;
          margin-bottom: 4px;
        }
        .te-violet-text {
          color: #a78bfa;
        }
        .te-stat-label {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(255, 255, 255, 0.35);
        }

        /* ─── ORB STAGE ─── */
        .te-orb-stage {
          position: relative;
          width: 256px;
          height: 256px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Pulsing halo */
        .te-halo {
          position: absolute;
          inset: -28px;
          border-radius: 50%;
          animation: te-halo-pulse 2.4s ease-in-out infinite;
        }
        .te-halo-active {
          background: radial-gradient(
            circle,
            rgba(16, 185, 129, 0.18) 0%,
            transparent 70%
          );
        }
        .te-halo-inactive {
          background: radial-gradient(
            circle,
            rgba(107, 114, 128, 0.1) 0%,
            transparent 70%
          );
          animation: none;
        }

        @keyframes te-halo-pulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.4;
          }
        }

        /* Dashed rings */
        .te-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
        }
        .te-ring-outer {
          inset: -38px;
          border: 2px dashed rgba(16, 185, 129, 0.18);
          animation: te-spin 22s linear infinite;
        }
        .te-ring-inner {
          inset: -22px;
          border: 1px solid rgba(16, 185, 129, 0.12);
          animation: te-spin 16s linear infinite reverse;
        }

        @keyframes te-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        /* The orb itself */
        .te-orb {
          position: relative;
          width: 220px;
          height: 220px;
          border-radius: 50%;
          border: none;
          outline: none;
          cursor: pointer;
          transition: transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1);
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }

        .te-orb-active {
          background: radial-gradient(
            circle at 38% 32%,
            rgba(52, 211, 153, 0.95),
            #10b981 48%,
            rgba(6, 95, 70, 0.9) 100%
          );
          box-shadow:
            inset 0 -12px 28px rgba(6, 95, 70, 0.7),
            inset 0 6px 22px rgba(52, 211, 153, 0.35),
            0 0 60px rgba(16, 185, 129, 0.45),
            0 0 120px rgba(16, 185, 129, 0.15);
        }

        .te-orb-depleted {
          background: radial-gradient(
            circle at 38% 32%,
            rgba(107, 114, 128, 0.6),
            rgba(55, 65, 81, 0.8) 100%
          );
          box-shadow: inset 0 -8px 20px rgba(0, 0, 0, 0.5);
          opacity: 0.55;
          cursor: not-allowed;
        }

        .te-orb-tap {
          transform: scale(0.86) !important;
        }

        .te-orb-active:hover {
          box-shadow:
            inset 0 -12px 28px rgba(6, 95, 70, 0.7),
            inset 0 6px 22px rgba(52, 211, 153, 0.35),
            0 0 80px rgba(16, 185, 129, 0.6),
            0 0 140px rgba(16, 185, 129, 0.2);
        }

        /* Glass shine on the orb */
        .te-orb-shine {
          position: absolute;
          top: 18px;
          left: 36px;
          width: 80px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.7),
            transparent
          );
          filter: blur(10px);
          opacity: 0.25;
          pointer-events: none;
        }

        /* Orb center content */
        .te-orb-center {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .te-orb-icon-bounce {
          animation: te-icon-bounce 1.6s ease-in-out infinite;
        }

        @keyframes te-icon-bounce {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }

        .te-tap-label {
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.22em;
          color: rgba(255, 255, 255, 0.65);
          animation: te-label-pulse 2s ease-in-out infinite;
        }

        @keyframes te-label-pulse {
          0%,
          100% {
            opacity: 0.65;
          }
          50% {
            opacity: 1;
          }
        }

        /* Orbiting stars */
        .te-orbit-star {
          position: absolute;
          top: 50%;
          left: 50%;
          animation: te-spin 8s linear infinite;
        }

        /* Tap particles */
        .te-particle {
          position: absolute;
          pointer-events: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          animation: te-particle-rise 0.85s ease-out forwards;
        }
        .te-particle-reward {
          font-family: "JetBrains Mono", monospace;
          font-size: 16px;
          font-weight: 700;
          color: #34d399;
          text-shadow: 0 0 10px rgba(52, 211, 153, 0.8);
        }
        .te-particle-emoji {
          font-size: 18px;
        }

        @keyframes te-particle-rise {
          0% {
            opacity: 1;
            transform: translateY(0) scale(0.6);
          }
          100% {
            opacity: 0;
            transform: translateY(-65px) scale(1.3);
          }
        }

        /* Tap hint */
        .te-tap-hint {
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.35);
          text-align: center;
          letter-spacing: 0.02em;
        }

        /* ─── ENERGY CARD ─── */
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

        .te-energy-counter {
          font-family: "JetBrains Mono", monospace;
          font-size: 18px;
          font-weight: 700;
        }

        .hh-progress-track {
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          overflow: visible;
          position: relative;
        }

        .te-energy-track {
          height: 10px;
        }

        .hh-progress-fill {
          height: 100%;
          border-radius: 10px;
          transition:
            width 0.4s ease,
            background 0.4s ease;
        }

        /* Tick marks on progress bar */
        .te-tick {
          position: absolute;
          top: -2px;
          width: 1px;
          height: calc(100% + 4px);
          background: rgba(255, 255, 255, 0.12);
          transform: translateX(-50%);
        }

        .te-recharge-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.25);
          border-radius: 20px;
          padding: 3px 9px;
          font-size: 11px;
          font-weight: 700;
          color: #fbbf24;
        }
        .hh-tap-earn-round-wrap { background: linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,13,20,0.5) 50%, rgba(245,158,11,0.08) 100%); border: 1px solid rgba(16,185,129,0.22); border-radius: 16px; padding: 9px 11px; }
        .hh-tap-icon-sm { width: 28px; height: 28px; border-radius: 8px; background: linear-gradient(135deg, #10b981, #3b82f6); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(16,185,129,0.25); flex-shrink: 0; }
        .hh-tap-badge { font-size: 9px; font-weight: 900; letter-spacing: 0.08em; background: rgba(16,185,129,0.18); color: #34d399; border: 1px solid rgba(16,185,129,0.3); border-radius: 20px; padding: 2px 6px; }
        .hh-orb-stage-sm { position: relative; width: 135px; height: 135px; display: flex; align-items: center; justify-content: center; margin: 2px 0; }
        .hh-orb-stage-sm .te-halo { inset: -18px; }
        .hh-orb-stage-sm .te-ring-outer { inset: -22px; }
        .hh-orb-stage-sm .te-ring-inner { inset: -12px; }
        .hh-orb-sm { width: 118px !important; height: 118px !important; }
        .te-orb-locked { cursor: not-allowed; filter: brightness(0.85); }
        .hh-toggle { position: relative; width: 52px; height: 28px; border-radius: 30px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.1); cursor: pointer; transition: all 0.3s ease; flex-shrink: 0; }
        .hh-toggle-active { background: linear-gradient(135deg, #10b981, #059669); border-color: rgba(16,185,129,0.3); }
        .hh-toggle-dot { position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: white; transition: transform 0.3s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        .hh-toggle-dot-active { transform: translateX(24px); }

        /* ─── ORB EFFECTS ─── */
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

        /* ─── TIP CARD ─── */
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

        /* ─── MODAL ─── */
        .hh-modal {
          background: linear-gradient(
            135deg,
            rgba(5, 13, 20, 0.98),
            rgba(7, 18, 30, 0.96)
          );
          border: 1px solid rgba(245, 158, 11, 0.25);
          border-radius: 20px;
          padding: 24px;
          backdrop-filter: blur(20px);
          box-shadow:
            0 30px 80px rgba(0, 0, 0, 0.6),
            0 0 40px rgba(245, 158, 11, 0.08);
          position: relative;
          overflow: hidden;
        }
        .hh-modal::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(245, 158, 11, 0.3),
            transparent
          );
        }
        .te-modal-glow {
          position: absolute;
          width: 180px;
          height: 180px;
          background: radial-gradient(
            circle,
            rgba(245, 158, 11, 0.12),
            transparent
          );
          top: -60px;
          right: -40px;
          filter: blur(30px);
          pointer-events: none;
        }
        .hh-modal-title {
          font-weight: 800;
          color: white;
          line-height: 1.2;
        }
        .hh-modal-desc {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.75);
          line-height: 1.5;
        }

        .te-modal-primary-btn {
          width: 100%;
          padding: 14px;
          border-radius: 14px;
          font-weight: 800;
          font-size: 14px;
          letter-spacing: 0.02em;
          border: none;
          cursor: pointer;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
        }
        .te-modal-primary-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.45);
        }
        .te-modal-primary-btn:active {
          transform: scale(0.97);
        }

        .te-modal-secondary-btn {
          width: 100%;
          padding: 14px;
          border-radius: 14px;
          font-weight: 700;
          font-size: 14px;
          background: transparent;
          border: 1.5px solid rgba(16, 185, 129, 0.3);
          color: #6ee7b7;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .te-modal-secondary-btn:hover {
          background: rgba(16, 185, 129, 0.08);
        }

        /* ─── ENTRY ANIMATIONS ─── */
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

        .te-fadeIn {
          animation: hh-entry 0.3s ease-out both;
        }
        .te-slideUp {
          animation: hh-entry 0.35s cubic-bezier(0.34, 1.3, 0.64, 1) both;
        }

        /* ─── REDUCED MOTION ─── */
        @media (prefers-reduced-motion: reduce) {
          .hh-bubble,
          .hh-orb-1,
          .te-ring-outer,
          .te-ring-inner,
          .te-halo,
          .te-orb-icon-bounce,
          .te-tap-label,
          .te-live-dot,
          [class*="hh-entry-"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

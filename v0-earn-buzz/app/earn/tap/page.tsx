"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Zap,
  HandCoins,
  Sparkles,
  TrendingUp,
  Crown,
  Star,
  CircleDollarSign,
} from "lucide-react";

const MAX_ENERGY = 100;
const EARN_PER_TAP = 100;
const ENERGY_REGEN_MS = 60000;
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
    const elapsed = Date.now() - (s.lastTime || Date.now());
    const regen = Math.floor(elapsed / ENERGY_REGEN_MS);
    const energy = Math.min(MAX_ENERGY, (s.energy || 0) + regen);

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
  const [mounted, setMounted] = useState(false);

  // ─── Monetag ad script (standard placement) ────────────────────────────
  useEffect(() => {
    // Prevent duplicate injection
    if (document.querySelector('script[src*="5gvci.com"]')) return;

    const script = document.createElement("script");
    script.src = "https://5gvci.com/act/files/tag.min.js?z=10297783";
    script.setAttribute("data-cfasync", "false");
    script.async = true;
    document.body.appendChild(script);
  }, []);
  // ───────────────────────────────────────────────────────────────────────

  // ─── LLVPN ad script ───────────────────────────────────────────────────
  useEffect(() => {
    // Prevent duplicate injection
    // if (document.querySelector('script[src*="llvpn.com"]')) return;

    const script = document.createElement("script");
    script.src = "https://llvpn.com/tag.min.js";
    script.setAttribute("data-zone", "10297781");
    script.async = true;
    document.body.appendChild(script);
  }, []);
  // ───────────────────────────────────────────────────────────────────────

  useEffect(() => {
    setMounted(true);
    setState(loadState());
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...state, lastTime: Date.now() }),
    );
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

  useEffect(() => {
    const interval = setInterval(() => {
      setState((prev) => {
        if (prev.energy >= MAX_ENERGY) return prev;
        return { ...prev, energy: Math.min(MAX_ENERGY, prev.energy + 1) };
      });
    }, ENERGY_REGEN_MS);
    return () => clearInterval(interval);
  }, []);

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

        if (syncTimeout.current) {
          clearTimeout(syncTimeout.current);
        }

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
      if (state.energy <= 0) {
        setShowPrompt(true);
        return;
      }

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
    [state.energy, syncToDb],
  );

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

        {/* ── Orb Zone ── */}
        <div className="hh-entry-2 flex flex-col items-center py-6">
          {/* Outer glow ring */}
          <div className="te-orb-stage">
            {/* Pulsing halo */}
            <div
              className={`te-halo ${state.energy > 0 ? "te-halo-active" : "te-halo-inactive"}`}
            ></div>

            {/* Rotating rings */}
            <div className="te-ring te-ring-outer"></div>
            <div className="te-ring te-ring-inner"></div>

            {/* The main tap button */}
            <button
              onClick={handleTap}
              className={`te-orb ${state.energy > 0 ? "te-orb-active" : "te-orb-depleted"} ${tapping ? "te-orb-tap" : ""}`}
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
            </button>
          </div>

          {/* Hint label */}
          <p className="te-tap-hint mt-5">
            {state.energy > 0
              ? `${state.energy} taps remaining`
              : "Energy depleted — wait or complete tasks"}
          </p>
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

      {/* ── Global styles ── */}
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

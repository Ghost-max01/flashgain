"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft as ArrowLeftIcon } from "lucide-react";
import {
  Award,
  Star,
  Flame,
  ShieldCheck,
  Trophy,
  Crown,
  Clock,
  Users,
  Gift,
  Zap,
  TrendingUp,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  loadMeta,
  computeScore,
  getLevel,
  getProgress,
  getNextLabel,
  getEarnPerTap,
  TRUST_LEVELS,
  TRUST_META_KEY,
} from "@/lib/trust-score";
import { BottomNav } from "@/components/bottom-nav";

export default function TrustScorePage() {
  const [trustScore, setTrustScore] = useState(0);
  const [trustMeta, setTrustMeta] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const refresh = () => {
      try {
        const meta = loadMeta();
        const score = computeScore(meta);
        setTrustScore(score);
        setTrustMeta(meta);
      } catch (e) {
        console.error("Failed to load trust meta:", e);
        setTrustScore(0);
        setTrustMeta(null);
      }
    };
    refresh();
    const interval = setInterval(refresh, 30000);
    // Also listen for storage changes from other tabs
    const handleStorage = () => refresh();
    window.addEventListener("storage", handleStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const timePts = Math.floor((trustMeta?.timeMs || 0) / (5 * 60 * 1000)) * 2;
  const refPts = Math.floor((trustMeta?.referralCount || 0) / 5) * 2;
  const navPts = Math.floor((trustMeta?.navCount || 0) / 5);
  const payPts = (trustMeta?.payCount || 0) * 5;
  const taskPts = Math.floor((trustMeta?.taskCount || 0) / 10) * 2;
  const tapPts = Math.floor((trustMeta?.tapCount || 0) / 50) * 1;

  const rows = [
    { label: "Time in app (5m = +2)", value: `${Math.floor((trustMeta?.timeMs || 0) / 60000)}m`, pts: timePts, icon: Clock, color: "text-emerald-400" },
    { label: "Referrals (5 = +2)", value: `${trustMeta?.referralCount || 0}`, pts: refPts, icon: Users, color: "text-violet-400" },
    { label: "Tasks done (10 = +2)", value: `${trustMeta?.taskCount || 0}`, pts: taskPts, icon: Gift, color: "text-emerald-300" },
    { label: "Dashboard taps (50 = +1)", value: `${trustMeta?.tapCount || 0}`, pts: tapPts, icon: Zap, color: "text-cyan-400" },
    { label: "App navigations (5 = +1)", value: `${trustMeta?.navCount || 0}`, pts: navPts, icon: TrendingUp, color: "text-amber-400" },
    { label: "Payments into app (+5 each)", value: `${trustMeta?.payCount || 0}`, pts: payPts, icon: CreditCard, color: "text-blue-400" },
  ];

  const level = getLevel(trustScore);
  const progress = getProgress(trustScore);
  const next = getNextLabel(trustScore);

  return (
    <div className="hh-root min-h-screen flex flex-col">
      {/* Header */}
      <div className="hh-header flex items-center justify-between px-6 pt-8 pb-4">
        <Link href="/dashboard">
          <button className="hh-back-btn">
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
        </Link>
        <div>
          <h1 className="hh-title">Trust Score</h1>
          <p className="hh-subtitle">Your compounding reputation</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-emerald-400">
            {trustScore}
          </span>
          <Award className="h-5 w-5 text-emerald-400" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 space-y-6 pb-12">
        {/* Score Card */}
        <div className="hh-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-white/60 uppercase tracking-wider font-bold">
                Trust Score
              </div>
              <div className="text-4xl font-black text-white">{trustScore}</div>
              <div className="text-xs font-bold" style={{ color: level.color }}>
                {level.label} • {progress}%
              </div>
            </div>
            <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center">
              <span className="text-3xl font-black" style={{ color: level.color }}>
                {trustScore}
              </span>
            </div>
          </div>
          <div className="w-full h-2 rounded-xl bg-white/5 mt-3">
            <div className="h-full rounded-xl bg-gradient-to-r from-emerald-400 to-green-600" style={{ width: `${progress}%` }}></div>
          </div>
          {next && (
            <div className="mt-2 text-xs text-white/60 flex justify-between">
              <span>{next.need} more to reach <span className="font-bold">{next.label}</span></span>
              <span className="font-semibold text-white">{next.label}</span>
            </div>
          )}
          {!next && (
            <div className="mt-2 text-xs text-green-400 font-bold">
              Elite — max level unlocked 🎉
            </div>
          )}
        </div>

        {/* Breakdown */}
        <div className="hh-card">
          <div className="font-bold text-white mb-4">How Your Score Compounds</div>
          <div className="space-y-3">
            {rows.map((r, idx) => (
              <div key={r.label} className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center ${r.color}`}>
                    {r.icon && <r.icon className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{r.label}</div>
                    <div className="text-[11px] text-white/50">{r.value} → +{r.pts}</div>
                  </div>
                </div>
                <span className="text-sm font-black text-white">+{r.pts}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-xs text-amber-200 leading-relaxed">
            💡 Tip: Stay 5 mins, do tasks (10=+2), invite 5 friends (=+2), tap 50× (=+1), explore, and fund once — you instantly jump to <b>Trusted</b>. Everything compounds.
          </div>
        </div>

         {/* Your Rank */}
         <div className="hh-card">
           <div className="font-bold text-white mb-4">YOUR RANK</div>
           {(() => {
             const refCount = 0;
             const levels = [
               { label: "Free", min: 0, color: "#64748b", Icon: Star },
               { label: "Beginner", min: 5, color: "#10b981", Icon: Flame },
               { label: "Trusted", min: 10, color: "#059669", Icon: ShieldCheck },
               { label: "Verified", min: 20, color: "#7c3aed", Icon: Trophy },
               { label: "Elite", min: 50, color: "#f59e0b", Icon: Crown },
             ];
             let currentLevel = levels[0];
             let currentIdx = 0;
             try {
               const meta = loadMeta();
               const score = computeScore(meta);
               const lvl = getLevel(score);
               const idx = levels.findIndex(l => l.label === lvl.label);
               if (idx !== -1) { currentIdx = idx; currentLevel = levels[idx]; }
             } catch {}
             const CurrentIcon = levels[currentIdx]?.Icon || Star;
             const nextLevel = currentIdx < levels.length - 1 ? levels[currentIdx + 1] : null;
             const progress = (() => {
               try {
                 const meta = loadMeta();
                 const score = computeScore(meta);
                 return getProgress(score);
               } catch { return 0; }
             })();
             return (
               <>
                 <div className="hh-rank2-top">
                   <div className="hh-rank2-badge" style={{ background: `${levels[currentIdx]?.color}26`, borderColor: `${levels[currentIdx]?.color}55` }}>
                     <CurrentIcon className="h-7 w-7" style={{ color: levels[currentIdx]?.color }} />
                   </div>
                   <div className="hh-rank2-head">
                     <div className="hh-rank2-name">{levels[currentIdx]?.label} Rank</div>
                     <div className="hh-rank2-sub">₦500/ref • Trust {(() => { try { return computeScore(loadMeta()); } catch { return 0; } })()}</div>
                   </div>
                   <div className="hh-rank2-count">{refCount} referrals</div>
                 </div>
                 <div className="hh-rank2-bar">
                   <div className="hh-rank2-fill" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${levels[currentIdx]?.color}, ${nextLevel?.color || levels[currentIdx]?.color})` }} />
                 </div>
                 <div className="hh-rank2-meta">
                   <span>{refCount} referrals</span>
                   {nextLevel ? (
                     <span className="hh-rank2-need">{nextLevel.min - (currentLevel as any).min} needed for {nextLevel.label}</span>
                   ) : (
                     <span className="hh-rank2-need">Max rank reached 🎉</span>
                   )}
                 </div>
                 <div className="hh-rank2-levels">
                   {levels.map((l, i) => {
                     const active = i === currentIdx;
                     const done = i < currentIdx;
                     return (
                       <div key={l.label} className={`hh-rank2-lvl ${active ? "hh-rank2-lvl-active" : ""}`} style={active ? { borderColor: `${l.color}88`, boxShadow: `0 0 0 1px ${l.color}44, 0 8px 22px ${l.color}22` } : undefined}>
                         <div className="hh-rank2-lvl-ico" style={{ background: `${l.color}${active || done ? "2e" : "14"}`, opacity: active || done ? 1 : 0.45 }}>
                           <l.Icon className="h-5 w-5" style={{ color: l.color }} />
                         </div>
                         <span className="hh-rank2-lvl-label" style={{ opacity: active || done ? 1 : 0.45 }}>{l.label}</span>
                       </div>
                     );
                   })}
                 </div>
               </>
             );
           })()}
         </div>

         {/* Actions */}
        <div className="hh-card">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-white">Quick Actions</div>
            <Button variant="outline" onClick={() => {
              // Refresh trust score manually
              const meta = loadMeta();
              const score = computeScore(meta);
              setTrustScore(score);
              setTrustMeta(meta);
              // Simple toast would need useToast hook; for now just visual feedback
            }} className="px-4 py-2">
              Refresh
            </Button>
          </div>
          <div className="mt-4 space-x-3">
            <Link href="/refer" className="flex-1 hh-btn-primary rounded-full">
              Invite Friends → Boost Trust
            </Link>
            <Link href="/task" className="flex-1 hh-btn-secondary rounded-full border-white/15 text-white">
              Complete Tasks → Earn Points
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}


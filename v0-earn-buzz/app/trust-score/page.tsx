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
  computeBreakdown,
  computeScore,
  getLevel,
  getProgress,
  getNextLabel,
  getEarnPerTap,
  hydrateTrustFromServer,
  TRUST_LEVELS,
  TRUST_META_KEY,
} from "@/lib/trust-score";
import { BottomNav } from "@/components/bottom-nav";

export default function TrustScorePage() {
  const [trustScore, setTrustScore] = useState(0);
  const [trustMeta, setTrustMeta] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);
  const breakdown = computeBreakdown(trustMeta || {});

  useEffect(() => {
    const refresh = () => {
      try {
        const meta = loadMeta();
        const score = computeScore(meta);
        setTrustScore(score);
        setTrustMeta(meta);
        // Persisted score: max-merge the server snapshot (login-grade
        // restore — never moves backwards, breakdown still sums exactly).
        try {
          const raw = localStorage.getItem("tivexx-user");
          const u = raw ? JSON.parse(raw) : null;
          const uid = u?.id || u?.userId || u?.user_id || "";
          if (uid) {
            fetch(`/api/user-balance?userId=${encodeURIComponent(uid)}&t=${Date.now()}`)
              .then((r) => r.json()).then((d) => {
                if (d && (d as any).trust_meta && typeof (d as any).trust_meta === "object") {
                  const merged = hydrateTrustFromServer((d as any).trust_meta);
                  setTrustScore(computeScore(merged));
                  setTrustMeta(merged);
                }
              }).catch(() => {});
          }
        } catch {}
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
            {breakdown.rows.map((row) => {
              const iconMap: Record<string, any> = {
                time: Clock,
                referrals: Users,
                tasks: Gift,
                taps: Zap,
                nav: TrendingUp,
                payments: CreditCard,
                bonus: Award,
              };
              const colorMap: Record<string, string> = {
                time: "text-emerald-400",
                referrals: "text-violet-400",
                tasks: "text-emerald-300",
                taps: "text-cyan-400",
                nav: "text-amber-400",
                payments: "text-blue-400",
                bonus: "text-amber-300",
              };
              return {
                ...row,
                icon: iconMap[row.key] || Award,
                color: colorMap[row.key] || "text-emerald-400",
              };
            }).map((r) => (
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
            💡 Tip: Stay 5 mins, do tasks (10=+2), invite friends (1=+1), tap 20× (=+1), explore (10 navs=+1), and fund once (+10) — you instantly jump to <b>Trusted</b>. Everything compounds.
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

      <style jsx global>{`
        .hh-root {
          font-family: 'Syne', sans-serif;
          background: #050d14;
          color: white;
          min-height: 100vh;
        }
        .hh-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .hh-back-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: white;
        }
        .hh-title {
          font-size: 20px;
          font-weight: 800;
          color: white;
          line-height: 1.2;
        }
        .hh-subtitle {
          font-size: 12px;
          color: rgba(255,255,255,0.6);
        }
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
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
        }
        .hh-rank2-top {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .hh-rank2-badge {
          width: 60px;
          height: 60px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .hh-rank2-head {
          flex: 1;
          min-width: 0;
        }
        .hh-rank2-name {
          font-size: 22px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.02em;
          line-height: 1.15;
        }
        .hh-rank2-sub {
          font-size: 12px;
          color: rgba(255,255,255,0.5);
          margin-top: 2px;
          font-family: "JetBrains Mono", monospace;
        }
        .hh-rank2-count {
          font-size: 12px;
          font-weight: 700;
          color: rgba(255,255,255,0.55);
          white-space: nowrap;
        }
        .hh-rank2-bar {
          height: 10px;
          background: rgba(255,255,255,0.07);
          border-radius: 999px;
          overflow: hidden;
          margin-top: 16px;
        }
        .hh-rank2-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.8s ease-out;
        }
        .hh-rank2-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 8px;
          font-size: 12px;
          color: rgba(255,255,255,0.5);
        }
        .hh-rank2-need {
          color: #34d399;
          font-weight: 700;
        }
        .hh-rank2-levels {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 8px;
          margin-top: 16px;
        }
        .hh-rank2-lvl {
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.02);
          border-radius: 18px;
          padding: 12px 4px 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .hh-rank2-lvl-ico {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .hh-rank2-lvl-label {
          font-size: 10px;
          font-weight: 700;
          color: white;
        }
        .hh-rank2-lvl-active {
          background: rgba(255,255,255,0.045);
        }
      `}</style>
 
       {/* Bottom Navigation */}
       <BottomNav />
     </div>
   );
 }


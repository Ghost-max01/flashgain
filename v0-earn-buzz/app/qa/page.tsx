// app/qa/page.tsx — Q&A (100 Nigeria Current Affairs Questions)
// For now: animated full-page Coming Soon (not a popup).
// The quiz itself lands here later; this file becomes its entry.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, BellRing, Sparkles, Brain, Timer, Trophy } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";

const NOTIFY_KEY = "tivexx-qa-notify";

export default function QAPage() {
  const [notifyOn, setNotifyOn] = useState(false);

  useEffect(() => {
    try {
      setNotifyOn(localStorage.getItem(NOTIFY_KEY) === "1");
    } catch {}
  }, []);

  const toggleNotify = () => {
    try {
      const next = !notifyOn;
      setNotifyOn(next);
      localStorage.setItem(NOTIFY_KEY, next ? "1" : "0");
    } catch {}
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

      {/* Floating question marks */}
      <div className="qa-floaters" aria-hidden="true">
        {["?", "?", "?", "?", "?", "?"].map((q, i) => (
          <span key={i} className={`qa-floater qa-floater-${i + 1}`}>{q}</span>
        ))}
      </div>

      {/* Header */}
      <div className="sticky top-0 z-10 hh-header">
        <div className="max-w-md mx-auto px-6 pt-8 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link href="/dashboard">
                <button className="hh-back-btn" aria-label="Back to dashboard">
                  <ArrowLeft className="h-5 w-5" />
                </button>
              </Link>
              <div className="ml-3">
                <h1 className="hh-title">Q&amp;A</h1>
                <p className="hh-subtitle">Test your knowledge, earn rewards</p>
              </div>
            </div>
            <div className="hh-reward-badge">
              <Brain className="h-4 w-4 text-emerald-300" />
              <span>100 questions</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 space-y-4 pt-2 relative z-10 pb-6">
        {/* Hero — Coming Soon */}
        <div className="hh-card hh-card-hero hh-entry-1 relative overflow-hidden text-center">
          <div className="hh-orb hh-orb-1" aria-hidden="true"></div>
          <div className="hh-orb hh-orb-2" aria-hidden="true"></div>

          <div className="relative z-10 py-4">
            <div className="qa-orb mx-auto mb-5">
              <span className="qa-orb-q">?</span>
              <span className="qa-orb-ring"></span>
              <span className="qa-orb-ring qa-orb-ring-2"></span>
            </div>

            <div className="qa-soon-badge">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Coming Soon</span>
            </div>
            <h2 className="qa-glow-title mt-3">Q&amp;A Arena</h2>
            <p className="text-sm text-white/70 leading-relaxed mt-2 max-w-xs mx-auto">
              <span className="text-amber-300 font-black">100 Nigeria Current Affairs</span> questions
              are being prepared — history, government, states, culture &amp; more.
            </p>

            {/* Shimmer progress bar */}
            <div className="qa-progress mt-5">
              <div className="qa-progress-track">
                <div className="qa-progress-fill"></div>
              </div>
              <div className="qa-progress-label">
                <span>Setting the questions…</span>
                <span className="qa-dots"><span>.</span><span>.</span><span>.</span></span>
              </div>
            </div>

            <button onClick={toggleNotify} className={`qa-notify-btn ${notifyOn ? "qa-notify-on" : ""}`}>
              {notifyOn ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              <span>{notifyOn ? "We'll alert you at launch ✓" : "Notify me at launch"}</span>
            </button>
          </div>
        </div>

        {/* What's coming */}
        <div className="hh-card hh-entry-2">
          <div className="hh-section-title mb-4">What&apos;s Coming</div>
          <div className="space-y-3">
            {[
              { icon: <Brain className="h-5 w-5 text-emerald-300" />, title: "100 Current Affairs Questions", desc: "Nigeria-focused: leaders, states, history & civics" },
              { icon: <Timer className="h-5 w-5 text-amber-300" />, title: "Beat-The-Clock Rounds", desc: "Answer fast — speed boosts your score" },
              { icon: <Trophy className="h-5 w-5 text-yellow-300" />, title: "Earn For Correct Answers", desc: "Top scorers climb the weekly leaderboard" },
            ].map((f, idx) => (
              <div key={idx} className="hh-step-item" style={{ animationDelay: `${idx * 100 + 400}ms` }}>
                <div className="hh-tip-icon">{f.icon}</div>
                <div className="flex-1 min-w-0">
                  <h4 className="hh-step-title">{f.title}</h4>
                  <p className="hh-step-desc">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tip */}
        <div className="hh-card hh-tip-card hh-entry-3">
          <div className="flex items-start gap-3">
            <div className="hh-tip-icon">
              <Sparkles className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">Stay Sharp</h4>
              <p className="text-sm text-emerald-200/80">
                Brush up on Nigeria&apos;s states and capitals, past &amp; present leaders,
                and national symbols — they&apos;ll all appear in the arena.
              </p>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800;900&display=swap");

        .hh-root {
          font-family: "Syne", sans-serif;
          background: #050d14;
          color: white;
          min-height: 100vh;
        }

        /* ─── BUBBLES ─── */
        .hh-bubbles-container { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
        .hh-bubble { position: absolute; border-radius: 50%; opacity: 0; animation: hh-bubble-rise linear infinite; }
        .hh-bubble-1 { width: 8px; height: 8px; left: 10%; background: radial-gradient(circle, rgba(16,185,129,0.6), transparent); animation-duration: 8s; }
        .hh-bubble-2 { width: 14px; height: 14px; left: 25%; background: radial-gradient(circle, rgba(59,130,246,0.5), transparent); animation-duration: 11s; animation-delay: 1.5s; }
        .hh-bubble-3 { width: 6px; height: 6px; left: 40%; background: radial-gradient(circle, rgba(16,185,129,0.7), transparent); animation-duration: 9s; animation-delay: 3s; }
        .hh-bubble-4 { width: 18px; height: 18px; left: 55%; background: radial-gradient(circle, rgba(139,92,246,0.4), transparent); animation-duration: 13s; animation-delay: 0.5s; }
        .hh-bubble-5 { width: 10px; height: 10px; left: 70%; background: radial-gradient(circle, rgba(16,185,129,0.5), transparent); animation-duration: 10s; animation-delay: 2s; }
        .hh-bubble-6 { width: 5px; height: 5px; left: 82%; background: radial-gradient(circle, rgba(52,211,153,0.8), transparent); animation-duration: 7s; animation-delay: 4s; }
        .hh-bubble-7 { width: 12px; height: 12px; left: 15%; background: radial-gradient(circle, rgba(59,130,246,0.4), transparent); animation-duration: 12s; animation-delay: 5s; }
        .hh-bubble-8 { width: 7px; height: 7px; left: 35%; background: radial-gradient(circle, rgba(16,185,129,0.6), transparent); animation-duration: 9.5s; animation-delay: 2.5s; }
        .hh-bubble-9 { width: 20px; height: 20px; left: 60%; background: radial-gradient(circle, rgba(16,185,129,0.2), transparent); animation-duration: 15s; animation-delay: 1s; }
        .hh-bubble-10 { width: 9px; height: 9px; left: 88%; background: radial-gradient(circle, rgba(139,92,246,0.5), transparent); animation-duration: 10.5s; animation-delay: 6s; }
        .hh-bubble-11 { width: 4px; height: 4px; left: 5%; background: radial-gradient(circle, rgba(52,211,153,0.9), transparent); animation-duration: 6.5s; animation-delay: 3.5s; }
        .hh-bubble-12 { width: 16px; height: 16px; left: 48%; background: radial-gradient(circle, rgba(59,130,246,0.3), transparent); animation-duration: 14s; animation-delay: 7s; }
        @keyframes hh-bubble-rise {
          0% { transform: translateY(100vh) scale(0.5); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 0.6; }
          100% { transform: translateY(-10vh) scale(1.2); opacity: 0; }
        }

        /* ─── MESH OVERLAY ─── */
        .hh-mesh-overlay {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background:
            radial-gradient(ellipse 60% 40% at 20% 80%, rgba(16,185,129,0.07) 0%, transparent 60%),
            radial-gradient(ellipse 50% 50% at 80% 20%, rgba(59,130,246,0.06) 0%, transparent 60%),
            radial-gradient(ellipse 40% 30% at 50% 50%, rgba(139,92,246,0.04) 0%, transparent 60%);
        }

        /* ─── FLOATING ? MARKS ─── */
        .qa-floaters { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
        .qa-floater {
          position: absolute; font-weight: 900; color: rgba(16,185,129,0.12);
          animation: qa-float ease-in-out infinite;
        }
        .qa-floater-1 { left: 8%; top: 20%; font-size: 56px; animation-duration: 7s; }
        .qa-floater-2 { left: 85%; top: 15%; font-size: 40px; animation-duration: 9s; animation-delay: 1s; }
        .qa-floater-3 { left: 12%; top: 65%; font-size: 72px; animation-duration: 11s; animation-delay: 2s; }
        .qa-floater-4 { left: 80%; top: 60%; font-size: 64px; animation-duration: 8s; animation-delay: 0.5s; }
        .qa-floater-5 { left: 45%; top: 8%; font-size: 34px; animation-duration: 10s; animation-delay: 3s; }
        .qa-floater-6 { left: 60%; top: 82%; font-size: 48px; animation-duration: 12s; animation-delay: 1.5s; }
        @keyframes qa-float {
          0%, 100% { transform: translateY(0) rotate(-6deg); opacity: 0.6; }
          50% { transform: translateY(-26px) rotate(8deg); opacity: 1; }
        }

        /* ─── HEADER ─── */
        .hh-header { background: rgba(5,13,20,0.85); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255,255,255,0.06); }
        .hh-back-btn {
          width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: white;
        }
        .hh-title { font-size: 20px; font-weight: 800; color: white; }
        .hh-subtitle { font-size: 12px; color: rgba(16,185,129,0.8); }
        .hh-reward-badge {
          display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800;
          background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.3);
          padding: 6px 12px; border-radius: 999px; color: white; white-space: nowrap;
        }

        /* ─── CARDS ─── */
        .hh-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%);
          border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 24px;
          backdrop-filter: blur(12px); position: relative; overflow: hidden;
        }
        .hh-card-hero { border-color: rgba(16,185,129,0.25); }
        .hh-section-title { font-size: 18px; font-weight: 800; color: white; }
        .hh-tip-card {
          background: linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05));
          border: 1px solid rgba(16,185,129,0.2);
        }
        .hh-tip-icon {
          width: 40px; height: 40px; border-radius: 12px; background: rgba(16,185,129,0.15);
          border: 1px solid rgba(16,185,129,0.3); display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .hh-step-item {
          display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 16px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
          animation: hh-entry 0.5s ease-out both;
        }
        .hh-step-title { font-size: 14px; font-weight: 800; color: white; }
        .hh-step-desc { font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 2px; }
        .hh-orb { position: absolute; border-radius: 50%; filter: blur(60px); pointer-events: none; }
        .hh-orb-1 { width: 200px; height: 200px; top: -80px; right: -60px; background: rgba(16,185,129,0.18); }
        .hh-orb-2 { width: 160px; height: 160px; bottom: -60px; left: -50px; background: rgba(139,92,246,0.14); }

        /* ─── COMING-SOON HERO ─── */
        .qa-orb {
          position: relative; width: 110px; height: 110px; border-radius: 50%;
          background: radial-gradient(circle at 35% 30%, rgba(52,211,153,0.5), rgba(5,13,20,0.9) 70%);
          border: 2px solid rgba(16,185,129,0.5);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 50px rgba(16,185,129,0.35);
          animation: qa-orb-pulse 2.6s ease-in-out infinite;
        }
        .qa-orb-q { font-size: 52px; font-weight: 900; color: white; text-shadow: 0 0 24px rgba(16,185,129,0.8); }
        .qa-orb-ring {
          position: absolute; inset: -10px; border-radius: 50%;
          border: 2px solid transparent; border-top-color: rgba(251,191,36,0.7);
          animation: qa-spin 3s linear infinite;
        }
        .qa-orb-ring-2 { inset: -18px; border-top-color: transparent; border-bottom-color: rgba(16,185,129,0.5); animation-duration: 5s; animation-direction: reverse; }
        @keyframes qa-orb-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 50px rgba(16,185,129,0.35); }
          50% { transform: scale(1.06); box-shadow: 0 0 80px rgba(16,185,129,0.55); }
        }
        @keyframes qa-spin { to { transform: rotate(360deg); } }

        .qa-soon-badge {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 11px; font-weight: 900; letter-spacing: 0.18em; text-transform: uppercase;
          color: #fbbf24; background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.35);
          padding: 6px 14px; border-radius: 999px;
          animation: qa-badge-blink 2s ease-in-out infinite;
        }
        @keyframes qa-badge-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }

        .qa-glow-title {
          font-size: 38px; font-weight: 900;
          background: linear-gradient(135deg, #10b981, #fbbf24);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          animation: qa-title-glow 2.5s infinite alternate;
        }
        @keyframes qa-title-glow {
          0% { filter: drop-shadow(0 0 4px rgba(16,185,129,0.3)); }
          100% { filter: drop-shadow(0 0 18px rgba(16,185,129,0.6)) drop-shadow(0 0 28px rgba(251,191,36,0.3)); }
        }

        /* ─── SHIMMER PROGRESS ─── */
        .qa-progress-track {
          height: 10px; border-radius: 999px; overflow: hidden;
          background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.08);
        }
        .qa-progress-fill {
          height: 100%; width: 40%; border-radius: 999px;
          background: linear-gradient(90deg, #10b981, #fbbf24, #10b981);
          background-size: 200% 100%;
          animation: qa-shimmer 2.2s linear infinite, qa-slide 4s ease-in-out infinite;
        }
        @keyframes qa-shimmer { to { background-position: -200% 0; } }
        @keyframes qa-slide { 0%, 100% { margin-left: 0; } 50% { margin-left: calc(60% - 8px); } }
        .qa-progress-label {
          display: flex; justify-content: space-between; font-size: 11px;
          color: rgba(255,255,255,0.55); margin-top: 6px;
        }
        .qa-dots span { animation: qa-dot 1.2s infinite; display: inline-block; }
        .qa-dots span:nth-child(2) { animation-delay: 0.2s; }
        .qa-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes qa-dot { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } }

        /* ─── NOTIFY BUTTON ─── */
        .qa-notify-btn {
          margin-top: 18px; width: 100%; height: 52px; border-radius: 16px;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          font-weight: 800; font-size: 14px; color: white;
          background: linear-gradient(135deg, #10b981, #059669);
          box-shadow: 0 6px 30px rgba(16,185,129,0.4);
          transition: transform 0.2s ease;
        }
        .qa-notify-btn:active { transform: scale(0.98); }
        .qa-notify-on { background: linear-gradient(135deg, #f59e0b, #d97706); box-shadow: 0 6px 30px rgba(245,158,11,0.4); }

        /* ─── ENTRIES ─── */
        .hh-entry-1 { animation: hh-entry 0.5s ease-out both; }
        .hh-entry-2 { animation: hh-entry 0.5s ease-out 0.1s both; }
        .hh-entry-3 { animation: hh-entry 0.5s ease-out 0.2s both; }
        @keyframes hh-entry { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        @media (prefers-reduced-motion: reduce) {
          .hh-bubble, .qa-floater, .qa-orb, .qa-orb-ring, .qa-progress-fill, .qa-glow-title, .qa-soon-badge { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

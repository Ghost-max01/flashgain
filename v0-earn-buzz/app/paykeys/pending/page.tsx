"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, Suspense } from "react";
import { X, ShieldCheck, Landmark, ArrowRight } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import {
  PENDING_WITHDRAW_WINDOW_MS,
  isPendingActive,
  markPendingFailed,
  readPendingWithdraw,
  startPendingWithdraw,
} from "@/lib/pending-withdraw";

function fmtLeft(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(h)}:${p(m)}:${p(sec)}`;
}

function PendingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fullName = searchParams.get("fullName") || "";
  const amount = searchParams.get("amount") || "";
  const method = searchParams.get("method") || "Bank Transfer";
  const ref = searchParams.get("ref") || "";

  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [leftMs, setLeftMs] = useState(PENDING_WITHDRAW_WINDOW_MS);

  // Ensure a pending record exists (confirm page always creates one first).
  // Deep-link guard: not logged in → /login. No record and no payment
  // params (typed URL, skipped the flow) → back to /withdraw.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("tivexx-user");
      if (!raw) { router.replace("/login"); return; }
      try {
        const u = JSON.parse(raw);
        if (!u || typeof u !== "object") { router.replace("/login"); return; }
      } catch { router.replace("/login"); return; }
      const existing = readPendingWithdraw();
      if (!existing && !amount) { router.replace("/withdraw"); return; }
      if (existing && existing.status === "pending" && existing.expiresAt > Date.now()) {
        setExpiresAt(existing.expiresAt);
        return;
      }
      if (existing && existing.status === "cancelled") {
        router.replace("/dashboard");
        return;
      }
      const rec = startPendingWithdraw({ amount, method, fullName, ref });
      setExpiresAt(rec.expiresAt);
    } catch {
      setExpiresAt(Date.now() + PENDING_WITHDRAW_WINDOW_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown — wall-clock from expiresAt so background time counts.
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const left = Math.max(0, expiresAt - Date.now());
      setLeftMs(left);
      if (left <= 0) {
        try {
          markPendingFailed();
        } catch {}
        const qs = new URLSearchParams({ fullName, amount, method, ...(ref ? { ref } : {}) });
        router.replace(`/paykeys/confirmation?${qs.toString()}`);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    const onReturn = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  const progress = useMemo(() => {
    if (!expiresAt) return 0;
    const total = PENDING_WITHDRAW_WINDOW_MS;
    return Math.min(100, Math.max(0, ((total - leftMs) / total) * 100));
  }, [expiresAt, leftMs]);

  const stillActive = expiresAt ? expiresAt - Date.now() > 0 : true;

  return (
    <div className="hh-root min-h-screen pb-28 relative overflow-hidden">
      <div className="hh-bubbles-container" aria-hidden="true">
        {[...Array(12)].map((_, i) => (
          <div key={i} className={`hh-bubble hh-bubble-${i + 1}`}></div>
        ))}
      </div>
      <div className="hh-mesh-overlay" aria-hidden="true"></div>

      {/* Header with X (pending X only goes back — transaction stays pending) */}
      <div className="sticky top-0 z-10 hh-header">
        <div className="max-w-md mx-auto px-6 pt-8 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="hh-title">Verifying payment</h1>
              <p className="hh-subtitle">Bank-grade pending check</p>
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              aria-label="Close"
              title="Close"
              className="w-9 h-9 grid place-items-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 space-y-4 pt-2 relative z-10 pb-6">
        {/* Pending hero */}
        <div className="hh-card hh-card-hero relative overflow-hidden">
          <div className="hh-orb hh-orb-1" aria-hidden="true"></div>
          <div className="hh-orb hh-orb-2" aria-hidden="true"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="hh-icon-ring">
                  <ShieldCheck className="h-4 w-4 text-amber-300" />
                </div>
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Pending verification</span>
              </div>
              <div className="hh-live-indicator">
                <span className="hh-live-dot-amber"></span>
                <span className="text-xs">In progress</span>
              </div>
            </div>

            {/* ── Animated bank transfer scene: sender ⇄ receiver ── */}
            <div className="pp-scene" aria-hidden="true">
              <div className="pp-person pp-sender">
                <div className="pp-avatar">🧑‍💼</div>
                <span className="pp-label">You</span>
              </div>
              <div className="pp-beam">
                <div className="pp-beam-line"></div>
                <div className="pp-bank"><Landmark className="h-4 w-4 text-amber-300" /></div>
                {[0, 1, 2].map((i) => (
                  <span key={i} className={`pp-packet pp-packet-${i + 1}`}>₦</span>
                ))}
              </div>
              <div className="pp-person pp-receiver">
                <div className="pp-avatar">🏦</div>
                <span className="pp-label">Bank</span>
              </div>
            </div>

            <div className="text-center mt-4">
              <div className="text-[11px] font-black tracking-widest text-white/50 uppercase">Time remaining</div>
              <div className="pp-countdown" role="timer" aria-live="polite">{fmtLeft(leftMs)}</div>
              <div className="pp-progress"><div className="pp-progress-fill" style={{ width: `${progress}%` }}></div></div>
              <p className="text-sm text-white/70 mt-3 leading-relaxed">
                Your transaction is being verified by the bank.
                {amount ? (
                  <> Amount <span className="font-black text-amber-300">₦{Number(String(amount).replace(/[^0-9.-]/g, "")) ? Number(String(amount).replace(/[^0-9.-]/g, "")).toLocaleString() : amount}</span> is held while the check runs.</>
                ) : (
                  <>Please keep this page open — no further action needed.</>
                )}
              </p>
              <p className="text-xs text-white/40 mt-2">
                {stillActive ? "Do not close your account — you can check back anytime." : "Finishing verification…"}
              </p>
            </div>
          </div>
        </div>

        {/* Status steps */}
        <div className="hh-card">
          <div className="space-y-3">
            <div className="pp-step pp-step-done"><span className="pp-step-dot">✓</span><span className="text-sm text-white/80">Payment submitted</span></div>
            <div className="pp-step pp-step-active"><span className="pp-step-dot pp-step-pulse"></span><span className="text-sm font-bold text-white">Bank verification in progress</span></div>
            <div className="pp-step"><span className="pp-step-dot">3</span><span className="text-sm text-white/50">Final result</span></div>
          </div>
        </div>

        <button onClick={() => router.push("/dashboard")} className="hh-secondary-btn w-full">
          Back to Dashboard <ArrowRight className="h-4 w-4 inline ml-1" />
        </button>
        <p className="text-center text-[11px] text-white/40">Leaving this page does NOT cancel verification — it keeps counting down.</p>
      </div>

      <BottomNav />

      <style jsx global>{`
        .hh-root { font-family: 'Syne', sans-serif; background: #050d14; color: white; min-height: 100vh; }
        .hh-bubbles-container { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
        .hh-bubble { position: absolute; border-radius: 50%; opacity: 0; animation: hh-bubble-rise linear infinite; }
        .hh-bubble-1 { width: 8px; height: 8px; left: 10%; background: radial-gradient(circle, rgba(249,115,22,0.5), transparent); animation-duration: 8s; }
        .hh-bubble-2 { width: 14px; height: 14px; left: 25%; background: radial-gradient(circle, rgba(245,158,11,0.4), transparent); animation-duration: 11s; animation-delay: 1.5s; }
        .hh-bubble-3 { width: 6px; height: 6px; left: 40%; background: radial-gradient(circle, rgba(249,115,22,0.5), transparent); animation-duration: 9s; animation-delay: 3s; }
        .hh-bubble-4 { width: 18px; height: 18px; left: 55%; background: radial-gradient(circle, rgba(245,158,11,0.35), transparent); animation-duration: 13s; animation-delay: 0.5s; }
        .hh-bubble-5 { width: 10px; height: 10px; left: 70%; background: radial-gradient(circle, rgba(249,115,22,0.4), transparent); animation-duration: 10s; animation-delay: 2s; }
        .hh-bubble-6 { width: 5px; height: 5px; left: 82%; background: radial-gradient(circle, rgba(251,191,36,0.7), transparent); animation-duration: 7s; animation-delay: 4s; }
        .hh-bubble-7 { width: 12px; height: 12px; left: 15%; background: radial-gradient(circle, rgba(249,115,22,0.35), transparent); animation-duration: 12s; animation-delay: 5s; }
        .hh-bubble-8 { width: 7px; height: 7px; left: 35%; background: radial-gradient(circle, rgba(249,115,22,0.5), transparent); animation-duration: 9.5s; animation-delay: 2.5s; }
        .hh-bubble-9 { width: 20px; height: 20px; left: 60%; background: radial-gradient(circle, rgba(249,115,22,0.2), transparent); animation-duration: 15s; animation-delay: 1s; }
        .hh-bubble-10 { width: 9px; height: 9px; left: 88%; background: radial-gradient(circle, rgba(245,158,11,0.4), transparent); animation-duration: 10.5s; animation-delay: 6s; }
        .hh-bubble-11 { width: 4px; height: 4px; left: 5%; background: radial-gradient(circle, rgba(251,191,36,0.8), transparent); animation-duration: 6.5s; animation-delay: 3.5s; }
        .hh-bubble-12 { width: 16px; height: 16px; left: 48%; background: radial-gradient(circle, rgba(249,115,22,0.28), transparent); animation-duration: 14s; animation-delay: 7s; }
        @keyframes hh-bubble-rise { 0% { transform: translateY(100vh) scale(0.5); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 0.6; } 100% { transform: translateY(-10vh) scale(1.2); opacity: 0; } }
        .hh-mesh-overlay { position: fixed; inset: 0; background: radial-gradient(ellipse 60% 40% at 20% 80%, rgba(249,115,22,0.06) 0%, transparent 60%), radial-gradient(ellipse 50% 50% at 80% 20%, rgba(245,158,11,0.05) 0%, transparent 60%); pointer-events: none; z-index: 0; }
        .hh-header { background: linear-gradient(180deg, rgba(5,13,20,0.95) 0%, rgba(5,13,20,0.8) 100%); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(249,115,22,0.15); }
        .hh-title { font-size: 20px; font-weight: 800; color: white; line-height: 1.2; }
        .hh-subtitle { font-size: 12px; color: rgba(249,115,22,0.8); }
        .hh-card { background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 20px; backdrop-filter: blur(12px); position: relative; overflow: hidden; }
        .hh-card-hero { background: linear-gradient(135deg, rgba(249,115,22,0.14) 0%, rgba(5,13,20,0.9) 50%, rgba(245,158,11,0.1) 100%); border-color: rgba(249,115,22,0.25); }
        .hh-orb { position: absolute; border-radius: 50%; filter: blur(40px); pointer-events: none; }
        .hh-orb-1 { width: 150px; height: 150px; background: radial-gradient(circle, rgba(249,115,22,0.16), transparent); top: -40px; right: -40px; animation: hh-orb-float 6s ease-in-out infinite; }
        .hh-orb-2 { width: 100px; height: 100px; background: radial-gradient(circle, rgba(245,158,11,0.12), transparent); bottom: 20px; left: -20px; animation: hh-orb-float 8s ease-in-out infinite reverse; }
        @keyframes hh-orb-float { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(8px,-8px) scale(1.05); } 66% { transform: translate(-4px,6px) scale(0.97); } }
        .hh-icon-ring { width: 32px; height: 32px; border-radius: 10px; background: linear-gradient(135deg, rgba(249,115,22,0.25), rgba(245,158,11,0.2)); border: 1px solid rgba(245,158,11,0.3); display: flex; align-items: center; justify-content: center; }
        .hh-live-indicator { display: flex; align-items: center; gap: 6px; background: rgba(249,115,22,0.1); border: 1px solid rgba(249,115,22,0.25); border-radius: 20px; padding: 4px 10px; }
        .hh-live-dot-amber { width: 8px; height: 8px; border-radius: 50%; background: #f59e0b; box-shadow: 0 0 6px #f59e0b; animation: hh-live-pulse-amber 1.5s ease-in-out infinite; }
        @keyframes hh-live-pulse-amber { 0%,100% { box-shadow: 0 0 4px #f59e0b; transform: scale(1); } 50% { box-shadow: 0 0 10px #f59e0b, 0 0 20px rgba(245,158,11,0.4); transform: scale(1.15); } }

        /* ── Transfer scene ── */
        .pp-scene { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 8px 0 4px; }
        .pp-person { display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 64px; }
        .pp-avatar { width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; background: radial-gradient(circle at 35% 30%, rgba(253,186,116,0.35), rgba(5,13,20,0.9) 70%); border: 2px solid rgba(249,115,22,0.4); box-shadow: 0 0 24px rgba(249,115,22,0.25); animation: pp-bob 2.4s ease-in-out infinite; }
        .pp-receiver .pp-avatar { animation-delay: 1.2s; }
        @keyframes pp-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .pp-label { font-size: 11px; font-weight: 800; letter-spacing: 0.08em; color: rgba(255,255,255,0.7); text-transform: uppercase; }
        .pp-beam { position: relative; flex: 1; height: 64px; }
        .pp-beam-line { position: absolute; left: 0; right: 0; top: 50%; height: 3px; transform: translateY(-50%); border-radius: 9999px; background: linear-gradient(90deg, rgba(249,115,22,0.1), rgba(249,115,22,0.6), rgba(245,158,11,0.1)); overflow: hidden; }
        .pp-beam-line::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent); animation: pp-beam-sweep 1.8s linear infinite; }
        @keyframes pp-beam-sweep { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
        .pp-bank { position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); width: 30px; height: 30px; border-radius: 50%; background: #0a1628; border: 1px solid rgba(249,115,22,0.5); display: flex; align-items: center; justify-content: center; z-index: 2; box-shadow: 0 0 16px rgba(249,115,22,0.4); }
        .pp-packet { position: absolute; top: 50%; width: 24px; height: 24px; margin-top: -12px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 900; color: #0a1628; background: radial-gradient(circle at 35% 30%, #fde68a, #f59e0b); box-shadow: 0 0 14px rgba(245,158,11,0.8); animation: pp-fly 2.4s linear infinite; }
        .pp-packet-1 { animation-delay: 0s; } .pp-packet-2 { animation-delay: 0.8s; } .pp-packet-3 { animation-delay: 1.6s; }
        @keyframes pp-fly { 0% { left: 2%; opacity: 0; transform: scale(0.6); } 12% { opacity: 1; transform: scale(1); } 45% { transform: translateY(-10px) scale(1.05); } 85% { opacity: 1; } 100% { left: 92%; opacity: 0; transform: scale(0.9); } }

        .pp-countdown { font-family: 'JetBrains Mono', monospace; font-size: 44px; font-weight: 800; letter-spacing: 0.04em; color: #fdba74; text-shadow: 0 0 18px rgba(249,115,22,0.55); margin-top: 4px; font-variant-numeric: tabular-nums; }
        .pp-progress { margin-top: 12px; height: 8px; background: rgba(255,255,255,0.08); border-radius: 9999px; overflow: hidden; }
        .pp-progress-fill { height: 100%; background: linear-gradient(90deg, #f97316, #f59e0b); border-radius: 9999px; transition: width 1s linear; box-shadow: 0 0 10px rgba(249,115,22,0.5); }
        .pp-step { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); }
        .pp-step-active { border-color: rgba(249,115,22,0.35); background: rgba(249,115,22,0.08); }
        .pp-step-done { border-color: rgba(52,211,153,0.25); }
        .pp-step-dot { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 900; background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.6); flex-shrink: 0; }
        .pp-step-done .pp-step-dot { background: rgba(52,211,153,0.2); color: #6ee7b7; }
        .pp-step-pulse { background: rgba(249,115,22,0.3) !important; animation: pp-pulse 1.4s ease-in-out infinite; }
        @keyframes pp-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(249,115,22,0.5); } 50% { box-shadow: 0 0 0 7px rgba(249,115,22,0); } }
        .hh-secondary-btn { padding: 16px; border-radius: 14px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; font-weight: 600; font-size: 15px; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; }
        .hh-secondary-btn:hover { background: rgba(255,255,255,0.1); }
        @media (prefers-reduced-motion: reduce) { .pp-packet, .pp-avatar, .pp-beam-line::after, .hh-bubble, .hh-orb-1, .hh-orb-2, .pp-step-pulse, .hh-live-dot-amber { animation: none !important; } }
      `}</style>
    </div>
  );
}

export default function PendingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: "#050d14" }}>
          <div className="animate-pulse text-sm text-emerald-400">Loading verification…</div>
        </div>
      }
    >
      <PendingContent />
    </Suspense>
  );
}

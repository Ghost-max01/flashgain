"use client";

import React, { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Copy, Check, Home, Gamepad2, User, Sparkles, Shield, Landmark, Hash, User2, AlertCircle } from "lucide-react";
import { OpayWarningPopup } from "@/components/opay-warning-popup";

function InvestmentPaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const amountParam = searchParams.get("amount") || "";
  const planParam = searchParams.get("plan") || "";

  const [copiedField, setCopiedField] = React.useState<string | null>(null);
  const [showOpayWarning, setShowOpayWarning] = React.useState<boolean>(true);
  const [showManual, setShowManual] = React.useState(false);
  const [paying, setPaying] = React.useState(false);
  const [autoTried, setAutoTried] = React.useState(false);
  const timersRef = React.useRef<number[]>([]);

  const amountNum = Number(String(amountParam).replace(/[^0-9]/g, "")) || 0;

  React.useEffect(() => {
    setShowOpayWarning(true);
    function scheduleCycle() {
      const hideTimer = window.setTimeout(() => {
        setShowOpayWarning(false);
        const showTimer = window.setTimeout(() => {
          setShowOpayWarning(true);
          scheduleCycle();
        }, 10000);
        timersRef.current.push(showTimer);
      }, 4000);
      timersRef.current.push(hideTimer);
    }
    scheduleCycle();
    return () => {
      timersRef.current.forEach((id) => clearTimeout(id));
      timersRef.current = [];
    };
  }, []);

  // Auto-redirect to Paystack immediately on mount — investment is Paystack-first
  const handlePaystack = React.useCallback(async () => {
    if (!amountNum || amountNum < 100) return;
    try {
      const rawUser = typeof window !== "undefined" ? localStorage.getItem("tivexx-user") : null;
      const u = rawUser ? JSON.parse(rawUser) : null;
      const email = u?.email || "";
      if (!email) {
        alert("Please update your profile email first");
        return;
      }
      setPaying(true);
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          amount: amountNum,
          callbackUrl: `${window.location.origin}/paystack/callback`,
          metadata: { type: "investment", plan: planParam || "custom", userId: u?.id || u?.userId || "", amount: amountNum },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.authorization_url) throw new Error(data?.error || "Paystack unavailable");
      window.location.href = data.authorization_url;
    } catch (e: any) {
      // Paystack unavailable — reveal manual fallback
      setShowManual(true);
      if (!autoTried) alert(e?.message || "Paystack unavailable — you can pay manually below");
    } finally {
      setPaying(false);
    }
  }, [amountNum, planParam, autoTried]);

  // Auto trigger on first load
  React.useEffect(() => {
    if (!autoTried && amountNum >= 100) {
      setAutoTried(true);
      // small delay so UI renders before redirect
      const t = window.setTimeout(() => { void handlePaystack(); }, 600);
      return () => clearTimeout(t);
    }
  }, [amountNum, autoTried, handlePaystack]);

  const formatNumber = (val: string | number) => {
    const n = Number(String(val).replace(/[^0-9.-]/g, ""));
    if (isNaN(n)) return String(val);
    return n.toLocaleString("en-NG");
  };

  return (
    <div className="hh-root min-h-screen pb-28 relative overflow-hidden">
      <div className="hh-bubbles-container" aria-hidden="true">
        {[...Array(12)].map((_, i) => (
          <div key={i} className={`hh-bubble hh-bubble-${i + 1}`}></div>
        ))}
      </div>
      <div className="hh-mesh-overlay" aria-hidden="true"></div>

      <div className="max-w-md mx-auto px-6 pt-8 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="hh-back-btn" title="Go back" aria-label="Go back">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="hh-title">Investment Payment</h1>
              <p className="hh-subtitle">Paystack checkout</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 space-y-4 pt-2 relative z-10 pb-6">

        <div className="hh-card hh-card-hero hh-entry-1 relative overflow-hidden">
          <div className="hh-orb hh-orb-1" aria-hidden="true"></div>
          <div className="hh-orb hh-orb-2" aria-hidden="true"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="hh-icon-ring">
                  <Sparkles className="h-4 w-4 text-amber-300" />
                </div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Secure Payment</span>
              </div>
              <div className="hh-live-indicator">
                <span className="hh-live-dot"></span>
                <span className="text-xs">Paystack</span>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="hh-icon-large mb-3">
                <Shield className="h-10 w-10 text-emerald-300" />
              </div>
              <p className="text-center text-sm text-white/80">
                You chose <span className="font-black text-white">₦{formatNumber(amountParam)}</span> {planParam ? `· ${planParam}` : ""} — redirecting to Paystack...
              </p>
            </div>
          </div>
        </div>

        <div className="hh-card hh-entry-2 flex items-center justify-center py-6">
          <div className="text-center">
            <p className="text-sm text-emerald-400/70 mb-2 uppercase tracking-widest font-semibold">Amount</p>
            <h2 className="text-5xl font-black text-white tracking-tight">
              <span className="text-2xl opacity-80">₦</span>
              {formatNumber(amountParam)}
            </h2>
            <p className="text-xs text-white/50 mt-2">{planParam || "custom"} plan</p>
          </div>
        </div>

        <button
          onClick={handlePaystack}
          disabled={paying}
          className="hh-proceed-btn hh-proceed-active w-full hh-entry-3"
        >
          {paying ? "Opening Paystack..." : `Pay ₦${formatNumber(amountParam)} with Paystack — Instant ✓`}
        </button>

        <p className="text-center text-[11px] text-white/40">You will be redirected to Paystack. After payment, your balance is credited instantly.</p>

        {/* Manual fallback — only shown if Paystack fails or user taps */}
        {!showManual ? (
          <button onClick={() => setShowManual(true)} className="w-full text-center text-xs text-white/40 underline hh-entry-4">
            Paystack not loading? Tap for manual bank transfer
          </button>
        ) : (
          <div className="hh-card hh-entry-4 border-amber-500/20">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-bold">Manual bank transfer (fallback)</span>
            </div>
            <p className="text-xs text-white/60 mb-3">Only use this if Paystack is unavailable. Transfer to:</p>
            <div className="space-y-3">
              <div className="hh-detail-item">
                <div className="flex items-center gap-2 mb-1"><Landmark className="h-4 w-4 text-emerald-400" /><div className="hh-detail-label">Bank Name</div></div>
                <span className="hh-detail-value">Kuda</span>
              </div>
              <div className="hh-detail-item">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2"><Hash className="h-4 w-4 text-emerald-400" /><div className="hh-detail-label">Account Number</div></div>
                  <button onClick={() => { navigator.clipboard.writeText("2086258173"); setCopiedField("account"); setTimeout(()=>setCopiedField(null),2000); }} className="hh-copy-btn">{copiedField==="account"?<Check className="h-4 w-4 text-emerald-400"/>:<Copy className="h-4 w-4"/>}</button>
                </div>
                <span className="hh-detail-value">2086258173</span>
              </div>
              <div className="hh-detail-item">
                <div className="flex items-center gap-2 mb-1"><User2 className="h-4 w-4 text-emerald-400" /><div className="hh-detail-label">Account Name</div></div>
                <span className="hh-detail-value">Faith Wali</span>
              </div>
            </div>
            <button onClick={() => router.push(`/paykeys/confirmation?amount=${amountNum}&method=Investment`)} className="hh-proceed-btn w-full mt-4 !bg-white/5 !border !border-white/10">
              I have made this bank Transfer
            </button>
          </div>
        )}

        <div className="hh-card hh-tip-card hh-entry-5">
          <div className="flex items-start gap-3">
            <div className="hh-tip-icon"><Shield className="h-5 w-5 text-emerald-300" /></div>
            <div>
              <h4 className="font-bold text-white mb-1">Secure Transaction</h4>
              <p className="text-sm text-emerald-200/80">Paystack is PCI-compliant. Your investment is credited to your balance immediately after verification.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="hh-bottom-nav">
        <Link href="/dashboard" className="hh-nav-item"><Home className="h-5 w-5" /><span>Home</span></Link>
        <Link href="/about" className="hh-nav-item hh-nav-active"><Gamepad2 className="h-5 w-5" /><span>About</span></Link>
        <Link href="/refer" className="hh-nav-item"><User className="h-5 w-5" /><span>Refer</span></Link>
      </div>

      {showOpayWarning && <OpayWarningPopup onClose={() => setShowOpayWarning(false)} />}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap');
        .hh-root { font-family: 'Syne', sans-serif; background: #050d14; color: white; min-height: 100vh; }
        .hh-bubbles-container { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
        .hh-bubble { position: absolute; border-radius: 50%; opacity: 0; animation: hh-bubble-rise linear infinite; }
        .hh-bubble-1  { width: 8px; height: 8px; left: 10%; background: radial-gradient(circle, rgba(16,185,129,0.6), transparent); animation-duration: 8s; animation-delay: 0s; }
        .hh-bubble-2  { width: 14px; height: 14px; left: 25%; background: radial-gradient(circle, rgba(59,130,246,0.5), transparent); animation-duration: 11s; animation-delay: 1.5s; }
        .hh-bubble-3  { width: 6px; height: 6px; left: 40%; background: radial-gradient(circle, rgba(16,185,129,0.7), transparent); animation-duration: 9s; animation-delay: 3s; }
        .hh-bubble-4  { width: 18px; height: 18px; left: 55%; background: radial-gradient(circle, rgba(139,92,246,0.4), transparent); animation-duration: 13s; animation-delay: 0.5s; }
        .hh-bubble-5  { width: 10px; height: 10px; left: 70%; background: radial-gradient(circle, rgba(16,185,129,0.5), transparent); animation-duration: 10s; animation-delay: 2s; }
        .hh-bubble-6  { width: 5px; height: 5px; left: 82%; background: radial-gradient(circle, rgba(52,211,153,0.8), transparent); animation-duration: 7s; animation-delay: 4s; }
        .hh-bubble-7  { width: 12px; height: 12px; left: 15%; background: radial-gradient(circle, rgba(59,130,246,0.4), transparent); animation-duration: 12s; animation-delay: 5s; }
        .hh-bubble-8  { width: 7px; height: 7px; left: 35%; background: radial-gradient(circle, rgba(16,185,129,0.6), transparent); animation-duration: 9.5s; animation-delay: 2.5s; }
        .hh-bubble-9  { width: 20px; height: 20px; left: 60%; background: radial-gradient(circle, rgba(16,185,129,0.2), transparent); animation-duration: 15s; animation-delay: 1s; }
        .hh-bubble-10 { width: 9px; height: 9px; left: 88%; background: radial-gradient(circle, rgba(139,92,246,0.5), transparent); animation-duration: 10.5s; animation-delay: 6s; }
        .hh-bubble-11 { width: 4px; height: 4px; left: 5%; background: radial-gradient(circle, rgba(52,211,153,0.9), transparent); animation-duration: 6.5s; animation-delay: 3.5s; }
        .hh-bubble-12 { width: 16px; height: 16px; left: 48%; background: radial-gradient(circle, rgba(59,130,246,0.3), transparent); animation-duration: 14s; animation-delay: 7s; }
        @keyframes hh-bubble-rise { 0% { transform: translateY(100vh) scale(0.5); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 0.6; } 100% { transform: translateY(-10vh) scale(1.2); opacity: 0; } }
        .hh-mesh-overlay { position: fixed; inset: 0; background: radial-gradient(ellipse 60% 40% at 20% 80%, rgba(16,185,129,0.07) 0%, transparent 60%), radial-gradient(ellipse 50% 50% at 80% 20%, rgba(59,130,246,0.06) 0%, transparent 60%), radial-gradient(ellipse 40% 30% at 50% 50%, rgba(139,92,246,0.04) 0%, transparent 60%); pointer-events: none; z-index: 0; }
        .hh-back-btn { width: 40px; height: 40px; border-radius: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; color: white; transition: all 0.2s ease; cursor: pointer; }
        .hh-title { font-size: 20px; font-weight: 800; color: white; line-height: 1.2; }
        .hh-subtitle { font-size: 12px; color: rgba(16,185,129,0.8); }
        .hh-card { background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 20px; backdrop-filter: blur(12px); position: relative; overflow: hidden; }
        .hh-card-hero { background: linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,13,20,0.9) 50%, rgba(245,158,11,0.1) 100%); border-color: rgba(16,185,129,0.2); }
        .hh-orb { position: absolute; border-radius: 50%; filter: blur(40px); pointer-events: none; }
        .hh-orb-1 { width: 150px; height: 150px; background: radial-gradient(circle, rgba(16,185,129,0.2), transparent); top: -40px; right: -40px; }
        .hh-orb-2 { width: 100px; height: 100px; background: radial-gradient(circle, rgba(245,158,11,0.15), transparent); bottom: 20px; left: -20px; }
        .hh-icon-ring { width: 32px; height: 32px; border-radius: 10px; background: linear-gradient(135deg, rgba(16,185,129,0.2), rgba(245,158,11,0.2)); border: 1px solid rgba(245,158,11,0.3); display: flex; align-items: center; justify-content: center; }
        .hh-icon-large { width: 70px; height: 70px; border-radius: 50%; background: rgba(16,185,129,0.15); border: 2px solid rgba(16,185,129,0.3); display: flex; align-items: center; justify-content: center; }
        .hh-live-indicator { display: flex; align-items: center; gap: 6px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); border-radius: 20px; padding: 4px 10px; }
        .hh-live-dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 6px #10b981; }
        .hh-detail-item { padding: 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 14px; }
        .hh-detail-label { font-size: 11px; color: #10b981; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .hh-detail-value { font-size: 16px; font-weight: 600; color: white; font-family: 'JetBrains Mono', monospace; display: block; margin-top: 2px; }
        .hh-copy-btn { width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.6); cursor: pointer; }
        .hh-proceed-btn { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 18px; border-radius: 16px; font-weight: 800; font-size: 16px; border: none; cursor: pointer; }
        .hh-proceed-active { background: linear-gradient(135deg, #10b981, #059669, #047857); color: white; }
        .hh-tip-icon { width: 40px; height: 40px; border-radius: 12px; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .hh-tip-card { background: linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05)); border: 1px solid rgba(16,185,129,0.2); }
        .hh-bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; max-width: 448px; margin: 0 auto; background: rgba(5,13,20,0.92); backdrop-filter: blur(20px); border-top: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-around; align-items: center; height: 64px; z-index: 100; }
        .hh-nav-item { display: flex; flex-direction: column; align-items: center; gap: 3px; color: #4b5563; text-decoration: none; font-size: 11px; font-weight: 600; padding: 8px 16px; }
        .hh-nav-active { color: #10b981 !important; }
        .hh-entry-1 { }
        .hh-entry-2 { }
        .hh-entry-3 { }
      `}</style>
    </div>
  );
}

export default function InvestmentPaymentPage() {
  return (
    <Suspense fallback={<div className="hh-root min-h-screen flex items-center justify-center text-white/60 text-sm">Loading...</div>}>
      <InvestmentPaymentContent />
    </Suspense>
  );
}

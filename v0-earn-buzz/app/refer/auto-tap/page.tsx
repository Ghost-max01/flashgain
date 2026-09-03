// app/refer/auto-tap/page.tsx — dedicated Auto Tap referral page
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Copy, Share2, Users, Check } from "lucide-react";

function AutoTapReferContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = (searchParams.get("plan") || "24h") as string;
  const [origin, setOrigin] = useState("");
  const [userData, setUserData] = useState<any>(null);
  const [autoRefCode, setAutoRefCode] = useState("");
  const [autoRefCount, setAutoRefCount] = useState(0);
  const [copied, setCopied] = useState(false);

  const planMap: Record<string, { label: string; need: number; maxEarn: number }> = {
    "24h": { label: "24 hours: 1500 taps", need: 10, maxEarn: 150000 },
    "2d": { label: "2 days: 3500 taps", need: 20, maxEarn: 350000 },
    "3d": { label: "3 days: 5500 taps", need: 30, maxEarn: 550000 },
    "1w": { label: "1 week: 10,000 taps", need: 50, maxEarn: 1000000 },
    free1h: { label: "1 hour FREE", need: 0, maxEarn: 60000 },
  };
  const plan = planMap[planId] || planMap["24h"];

  useEffect(() => { setOrigin(window.location.origin); }, []);
  useEffect(() => {
    const raw = localStorage.getItem("tivexx-user");
    if (raw) try { setUserData(JSON.parse(raw)); } catch {}
  }, []);
  useEffect(() => {
    if (!userData) return;
    try {
      const mapRaw = localStorage.getItem("auto_tap_ref_code");
      const map = mapRaw ? JSON.parse(mapRaw) : {};
      let code = map[planId];
      if (!code) {
        const base = (userData?.referral_code || userData?.id || userData?.userId || "USER").toString().slice(-4);
        code = `${base}-AUTO-${planId}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
        map[planId] = code;
        localStorage.setItem("auto_tap_ref_code", JSON.stringify(map));
      }
      setAutoRefCode(code);
      const cnt = localStorage.getItem(`auto_ref_count_${planId}`);
      if (cnt) setAutoRefCount(Number(cnt));
      const uid = userData?.id || userData?.userId;
      if (uid) fetch(`/api/referral-stats?userId=${uid}&t=${Date.now()}`).then(r=>r.json()).then(d=>{
        if (typeof d.referral_count === "number") setAutoRefCount(d.referral_count);
      }).catch(()=>{});
    } catch {}
  }, [userData, planId]);

  const autoLink = origin && autoRefCode ? `${origin}/refer?ref=${autoRefCode}` : "";
  const pct = Math.min(100, Math.round((autoRefCount / Math.max(1, plan.need))*100));

  const copy = () => {
    if (!autoLink) return;
    navigator.clipboard.writeText(autoLink);
    setCopied(true); setTimeout(()=>setCopied(false), 2000);
  };
  const shareWA = () => {
    const msg = `Join FlashGain9ja and help me unlock Auto Tap ${plan.label}! ${autoLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_self");
  };

  return (
    <div className="hh-root min-h-screen pb-28 relative overflow-hidden">
      <div className="hh-bubbles-container" aria-hidden="true">{[...Array(12)].map((_, i)=>(<div key={i} className={`hh-bubble hh-bubble-${i+1}`}></div>))}</div>
      <div className="hh-mesh-overlay" aria-hidden="true"></div>
      <div className="max-w-md mx-auto px-6 pt-8 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={()=> router.back()} className="hh-back-btn"><ArrowLeft className="h-5 w-5" /></button>
          <div>
            <h1 className="hh-title">Auto Tap Referral</h1>
            <p className="hh-subtitle">{plan.label} — {plan.need} referrals</p>
          </div>
        </div>
      </div>
      <div className="max-w-md mx-auto px-4 space-y-4 pt-2 relative z-10 pb-6">
        <div className="hh-card hh-entry-1 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-amber-500/10">
          <div className="flex items-center gap-2 mb-3">
            <div className="hh-icon-ring"><Users className="h-4 w-4 text-emerald-300" /></div>
            <span className="text-xs font-black tracking-widest text-emerald-300">REFERRAL — {plan.need} REQUIRED</span>
          </div>
          <h3 className="text-base font-black text-white">Referral — {plan.need} referrals</h3>
          <p className="text-xs text-white/60 mt-1">New tracking link will be generated for this plan. Referrals from this link count toward this plan AND your total. Max ₦{plan.maxEarn.toLocaleString()} when unlocked.</p>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-1"><span className="text-white/60">Progress</span><span className="font-mono font-bold text-white">{autoRefCount}/{plan.need}</span></div>
            <div className="hh-progress-track"><div className="hh-progress-fill" style={{ width: `${pct}%` }}></div></div>
          </div>
          <div className="mt-4 bg-black/30 rounded-xl p-2.5 border border-white/10">
            <div className="text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1">Your Auto Tap referral link</div>
            <div className="text-xs font-mono text-white break-all">{autoLink || "generating..."}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button onClick={copy} className="hh-share-btn hh-share-copy flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black">{copied ? <><Check className="h-4 w-4" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy link</>}</button>
            <button onClick={shareWA} className="hh-share-btn hh-share-wa flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black"><Share2 className="h-4 w-4" /> Share</button>
          </div>
          {autoRefCount >= plan.need ? (
            <button onClick={()=> router.push("/dashboard")} className="w-full mt-3 rounded-full bg-emerald-500 text-white font-black py-3 text-sm">Unlock & Start Auto Tap →</button>
          ) : (
            <p className="text-[11px] text-amber-300 mt-2 text-center">{plan.need - autoRefCount} more referral{plan.need - autoRefCount===1?"":"s"} to unlock</p>
          )}
        </div>
        <Link href="/refer" className="block text-center text-xs text-white/50 underline">Back to Refer & Earn →</Link>
      </div>
      <style jsx global>{`
        .hh-root { font-family: 'Syne', sans-serif; background: #050d14; color: white; min-height: 100vh; }
        .hh-header { background: linear-gradient(180deg, rgba(5,13,20,0.95) 0%, rgba(5,13,20,0.8) 100%); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(16,185,129,0.15); }
        .hh-back-btn { width: 40px; height: 40px; border-radius: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; color: white; }
        .hh-title { font-size: 20px; font-weight: 800; color: white; }
        .hh-subtitle { font-size: 12px; color: rgba(16,185,129,0.8); }
        .hh-card { background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 20px; backdrop-filter: blur(12px); position: relative; overflow: hidden; }
        .hh-icon-ring { width: 32px; height: 32px; border-radius: 10px; background: linear-gradient(135deg, rgba(16,185,129,0.2), rgba(245,158,11,0.2)); border: 1px solid rgba(245,158,11,0.3); display: flex; align-items: center; justify-content: center; }
        .hh-progress-track { height: 8px; background: rgba(255,255,255,0.08); border-radius: 9999px; overflow: hidden; }
        .hh-progress-fill { height: 100%; background: linear-gradient(90deg, #10b981, #34d399); border-radius: 9999px; transition: width 0.3s ease; }
        .hh-share-btn { border-radius: 12px; font-weight: 800; border: 1px solid rgba(255,255,255,0.1); }
        .hh-share-copy { background: rgba(255,255,255,0.08); color: white; }
        .hh-share-wa { background: linear-gradient(135deg, #10b981, #059669); color: white; border-color: rgba(16,185,129,0.3); }
        .hh-bubbles-container { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
        .hh-bubble { position: absolute; border-radius: 50%; opacity: 0; animation: hh-bubble-rise linear infinite; }
        .hh-bubble-1 { width: 8px; height: 8px; left: 10%; background: radial-gradient(circle, rgba(16,185,129,0.6), transparent); animation-duration: 8s; }
        .hh-mesh-overlay { position: fixed; inset: 0; background: radial-gradient(ellipse 60% 40% at 20% 80%, rgba(16,185,129,0.07) 0%, transparent 60%); pointer-events: none; z-index: 0; }
        @keyframes hh-bubble-rise { 0% { transform: translateY(100vh) scale(0.5); opacity: 0; } 10% { opacity: 1; } 100% { transform: translateY(-10vh) scale(1.2); opacity: 0; } }
      `}</style>
    </div>
  );
}

export default function AutoTapReferPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#050d14] text-white/60 text-sm">Loading...</div>}>
      <AutoTapReferContent />
    </Suspense>
  );
}

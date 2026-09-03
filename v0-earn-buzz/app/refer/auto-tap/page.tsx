// app/refer/auto-tap/page.tsx — mirrors Refer & Earn but stops above How It Works
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Copy, Share2, Gift, Users, Wallet, Send, Check, Sparkles, TrendingUp, Award, Clock } from "lucide-react";

function AutoTapReferContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = (searchParams.get("plan") || "24h") as string;
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");
  const [activeMessage, setActiveMessage] = useState("");
  const [animatedEarnings, setAnimatedEarnings] = useState(0);
  const [isEarningsChanging, setIsEarningsChanging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [autoRefCode, setAutoRefCode] = useState("");
  const [autoRefCount, setAutoRefCount] = useState(0);

  const planMap: Record<string, { label: string; need: number; maxEarn: number }> = {
    "24h": { label: "24 hours: 1500 taps", need: 10, maxEarn: 150000 },
    "2d": { label: "2 days: 3500 taps", need: 20, maxEarn: 350000 },
    "3d": { label: "3 days: 5500 taps", need: 30, maxEarn: 550000 },
    "1w": { label: "1 week: 10,000 taps", need: 50, maxEarn: 1000000 },
  };
  const plan = planMap[planId] || planMap["24h"];

  const referralMessages = [
    "Join FlashGain9ja today and cashout just like me 💸 I already withdrew ₦200K once. Click the link below to start 👇",
    "I completed tasks on FlashGain9ja and withdrew ₦250K successfully ✅ Join now with the link below.",
    "FlashGain9ja paid me ₦300K last week 🔥 Don’t miss your chance. Click the link below to join 👇",
  ];

  const formatCurrency = (amount: number) => {
    const formatted = new Intl.NumberFormat("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    const numDigits = formatted.split(".")[0].replace(/,/g, "").length;
    const baseSize = 1.75; const minSize = 1.0; const sizePerDigit = 0.15;
    const fontSize = Math.max(minSize, baseSize - (numDigits - 4) * sizePerDigit);
    return <span className="font-mono inline-flex items-baseline" style={{ fontSize: `${fontSize}rem` }}><span className="text-[0.6em] align-top opacity-80">₦</span><span className="font-black tracking-tight">{formatted.split(".")[0]}</span><span className="text-[0.6em] opacity-60">.{formatted.split(".")[1] || "00"}</span></span>;
  };

  useEffect(() => {
    setOrigin(window.location.origin);
    setActiveMessage(referralMessages[Math.floor(Math.random() * referralMessages.length)]);
    const storedUser = localStorage.getItem("tivexx-user");
    if (!storedUser) { router.push("/login"); return; }
    const user = JSON.parse(storedUser);
    const userId = user.id || user.userId;
    fetch(`/api/referral-stats?userId=${userId}&t=${Date.now()}`).then(r=>r.json()).then(data=>{
      let balance = 50000;
      const stored = localStorage.getItem("tivexx-user");
      if (stored) { const u = JSON.parse(stored); const localBal = u.balance || 50000; const refEarned = data.referral_balance || 0; const lastSync = localStorage.getItem("tivexx-last-synced-referrals") || "0"; const newEarned = Math.max(0, refEarned - parseInt(lastSync)); balance = localBal + newEarned; u.balance = balance; localStorage.setItem("tivexx-user", JSON.stringify(u)); if (newEarned>0) localStorage.setItem("tivexx-last-synced-referrals", refEarned.toString()); }
      setUserData({ id: userId, referral_code: data.referral_code, referral_count: data.referral_count, referral_balance: data.referral_balance, pending_count: data.pending_count || 0, balance });
      setAnimatedEarnings(data.referral_balance + (data.pending_count || 0) * 10000);
    }).catch(console.error).finally(()=> setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!userData) return;
    const target = userData.referral_balance + (userData.pending_count || 0) * 10000;
    if (target === animatedEarnings) return;
    const diff = target - animatedEarnings; const steps=30; const inc=diff/steps; setIsEarningsChanging(true); let cur=0; const t=setInterval(()=>{ cur++; setAnimatedEarnings(p=>{ const v=p+inc; if(cur>=steps){clearInterval(t); setIsEarningsChanging(false); return target;} return Math.round(v); }); },16); return()=>clearInterval(t);
  }, [userData]);

  useEffect(() => {
    if (!userData) return;
    try {
      const mapRaw = localStorage.getItem("auto_tap_ref_code");
      const map = mapRaw ? JSON.parse(mapRaw) : {};
      let code = map[planId];
      if (!code) { const base=(userData.referral_code||userData.id||"USER").toString().slice(-4); code=`${base}-AUTO-${planId}-${Math.random().toString(36).slice(2,6).toUpperCase()}`; map[planId]=code; localStorage.setItem("auto_tap_ref_code", JSON.stringify(map)); }
      setAutoRefCode(code);
      const cnt=localStorage.getItem(`auto_ref_count_${planId}`);
      if(cnt) setAutoRefCount(Number(cnt));
      fetch(`/api/referral-stats?userId=${userData.id}&t=${Date.now()}`).then(r=>r.json()).then(d=>{ if(typeof d.referral_count==="number") setAutoRefCount(d.referral_count); }).catch(()=>{});
    } catch {}
  }, [userData, planId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#050d14]"><div className="text-center"><div className="relative w-16 h-16 mx-auto mb-4"><div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-ping"></div><div className="absolute inset-2 rounded-full border-2 border-emerald-400/50 animate-ping" style={{animationDelay:"0.3s"}}></div><div className="absolute inset-4 rounded-full bg-emerald-500/20 animate-pulse"></div></div><p className="text-emerald-400 text-sm font-medium tracking-widest uppercase">Loading</p></div></div>;

  const autoLink = origin && autoRefCode ? `${origin}/refer?ref=${autoRefCode}` : "";
  const pct = Math.min(100, Math.round((autoRefCount / Math.max(1, plan.need))*100));
  const referralLink = userData?.referral_code ? `/register?ref=${userData.referral_code}` : "/register";

  const handleCopy = () => { if(!autoLink) return; navigator.clipboard.writeText(autoLink); setCopied(true); setTimeout(()=>setCopied(false),2000); };
  const shareWhatsApp = () => { const msg=`Join FlashGain9ja and help me unlock Auto Tap ${plan.label}! ${autoLink}`; window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`,"_self"); };
  const shareTelegram = () => { const msg=`Join FlashGain9ja and help me unlock Auto Tap ${plan.label}!`; window.open(`https://t.me/share/url?url=${encodeURIComponent(autoLink)}&text=${encodeURIComponent(msg)}`,"_self"); };
  const cycleMessage = () => setActiveMessage(referralMessages[Math.floor(Math.random()*referralMessages.length)]);

  return (
    <div className="hh-root min-h-screen pb-28 relative overflow-hidden">
      <div className="hh-bubbles-container" aria-hidden="true">{[...Array(12)].map((_, i)=>(<div key={i} className={`hh-bubble hh-bubble-${i+1}`}></div>))}</div>
      <div className="hh-mesh-overlay" aria-hidden="true"></div>
      <div className="sticky top-0 z-10 hh-header"><div className="max-w-md mx-auto px-6 pt-8 pb-4"><div className="flex items-center justify-between"><div className="flex items-center"><Link href="/dashboard"><button className="hh-back-btn"><ArrowLeft className="h-5 w-5" /></button></Link><div className="ml-3"><h1 className="hh-title">Refer & Earn</h1><p className="hh-subtitle">Invite friends, earn rewards</p></div></div><div className="hh-reward-badge"><Sparkles className="h-4 w-4 text-amber-300" /><span>each ₦5k</span></div></div></div></div>
      <div className="max-w-md mx-auto px-4 space-y-4 pt-2 relative z-10 pb-6">
        {/* Hero — identical to Refer & Earn */}
        <div className="hh-card hh-card-hero hh-entry-1 relative overflow-hidden">
          <div className="hh-orb hh-orb-1" aria-hidden="true"></div><div className="hh-orb hh-orb-2" aria-hidden="true"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><div className="hh-icon-ring"><Award className="h-5 w-5 text-amber-300" /></div><span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Referral Program</span></div><div className="hh-live-indicator"><span className="hh-live-dot"></span><span className="text-xs">Active</span></div></div>
            <div className="grid grid-cols-2 gap-4"><div><p className="text-xs text-gray-400 mb-1">Earn per referral</p><p className="text-3xl font-black text-white hh-fit-amount"><span className="text-sm align-top opacity-80">₦</span><span className="tracking-tight">5,000</span></p></div><div className="text-right"><p className="text-xs text-gray-400 mb-1">Potential earnings</p><div className={`transition-colors duration-300 ${isEarningsChanging ? "text-amber-200" : "text-amber-300"}`}>{formatCurrency(animatedEarnings)}</div></div></div>
            <div className="hh-progress-mini mt-4"><div className="flex items-center justify-between text-xs mb-1"><span className="text-gray-400">Referrals</span><span className="text-white font-bold">{userData?.referral_count || 0} <span className="text-gray-500">/ ∞</span></span></div><div className="hh-progress-track"><div className="hh-progress-fill" style={{ width: `${Math.min((userData?.referral_count || 0) * 2, 100)}%` }}></div></div></div>
          </div>
        </div>

        {/* Referral Link Card — identical */}
        <div className="hh-card hh-entry-2">
          <div className="flex items-center justify-between mb-4"><div className="hh-section-title">Your Referral Link</div><button onClick={cycleMessage} className="hh-change-message-btn"><TrendingUp className="h-3 w-3" /><span>Change message</span></button></div>
          <div className="hh-message-bubble mb-4"><p className="text-sm text-white/90 leading-relaxed">{activeMessage}</p></div>
          <div className="space-y-3"><div className="hh-link-container"><div className="hh-link-label">Your unique link</div><div className="hh-link-value"><span className="truncate">{origin ? `${origin}${referralLink}` : "Loading..."}</span></div></div>
            <div className="grid grid-cols-2 gap-3"><button onClick={handleCopy} className={`hh-share-btn ${copied ? "hh-share-success" : "hh-share-copy"}`}>{copied ? <><Check className="h-5 w-5" /><span>Copied!</span></> : <><Copy className="h-5 w-5" /><span>Copy Link</span></>}</button><button onClick={shareWhatsApp} className="hh-share-btn hh-share-wa"><Share2 className="h-5 w-5" /><span>Share</span></button></div>
          </div>
        </div>

        {/* Quick Share */}
        <div className="grid grid-cols-2 gap-3 hh-entry-3"><button onClick={shareWhatsApp} className="hh-action-btn hh-action-green"><span className="hh-action-icon">📱</span><span>WhatsApp</span></button><button onClick={shareTelegram} className="hh-action-btn hh-action-blue"><span className="hh-action-icon">✈️</span><span>Telegram</span></button></div>

        {/* Auto Tap Referral — stops above How It Works (no How It Works below) */}
        <div className="hh-card hh-entry-3 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-amber-500/10">
          <div className="flex items-center gap-2 mb-3"><div className="hh-icon-ring"><Users className="h-4 w-4 text-emerald-300" /></div><span className="text-xs font-black tracking-widest text-emerald-300">AUTO TAP REFERRAL — {plan.need} REQUIRED</span><span className="ml-auto text-[11px] font-bold text-white/60">{planId}</span></div>
          <h3 className="text-base font-black text-white">Referral — {plan.need} referrals</h3>
          <p className="text-xs text-white/60 mt-1">New tracking link will be generated for this plan. Referrals from this link count toward this plan AND your total. Max ₦{plan.maxEarn.toLocaleString()} when unlocked.</p>
          <div className="mt-4"><div className="flex items-center justify-between text-xs mb-1"><span className="text-white/60">Progress</span><span className="font-mono font-bold text-white">{autoRefCount}/{plan.need}</span></div><div className="hh-progress-track"><div className="hh-progress-fill" style={{ width: `${pct}%` }}></div></div></div>
          <div className="mt-4 bg-black/30 rounded-xl p-2.5 border border-white/10"><div className="text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1">Your Auto Tap referral link</div><div className="text-xs font-mono text-white break-all">{autoLink || "generating..."}</div></div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <button onClick={handleCopy} className="hh-share-btn hh-share-copy flex flex-col items-center justify-center gap-1 py-3 rounded-xl text-xs font-black">{copied ? <><Check className="h-4 w-4" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy</>}</button>
            <button onClick={shareWhatsApp} className="hh-share-btn hh-share-wa flex flex-col items-center justify-center gap-1 py-3 rounded-xl text-xs font-black"><Share2 className="h-4 w-4" /> WhatsApp</button>
            <button onClick={shareTelegram} className="hh-share-btn hh-share-tg flex flex-col items-center justify-center gap-1 py-3 rounded-xl text-xs font-black"><Send className="h-4 w-4" /> Telegram</button>
          </div>
          {autoRefCount >= plan.need ? <button onClick={()=> router.push("/dashboard")} className="w-full mt-3 rounded-full bg-emerald-500 text-white font-black py-3 text-sm">Unlock & Start Auto Tap →</button> : <p className="text-[11px] text-amber-300 mt-2 text-center">{plan.need - autoRefCount} more referral{plan.need - autoRefCount===1?"":"s"} to unlock</p>}
          <p className="text-[11px] text-white/40 mt-2 text-center">Share WhatsApp for WhatsApp, Telegram for Telegram — each opens its app.</p>
        </div>

        {/* Intentionally STOP here — no How It Works, no Stats Dashboard */}
      </div>
      <div className="hh-bottom-nav"><Link href="/dashboard" className="hh-nav-item"><span>Home</span></Link><Link href="/about" className="hh-nav-item"><span>About</span></Link><Link href="/refer" className="hh-nav-item hh-nav-active"><Users className="h-5 w-5" /><span>Refer</span></Link></div>
      <style jsx global>{`
        .hh-root { font-family: 'Syne', sans-serif; background: #050d14; color: white; min-height: 100vh; }
        .hh-bubbles-container { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
        .hh-bubble { position: absolute; border-radius: 50%; opacity: 0; animation: hh-bubble-rise linear infinite; }
        .hh-bubble-1 { width: 8px; height: 8px; left: 10%; background: radial-gradient(circle, rgba(16,185,129,0.6), transparent); animation-duration: 8s; }
        .hh-mesh-overlay { position: fixed; inset: 0; background: radial-gradient(ellipse 60% 40% at 20% 80%, rgba(16,185,129,0.07) 0%, transparent 60%), radial-gradient(ellipse 50% 50% at 80% 20%, rgba(59,130,246,0.06) 0%, transparent 60%); pointer-events: none; z-index: 0; }
        @keyframes hh-bubble-rise { 0% { transform: translateY(100vh) scale(0.5); opacity: 0; } 10% { opacity: 1; } 100% { transform: translateY(-10vh) scale(1.2); opacity: 0; } }
        .hh-header { background: linear-gradient(180deg, rgba(5,13,20,0.95) 0%, rgba(5,13,20,0.8) 100%); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(16,185,129,0.15); }
        .hh-back-btn { width: 40px; height: 40px; border-radius: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; color: white; }
        .hh-title { font-size: 20px; font-weight: 800; color: white; } .hh-subtitle { font-size: 12px; color: rgba(16,185,129,0.8); }
        .hh-reward-badge { display: flex; align-items: center; gap: 6px; background: linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05)); border: 1px solid rgba(245,158,11,0.2); border-radius: 20px; padding: 6px 12px; font-size: 11px; font-weight: 800; color: #fbbf24; }
        .hh-card { background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 20px; backdrop-filter: blur(12px); position: relative; overflow: hidden; }
        .hh-card-hero { background: linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,13,20,0.9) 50%, rgba(245,158,11,0.1) 100%); border-color: rgba(16,185,129,0.2); }
        .hh-orb { position: absolute; border-radius: 50%; filter: blur(40px); pointer-events: none; } .hh-orb-1 { width: 150px; height: 150px; background: radial-gradient(circle, rgba(16,185,129,0.2), transparent); top: -40px; right: -40px; } .hh-orb-2 { width: 100px; height: 100px; background: radial-gradient(circle, rgba(245,158,11,0.15), transparent); bottom: 20px; left: -20px; }
        .hh-icon-ring { width: 32px; height: 32px; border-radius: 10px; background: linear-gradient(135deg, rgba(16,185,129,0.2), rgba(245,158,11,0.2)); border: 1px solid rgba(245,158,11,0.3); display: flex; align-items: center; justify-content: center; }
        .hh-live-indicator { display: flex; align-items: center; gap: 6px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); border-radius: 20px; padding: 4px 10px; } .hh-live-dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 6px #10b981; }
        .hh-progress-track { height: 8px; background: rgba(255,255,255,0.08); border-radius: 9999px; overflow: hidden; } .hh-progress-fill { height: 100%; background: linear-gradient(90deg, #10b981, #34d399); border-radius: 9999px; }
        .hh-progress-mini .hh-progress-track { height: 6px; }
        .hh-section-title { font-size: 14px; font-weight: 800; color: white; } .hh-link-container { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 12px; } .hh-link-label { font-size: 11px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; } .hh-link-value { font-size: 13px; font-family: monospace; color: white; margin-top: 4px; word-break: break-all; }
        .hh-share-btn { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border-radius: 12px; font-weight: 800; font-size: 13px; border: 1px solid rgba(255,255,255,0.1); cursor: pointer; } .hh-share-copy { background: rgba(255,255,255,0.08); color: white; } .hh-share-success { background: rgba(16,185,129,0.2); color: #10b981; border-color: rgba(16,185,129,0.3); } .hh-share-wa { background: linear-gradient(135deg, #25D366, #128C7E); color: white; } .hh-share-tg { background: linear-gradient(135deg, #2AABEE, #229ED9); color: white; }
        .hh-action-btn { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px; border-radius: 16px; font-weight: 800; font-size: 14px; } .hh-action-green { background: linear-gradient(135deg, #10b981, #059669); color: white; } .hh-action-blue { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; } .hh-action-icon { font-size: 18px; }
        .hh-bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; max-width: 448px; margin: 0 auto; background: rgba(5,13,20,0.92); backdrop-filter: blur(20px); border-top: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-around; align-items: center; height: 64px; z-index: 100; } .hh-nav-item { display: flex; flex-direction: column; align-items: center; gap: 3px; color: #4b5563; text-decoration: none; font-size: 11px; font-weight: 600; padding: 8px 16px; } .hh-nav-active { color: #10b981 !important; }
        .hh-change-message-btn { display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; color: #10b981; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); border-radius: 20px; padding: 4px 8px; }
        .hh-message-bubble { background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.15); border-radius: 12px; padding: 12px; }
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

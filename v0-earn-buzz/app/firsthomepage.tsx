"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Rocket,
  LogIn,
  Sparkles,
  Users,
  Building2,
  BadgeCheck,
  Wallet,
  Trophy,
  UserPlus,
  Landmark,
  Clock3,
  Gift,
  ArrowRight,
  ShieldCheck,
  Zap,
  CircleCheck,
  TrendingUp,
  Star,
  X,
  Home,
  ClipboardCheck,
  Share2,
  Share,
  Smartphone,
  Plus,
} from "lucide-react";

export default function FirstHomepage() {
  const [showInstall, setShowInstall] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [iosExpanded, setIosExpanded] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const ios = /iPad|iPhone|iPod/.test(ua) || (typeof navigator !== "undefined" && (navigator as any).platform === "MacIntel" && (navigator as any).maxTouchPoints > 1);
    setIsIOS(ios);

    const isStandalone =
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true);
    if (isStandalone) {
      setShowInstall(false);
      return;
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const handleAppInstalled = () => {
      setShowInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    // Android with deferredPrompt -> native install; iOS -> expand card 2x with steps
    if (deferredPrompt) {
      try {
        setIsInstalling(true);
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice?.outcome === "accepted") {
          setShowInstall(false);
        }
      } catch {}
      setDeferredPrompt(null);
      setIsInstalling(false);
      return;
    }
    if (isIOS) {
      // iOS: card grows to ~2x and shows Add to Home Screen steps
      setIosExpanded((v) => !v);
      return;
    }
    // Fallback desktop/no prompt: just close banner (or could link to register)
    setShowInstall(false);
  };

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-gray-900 antialiased pb-[88px] md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-[64px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 via-emerald-500 to-amber-400 flex items-center justify-center shadow-lg shadow-emerald-200">
              <span className="text-white font-black text-[18px]">F</span>
            </div>
            <span className="font-black text-[19px] tracking-tight">
              <span className="text-emerald-600">Flash</span>
              <span className="text-gray-900">Gain</span>
              <span className="text-amber-500 text-[11px] align-super ml-0.5 font-extrabold">9ja</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden md:inline-flex px-5 py-2.5 rounded-full bg-white border border-gray-200 text-sm font-semibold hover:bg-gray-50 transition">Sign in</Link>
            <Link href="/login" className="md:hidden px-4 py-2 rounded-full bg-white border border-gray-200 text-sm font-semibold">Sign in</Link>
            <Link href="/register" className="hidden md:inline-flex px-5 py-2.5 rounded-full bg-gray-900 text-white text-sm font-bold hover:bg-black transition">Get started</Link>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 md:px-6 pt-8 md:pt-12 pb-6">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 items-start">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-xs font-semibold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> New • Get ₦20,000 welcome bonus when you join
            </div>
            <h1 className="mt-5 text-[32px] md:text-[46px] font-black tracking-tight leading-[0.95]">
              <span className="text-gray-900">Turn spare time into</span><br />
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500 bg-clip-text text-transparent">daily income —</span><br />
              <span className="text-gray-900">simply and fast.</span>
            </h1>
            <p className="mt-4 text-[15px] md:text-[17px] leading-7 text-gray-500 max-w-xl">
              FlashGain 9ja rewards everyday Nigerians for simple tasks, honest engagement and referrals — claim, invite, and cash out straight to your verified bank.
            </p>
            <div className="mt-7 flex flex-col gap-3 max-w-md">
              <Link href="/register" className="inline-flex items-center justify-center gap-2 w-full md:w-auto px-8 py-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-extrabold text-[15px] shadow-xl shadow-emerald-200 hover:shadow-emerald-300 hover:translate-y-[-1px] transition-all">
                <Rocket className="h-5 w-5" /> Get started — it&apos;s free
              </Link>
              <Link href="/login" className="inline-flex items-center justify-center gap-2 w-full md:w-auto px-8 py-4 rounded-2xl bg-white border border-gray-200 font-bold text-[15px] hover:bg-gray-50 transition shadow-sm">
                <LogIn className="h-5 w-5 text-gray-700" /> I already have an account
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3 max-w-md">
              {[{ k: "48K+", l: "Active earners", c: "text-emerald-600" },{ k: "2.1M+", l: "Tasks done", c: "text-indigo-600" },{ k: "₦520M+", l: "Paid out", c: "text-amber-600" }].map((s) => (
                <div key={s.l} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
                  <div className={`text-lg md:text-xl font-black ${s.c}`}>{s.k}</div>
                  <div className="text-[11px] font-semibold text-gray-500 mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> Verified payouts • No hidden fees • Bank-level security
            </div>
          </div>
          <div className="relative lg:pl-6">
            <div className="bg-white rounded-[28px] border border-gray-100 shadow-xl shadow-gray-200/60 p-5 md:p-6 relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-48 h-48 bg-gradient-to-br from-emerald-100 to-amber-100 rounded-full blur-2xl opacity-60" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-900 text-white grid place-items-center font-black text-sm">₦</div>
                    <span className="font-bold text-sm">Daily claim</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">LIVE</span>
                </div>
                <div className="mt-5">
                  <div className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Available to claim</div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-4xl font-black tracking-tight">₦2,000</span>
                    <span className="text-gray-400 text-sm">every 60 seconds</span>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">50 claims per cycle • resets after 5 hours</div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-[#f6f7fb] border border-gray-100 p-3">
                    <div className="w-8 h-8 rounded-xl bg-white border border-gray-100 grid place-items-center"><Zap className="h-4 w-4 text-amber-500" /></div>
                    <div className="mt-2 text-sm font-bold">Tap & Earn</div>
                    <div className="text-xs text-gray-500">Play and earn game coins</div>
                  </div>
                  <div className="rounded-2xl bg-gray-900 text-white p-3">
                    <div className="w-8 h-8 rounded-xl bg-white/10 grid place-items-center"><Gift className="h-4 w-4 text-emerald-300" /></div>
                    <div className="mt-2 text-sm font-bold">Referral bonus</div>
                    <div className="text-xs text-white/60">₦2,000 per friend</div>
                  </div>
                </div>
                <Link href="/register" className="mt-5 w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-900 text-white font-bold hover:bg-black transition">
                  Claim my bonus <ArrowRight className="h-4 w-4" />
                </Link>
                <div className="mt-3 text-center text-xs text-gray-400 flex items-center justify-center gap-1.5">
                  <Star className="h-3 w-3 text-amber-500 fill-amber-500" /> 4.8/5 from 12k+ reviews
                </div>
              </div>
            </div>
            <div className="hidden md:flex absolute -bottom-4 -left-2 bg-white rounded-2xl border border-gray-100 shadow-lg p-3 items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 grid place-items-center text-white"><TrendingUp className="h-5 w-5" /></div>
              <div><div className="text-sm font-black">+₦14,000</div><div className="text-xs text-gray-500">withdrawn today by Tolu • 2m ago</div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 md:px-6 pt-4">
        <div className="flex items-end justify-between gap-4"><h2 className="text-xl md:text-2xl font-black tracking-tight">How it works</h2><span className="text-xs font-semibold text-gray-400">4 simple steps</span></div>
        <div className="mt-4 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[{ title: "Create account", desc: "Join in 30 seconds with your name, email and phone.", icon: UserPlus, color: "bg-sky-500", num: "01" },{ title: "Do simple tasks", desc: "Claim daily rewards, tap games and micro-tasks.", icon: ClipboardCheck, color: "bg-emerald-500", num: "02" },{ title: "Invite & scale", desc: "Share your link — earn ₦2,000 per verified friend.", icon: Share2, color: "bg-amber-500", num: "03" },{ title: "Cash out fast", desc: "Withdraw to any Nigerian bank, instantly.", icon: Wallet, color: "bg-rose-500", num: "04" }].map((s) => (
            <div key={s.title} className="relative bg-white rounded-[24px] border border-gray-100 shadow-sm hover:shadow-md transition p-5 flex flex-col min-h-[160px]">
              <div className="flex items-start justify-between"><div className={`w-12 h-12 rounded-2xl ${s.color} grid place-items-center text-white shadow-md`}><s.icon className="h-6 w-6" /></div><span className="text-sm font-black text-gray-200">{s.num}</span></div>
              <div className="mt-4 font-bold text-[15px]">{s.title}</div><div className="mt-1 text-sm leading-6 text-gray-500">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 md:px-6 pt-6 grid lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-emerald-500 grid place-items-center text-white"><Trophy className="h-5 w-5" /></div><h3 className="font-black">Level up as you earn</h3></div>
          <p className="mt-3 text-sm leading-6 text-gray-500">Start at Starter and climb to Legend. Higher levels unlock more daily claims and bigger payouts — stay consistent, earn more.</p>
          <div className="mt-4 flex items-center gap-2 flex-wrap">{["Starter","Bronze","Silver","Gold","Legend"].map((l,i)=> (<span key={l} className={`px-2.5 py-1 rounded-full text-xs font-bold border ${i===4?"bg-gray-900 text-white border-gray-900":"bg-gray-50 border-gray-200 text-gray-700"}`}>{l}</span>))}</div>
          <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-emerald-600"><CircleCheck className="h-4 w-4" /> +1 level per day you complete tasks</div>
        </div>
        <div className="bg-gradient-to-br from-sky-500 to-indigo-600 rounded-[24px] p-5 text-white shadow-lg shadow-indigo-200 relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="relative"><div className="w-10 h-10 rounded-xl bg-white text-sky-600 grid place-items-center"><Users className="h-5 w-5" /></div><h3 className="mt-3 font-black text-white text-[16px]">Invite & earn</h3><p className="mt-2 text-sm leading-6 text-white/80">Share your link and get <b className="text-white">₦2,000</b> credited instantly per friend who joins and verifies — plus ongoing referral perks as they earn.</p><Link href="/register" className="mt-4 inline-flex px-4 py-2 rounded-full bg-white text-sky-700 text-sm font-bold">Copy invite link</Link></div>
        </div>
        <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-amber-400 grid place-items-center text-gray-900"><Landmark className="h-5 w-5" /></div><h3 className="font-black">Fast withdrawals</h3></div>
          <p className="mt-3 text-sm leading-6 text-gray-500">Cash out to any verified Nigerian bank account. Choose flexible amount — your earnings, your rules. No delays, no stories.</p>
          <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-gray-700"><Clock3 className="h-4 w-4 text-gray-400" /> Processed in minutes<span className="w-1 h-1 rounded-full bg-gray-300" /><ShieldCheck className="h-4 w-4 text-emerald-500" /> Bank-grade security</div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 md:px-6 pt-6">
        <h2 className="text-xl md:text-2xl font-black tracking-tight">Built for everyone</h2>
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-6 relative overflow-hidden"><div className="absolute right-4 bottom-4 opacity-[0.06]"><Users className="h-24 w-24" /></div><div className="relative"><div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-xs font-bold text-emerald-700"><Sparkles className="h-3.5 w-3.5" /> For earners</div><h3 className="mt-3 font-black text-lg">Turn gaps in your day into cash</h3><p className="mt-2 text-sm leading-6 text-gray-500">Whether you have 1 minute or 1 hour, there is a task that fits — daily claims, taps, and referrals that compound.</p></div></div>
          <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-6 relative overflow-hidden"><div className="absolute right-4 bottom-4 opacity-[0.06]"><Building2 className="h-24 w-24" /></div><div className="relative"><div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-700"><BadgeCheck className="h-3.5 w-3.5" /> For the ambitious</div><h3 className="mt-3 font-black text-lg">Grow faster by growing others</h3><p className="mt-2 text-sm leading-6 text-gray-500">Build a referral network. Help friends earn and unlock commission-style rewards as your community grows.</p></div></div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 md:px-6 pt-6 pb-8">
        <div className="rounded-[28px] bg-gradient-to-br from-emerald-600 via-indigo-600 to-sky-600 p-[1px] shadow-xl shadow-indigo-200">
          <div className="rounded-[27px] bg-gradient-to-br from-emerald-600 via-indigo-600 to-sky-600 p-6 md:p-8 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
            <div className="relative"><h2 className="text-2xl md:text-3xl font-black">Ready to start earning?</h2><p className="mt-3 text-white/80 max-w-2xl mx-auto text-sm md:text-base">Join thousands of Nigerians who turn simple actions into real money every day. Your first ₦20,000 is waiting.</p><Link href="/register" className="mt-6 inline-flex items-center justify-center px-8 py-4 rounded-2xl bg-white text-indigo-700 font-black shadow-lg hover:bg-gray-50 transition">Create free account</Link><div className="mt-3 text-xs text-white/70">No card required • Takes 30 seconds</div></div>
          </div>
        </div>
        <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <div>© {new Date().getFullYear()} FlashGain 9ja • All rights reserved.</div>
          <div className="flex items-center gap-4"><Link href="/policies?tab=privacy" className="hover:text-gray-600">Privacy Policy</Link><Link href="/policies?tab=payment" className="hover:text-gray-600">Payment Policy</Link><Link href="/policies?tab=support" className="hover:text-gray-600">Support</Link></div>
        </div>
      </section>

      {showInstall && (
        <div className="fixed bottom-[92px] md:bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-lg z-50">
          <div
            className={`bg-white rounded-[20px] border border-gray-100 shadow-2xl p-3 flex flex-col gap-3 transition-all duration-300 overflow-hidden ${iosExpanded ? "min-h-[160px]" : ""}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 via-sky-500 to-amber-400 grid place-items-center text-white font-black flex-shrink-0">
                F
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-black">Install FlashGain</div>
                <div className="text-xs text-gray-500">{isIOS && iosExpanded ? "Follow steps below" : "Add to home screen for quick access"}</div>
              </div>
              <button
                onClick={handleInstallClick}
                disabled={isInstalling}
                className="px-5 py-2.5 rounded-full bg-sky-500 text-white text-sm font-bold hover:bg-sky-600 transition flex-shrink-0 disabled:opacity-60"
              >
                {isInstalling ? "..." : isIOS && iosExpanded ? "Got it" : "Install"}
              </button>
              <button
                onClick={() => {
                  if (isIOS && iosExpanded) setIosExpanded(false);
                  else setShowInstall(false);
                }}
                className="w-8 h-8 grid place-items-center rounded-full hover:bg-gray-50 text-gray-400 flex-shrink-0"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* iOS expanded: card grows to ~2x and shows steps */}
            {isIOS && iosExpanded && (
              <div className="border-t border-gray-100 pt-3 animate-[fadeIn_0.25s_ease]">
                <p className="text-xs font-bold text-gray-700 mb-2.5 flex items-center gap-1.5">
                  <Smartphone className="h-3.5 w-3.5 text-sky-500" /> To add FlashGain on iPhone:
                </p>
                <ol className="space-y-2.5">
                  <li className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-sky-500 text-white grid place-items-center text-xs font-bold flex-shrink-0">1</span>
                    <span className="text-xs text-gray-600">
                      Tap the <Share className="inline h-3.5 w-3.5 text-sky-600 mx-0.5" /> <span className="font-semibold text-gray-800">Share</span> button in Safari&apos;s bottom bar
                    </span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-sky-500 text-white grid place-items-center text-xs font-bold flex-shrink-0">2</span>
                    <span className="text-xs text-gray-600">
                      Scroll and tap <span className="inline-flex items-center gap-1 font-semibold text-gray-800"><Plus className="h-3 w-3" /> Add to Home Screen</span>
                    </span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-sky-500 text-white grid place-items-center text-xs font-bold flex-shrink-0">3</span>
                    <span className="text-xs text-gray-600">
                      Tap <span className="font-semibold text-sky-600">Add</span> top-right to install instantly
                    </span>
                  </li>
                </ol>
                <p className="mt-3 text-[11px] text-gray-400 text-center">Then launch FlashGain from your home screen like a real app.</p>
              </div>
            )}

            {/* Android hint when no prompt yet */}
            {!isIOS && !deferredPrompt && !iosExpanded && (
              <p className="hidden">{/* placeholder for Android auto-install via prompt */}</p>
            )}
          </div>
        </div>
      )}

      {/* Fixed bottom nav — always visible */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
        <div className="grid grid-cols-5 py-2 safe-pb">
          {[{ label: "Home", icon: Home, active: true },{ label: "Tasks", icon: ClipboardCheck },{ label: "Rewards", icon: Gift },{ label: "About", icon: BadgeCheck },{ label: "Account", icon: Users }].map((it) => (
            <Link key={it.label} href={it.active ? "/" : it.label === "Tasks" ? "/task" : it.label === "Rewards" ? "/refer" : it.label === "Account" ? "/login" : "/about"} className="flex flex-col items-center gap-1 py-1">
              <it.icon className={`h-5 w-5 ${it.active ? "text-sky-600" : "text-gray-400"}`} />
              <span className={`text-[11px] font-semibold ${it.active ? "text-sky-600" : "text-gray-400"}`}>{it.label}</span>
            </Link>
          ))}
        </div>
        <div className="bg-[#f6f7fb] border-t border-gray-100 flex items-center justify-center gap-2 py-2 pb-[max(8px,env(safe-area-inset-bottom))]">
          <span className="text-xs text-gray-400">rex? •</span><span className="text-xs font-semibold text-gray-700">flashgain9ja.com.ng</span>
        </div>
      </div>
    </div>
  );
}

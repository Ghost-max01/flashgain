// app/refer/page.tsx
"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { safeParse } from "@/lib/safe-storage";
import { BottomNav } from "@/components/bottom-nav";
import {
  ArrowLeft,
  Copy,
  Share2,
  Gift,
  Users,
  Wallet,
  Send,
  ChevronRight,
  Check,
  Sparkles,
  TrendingUp,
  Award,
  Bell,
  Headphones,
  Home,
  Gamepad2,
  User,
  Clock,
  Star,
  Target,
  Flame,
  ShieldCheck,
  Trophy,
  Crown,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/referral";
import { VIP_AMOUNT, VIP_KEY, VIP_REDEEMED_KEY, REFERRAL_MIN_WITHDRAW, loadVip, saveVip } from "@/lib/referral-vip";
import { getLevel, getProgress, getNextLabel, TRUST_LEVELS, type TrustMeta, computeScore, loadMeta } from "@/lib/trust-score";

interface UserData {
  id: string;
  referral_code: string;
  referral_count: number;
  referral_balance: number;
  pending_count?: number;
  approved_count?: number;
  balance?: number;
}

export default function ReferPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#050d14] text-white/60 text-sm">Loading...</div>}>
      <ReferContent />
    </Suspense>
  );
}

function ReferContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoTapPlan = searchParams.get("autoTapPlan") as string | null;
  const [copied, setCopied] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");
  const [activeMessage, setActiveMessage] = useState("");
  const [animatedEarnings, setAnimatedEarnings] = useState(0);
  const [isEarningsChanging, setIsEarningsChanging] = useState(false);
  // First-₦500 one-time flag (form itself lives in the airtime popup)
  const [vip, setVip] = useState<{ available: number; redeemed: boolean; phone?: string; network?: string; date?: string; history: any[] }>({ available: 500, redeemed: false, history: [] });
  // referral approved/pending
  const [approvedCount, setApprovedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const isWithdrawing = useRef(false);
  // referral-withdraw airtime popup (10k+; doubles as first-₦500 VIP airtime)
  const [showAirPopup, setShowAirPopup] = useState(false);
  const [apNetwork, setApNetwork] = useState("MTN");
  const [apPhone, setApPhone] = useState("");
  const [apMsg, setApMsg] = useState("");
  const [apLoading, setApLoading] = useState(false);
  const [apClientRef, setApClientRef] = useState("");
  const getAuth = () => {
    try {
      const u = JSON.parse(localStorage.getItem("tivexx-user") || "null");
      return { uid: u?.id || u?.userId || "", notifyToken: (u as any)?.notifyToken || undefined };
    } catch { return { uid: "", notifyToken: undefined }; }
  };

  const referralMessages = [
    "Join FlashGain9ja today and cashout just like me 💸 I already withdrew ₦200K once. Click the link below to start 👇",
    "I completed tasks on FlashGain9ja and withdrew ₦250K successfully ✅ Join now with the link below.",
    "FlashGain9ja paid me ₦300K last week 🔥 Don’t miss your chance. Click the link below to join 👇",
    "I never believed online earning platforms until FlashGain9ja paid me ₦220K 💚 Click the link below to register and thank me later.",
    "Just received my ₦400K withdrawal from FlashGain9ja 💸 Click the link below and start earning.",
    "I’ve withdrawn twice already on FlashGain9ja 😭🔥 ₦200K each time. Join now with the link below.",
    "My friend introduced me to FlashGain9ja and now I’ve cashed out ₦310K. Click the link below to start.",
    "FlashGain9ja is really paying users every week 💚 I withdrew ₦280K recently. Join below 👇",
    "I used to doubt platforms like this until FlashGain9ja paid me ₦500K 💸 Click the link below to join.",
    "Imagine earning online daily and cashing out ₦230K 😭 FlashGain9ja is real. Register with the link below.",
    "I joined FlashGain9ja last month and already withdrew ₦350K 🔥 Click the link below to start.",
    "Just a reminder that FlashGain9ja has been paying consistently 💸 Join now with the link below.",
    "I completed simple tasks and withdrew ₦270K from FlashGain9ja. Click the link below and thank me later.",
    "FlashGain9ja changed my week financially 😭 I withdrew ₦450K. Register below 👇",
    "The best decision I made this month was joining FlashGain9ja 💚 Click the link below to join.",
    "FlashGain9ja paid me ₦600K after staying active consistently 🔥 Join now using the link below.",
    "My first withdrawal on FlashGain9ja was ₦200K 💸 Click the link below to start earning.",
    "I saw payment proofs on FlashGain9ja Telegram and joined immediately 😭 Click below to register.",
    "People are cashing out massively on FlashGain9ja every week 🔥 Join with the link below.",
    "FlashGain9ja users are really winning 💸 I’ve seen several ₦500K proofs. Click below to start.",
    "I thought the proofs were fake until I withdrew ₦240K myself 😭 Click the link below to join.",
    "FlashGain9ja paid my friend ₦320K this week 💚 Register now with the link below.",
    "If you’re still ignoring FlashGain9ja, you’re missing out 💸 Click below to start today.",
    "I’ve withdrawn more than once on FlashGain9ja already 🔥 Join now with the link below.",
    "Just got my ₦700K withdrawal approved on FlashGain9ja 😭💚 Click below to register.",
    "FlashGain9ja Telegram is full of payment proofs every Saturday 🔥 Click the link below to join.",
    "Users are cashing out ₦200K to ₦800K weekly on FlashGain9ja 💸 Register below and thank me later.",
    "I joined with doubts but FlashGain9ja surprised me with ₦260K withdrawal. Click below to start.",
    "FlashGain9ja paid me faster than I expected 💚 Join now with the link below.",
    "I withdrew ₦380K from FlashGain9ja simply by staying active daily. Register below 👇",
    "FlashGain9ja is one of the few platforms still paying users consistently 🔥 Click the link below to join now.",
    "I’ve seen over 10 payment proofs today alone on FlashGain9ja Telegram 👀 Register with the link below.",
    "My ₦200K withdrawal landed successfully today 💸 Click the link below to start.",
    "FlashGain9ja is not noise 😭 users are really cashing out. Join now with the link below.",
    "Last week I withdrew ₦420K from FlashGain9ja 💚 Click below to register and thank me later.",
    "My referral earnings plus task earnings got me ₦500K on FlashGain9ja 🔥 Click the link below to start.",
    "FlashGain9ja users are smiling every Saturday 💸 Join now with the link below.",
    "I finally achieved my first ₦300K withdrawal on FlashGain9ja 🔥 Register below 👇",
    "FlashGain9ja paid my roommate ₦210K this week 😭 Click the link below to join.",
    "I saw a ₦750K payment proof on FlashGain9ja Telegram today 👀 Register with the link below.",
    "FlashGain9ja users are cashing out heavily this month 💚 Click below to start earning.",
    "I never expected to earn ₦250K online this fast 😭 Join now using the link below.",
    "FlashGain9ja made online earning easier for me 💸 Click the link below to register.",
    "Just received another withdrawal alert from FlashGain9ja 🔥 Start now with the link below.",
    "My first cashout on FlashGain9ja was ₦230K 💚 Click below to join.",
    "FlashGain9ja has been trending because users are actually getting paid 💸 Register below 👇",
    "I’ve seen too many proofs on FlashGain9ja Telegram to ignore 😭 Click the link below to start.",
    "FlashGain9ja paid me ₦340K after completing tasks consistently 🔥 Join now with the link below.",
    "Another successful withdrawal on FlashGain9ja 💚 Register below and thank me later.",
    "I finally joined FlashGain9ja and I understand the hype now 🔥 Click below to start.",
    "My ₦280K withdrawal from FlashGain9ja came through successfully 💸 Join now with the link below.",
    "FlashGain9ja users are enjoying massive withdrawals lately 👀 Click the link below to register.",
    "I saw a ₦600K proof on FlashGain9ja Telegram this morning 🔥 Start with the link below.",
    "FlashGain9ja really surprised me with my first ₦200K withdrawal 💚 Join below 👇",
    "I completed tasks daily and withdrew ₦360K 💸 Click the link below to join.",
    "FlashGain9ja users are not joking with this earning opportunity 😭 Register below now.",
    "I joined FlashGain9ja late but still managed to withdraw ₦250K 🔥 Click the link below to start.",
    "Payment proofs everywhere 😭 FlashGain9ja is active. Join now using the link below.",
    "FlashGain9ja paid me ₦450K and I’m still shocked 💚 Click below to register.",
    "I saw people withdrawing ₦500K+ on FlashGain9ja Telegram 👀 Join with the link below.",
    "My FlashGain9ja withdrawal came in successfully today 🔥 Register now with the link below.",
    "FlashGain9ja users are earning serious money weekly 💸 Click below to start today.",
    "I withdrew ₦240K on FlashGain9ja just by staying consistent 💚 Join now with the link below.",
    "FlashGain9ja has been paying users massively this month 🔥 Click the link below to register.",
    "I can’t believe I finally withdrew ₦300K online 😭 Start earning with the link below.",
    "FlashGain9ja Telegram proofs convinced me to join 🔥 Click below to register now.",
    "Another Saturday, another set of huge FlashGain9ja withdrawals 💸 Join below 👇",
    "I withdrew ₦800K on FlashGain9ja and I’m grateful 💚 Click the link below to start.",
    "FlashGain9ja users are really cashing out nonstop 😭 Register with the link below.",
    "I’ve withdrawn more than ₦500K total from FlashGain9ja 🔥 Join now using the link below.",
    "FlashGain9ja paid me successfully today 💸 Click below to register.",
    "I saw multiple ₦200K+ payment proofs on FlashGain9ja Telegram 👀 Join with the link below.",
    "My task earnings on FlashGain9ja finally paid off 💚 Click below to start.",
    "I withdrew ₦270K this week from FlashGain9ja 🔥 Register now with the link below.",
    "FlashGain9ja users are smiling financially 😭 Click below to join today.",
    "Just saw another huge proof on FlashGain9ja Telegram 👀 Start with the link below.",
    "FlashGain9ja made me my first ₦400K online 💸 Join now with the link below.",
    "My withdrawal alert from FlashGain9ja entered this morning 💚 Click below to register.",
    "FlashGain9ja has been paying consistently every week 🔥 Join below 👇",
    "I withdrew ₦230K and referred my friends immediately 😭 Click the link below to start.",
    "FlashGain9ja users are cashing out real money 💸 Register now using the link below.",
    "I saw a ₦520K proof on FlashGain9ja Telegram today 🔥 Click below to join.",
    "FlashGain9ja paid my cousin ₦300K last week 💚 Register with the link below.",
    "I didn’t expect my first withdrawal to be ₦350K 😭 Start now with the link below.",
    "FlashGain9ja is really blessing users financially 💸 Click below to register.",
    "I’ve seen too many payment screenshots to doubt FlashGain9ja 🔥 Join now with the link below.",
    "FlashGain9ja paid me ₦200K without stress 💚 Click below to start earning.",
    "Another successful withdrawal alert from FlashGain9ja 🔥 Register now below.",
    "I saw users withdrawing ₦700K on FlashGain9ja Telegram 👀 Click below to join.",
    "FlashGain9ja is making many users financially active 💸 Start with the link below.",
    "I withdrew ₦260K on FlashGain9ja after completing tasks daily 💸 Click the link below to start.",
    "FlashGain9ja users are really winning this season 🔥 Register now with the link below.",
    "I saw over 10 payment proofs on FlashGain9ja Telegram today 😭 Click below to join.",
    "FlashGain9ja gave me my first ₦500K withdrawal 💚 Start now using the link below.",
    "My FlashGain9ja withdrawal came earlier than expected 💸 Click the link below to register.",
    "FlashGain9ja paid my friend ₦220K yesterday 🔥 Join below 👇",
    "I joined FlashGain9ja and withdrew within weeks 💚 Click below to start earning.",
    "FlashGain9ja users are earning massively from referrals and tasks 💸 Register now with the link below.",
    "Just received my ₦300K withdrawal successfully 😭 Click below to join today.",
    "FlashGain9ja Telegram is full of payment alerts 🔥 Start now with the link below.",
    "I withdrew ₦250K and immediately told my friends about FlashGain9ja 💚 Click the link below to register.",
    "FlashGain9ja paid me twice already 💸 Join below 👇",
    "I finally joined FlashGain9ja after seeing many proofs 👀 Click the link below to start.",
    "FlashGain9ja users are withdrawing daily 🔥 Register now using the link below.",
    "My first FlashGain9ja cashout changed my mindset 💚 Click below to join.",
    "I saw a ₦650K proof on FlashGain9ja Telegram 😭 Start now with the link below.",
    "FlashGain9ja paid my ₦280K withdrawal successfully 💸 Click below to register.",
    "Another happy user on FlashGain9ja 🔥 Join with the link below.",
    "FlashGain9ja users are really cashing out every Saturday 💚 Click below to start earning.",
    "I withdrew ₦200K faster than I imagined 😭 Register now with the link below.",
    "FlashGain9ja has been paying consistently this year 💸 Click below to join.",
    "I saw someone withdraw ₦800K on FlashGain9ja Telegram 👀 Start now using the link below.",
    "FlashGain9ja made online earning easier for me 🔥 Click below to register.",
    "My withdrawal alert from FlashGain9ja finally arrived 💚 Join now with the link below.",
    "I’ve withdrawn multiple times already on FlashGain9ja 💸 Click the link below to start.",
    "FlashGain9ja users are making serious money weekly 😭 Register below 👇",
    "I saw payment proofs all over FlashGain9ja Telegram today 🔥 Click below to join.",
    "FlashGain9ja paid me ₦330K successfully 💚 Start now with the link below.",
    "My friend joined FlashGain9ja and withdrew ₦240K 💸 Click below to register.",
    "FlashGain9ja users are enjoying massive payouts 🔥 Join now using the link below.",
    "I withdrew ₦370K on FlashGain9ja recently 💚 Click below to start.",
    "FlashGain9ja Telegram proofs convinced me completely 💸 Register now with the link below.",
    "My FlashGain9ja withdrawal landed this morning 😭 Click below to join.",
    "FlashGain9ja users are really active financially 🔥 Start now using the link below.",
    "I finally achieved my first ₦200K withdrawal 💚 Click below to register.",
    "FlashGain9ja paid my referral earnings successfully 💸 Join with the link below.",
    "I saw huge payment proofs on FlashGain9ja Telegram today 👀 Click below to start.",
    "FlashGain9ja is becoming one of my favorite earning platforms 🔥 Register now with the link below.",
    "I withdrew ₦410K this month from FlashGain9ja 💚 Click below to join.",
    "FlashGain9ja users are smiling to the bank 💸 Start now using the link below.",
    "I joined FlashGain9ja after seeing many successful withdrawals 😭 Click below to register.",
    "FlashGain9ja paid me ₦290K successfully 🔥 Join now with the link below.",
    "Another successful Saturday withdrawal on FlashGain9ja 💚 Click below to start earning.",
    "FlashGain9ja users are really getting paid weekly 💸 Register below 👇",
    "I saw multiple ₦300K+ proofs on FlashGain9ja Telegram 👀 Click the link below to join.",
    "FlashGain9ja paid me more than I expected 🔥 Start now using the link below.",
    "My first withdrawal on FlashGain9ja was successful 💚 Click below to register.",
    "FlashGain9ja users are cashing out without stress 💸 Join now with the link below.",
    "I withdrew ₦520K after staying active consistently 😭 Click below to start.",
    "FlashGain9ja Telegram is always active with proofs 🔥 Register now using the link below.",
    "FlashGain9ja paid my ₦200K withdrawal this week 💚 Click below to join.",
    "I saw a ₦780K payment proof on FlashGain9ja Telegram 👀 Start now with the link below.",
    "FlashGain9ja users are earning daily from tasks 💸 Click below to register.",
    "My withdrawal alert entered successfully from FlashGain9ja 🔥 Join now with the link below.",
    "FlashGain9ja is changing lives financially 💚 Click below to start earning.",
    "I withdrew ₦340K from FlashGain9ja this month 😭 Register now with the link below.",
    "FlashGain9ja users are really winning big 💸 Click below to join today.",
    "I saw many successful payment screenshots today on FlashGain9ja Telegram 🔥 Start now with the link below.",
    "FlashGain9ja paid me successfully again 💚 Click below to register.",
    "Join FlashGain9ja today and stand a chance to be among the next successful withdrawals 💸 Click the link below to start.",
  ];

  // Animate earnings: withdrawable (approved) only — pending stays in potential card
  useEffect(() => {
    if (!userData) return;

    const targetEarnings = userData.referral_balance;
    if (targetEarnings === animatedEarnings) return;

    const difference = targetEarnings - animatedEarnings;
    const steps = 30;
    const increment = difference / steps;

    setIsEarningsChanging(true);

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      setAnimatedEarnings((prev) => {
        const newValue = prev + increment;
        if (currentStep >= steps) {
          clearInterval(timer);
          setIsEarningsChanging(false);
          return targetEarnings;
        }
        return Math.round(newValue);
      });
    }, 16);

    return () => clearInterval(timer);
  }, [userData]);

  useEffect(() => {
    setOrigin(window.location.origin);

    // Backward-compat: old shared links used /refer?ref=CODE (should be /register?ref=CODE).
    // Persist the code and send logged-out visitors to /register so attribution isn't lost.
    try {
      const keys = ["ref", "referral", "referral_code", "code", "r"];
      let incomingRef = "";
      for (const k of keys) {
        const v = searchParams.get(k);
        if (v && v.trim()) { incomingRef = v.trim().toUpperCase().replace(/\s+/g, ""); break; }
      }
      if (incomingRef) {
        try {
          localStorage.setItem("tivexx-pending-ref", incomingRef);
          document.cookie = `pending_ref=${encodeURIComponent(incomingRef)}; path=/; max-age=${60 * 60 * 24 * 30}`;
        } catch {}
      }
      const storedUserFirst = localStorage.getItem("tivexx-user");
      if (!storedUserFirst && incomingRef) {
        router.push(`/register?ref=${encodeURIComponent(incomingRef)}`);
        return;
      }
    } catch {}

    // load VIP state
    try {
      const v = loadVip();
      // seed if missing (first login gets 500)
      if (!localStorage.getItem(VIP_KEY) && !localStorage.getItem(VIP_REDEEMED_KEY)) {
        saveVip({ available: 500, redeemed: false, history: [] });
        setVip({ available: 500, redeemed: false, history: [] });
      } else setVip(v);
    } catch {}

    // Set initial random message
    setActiveMessage(
      referralMessages[Math.floor(Math.random() * referralMessages.length)],
    );

    const storedUser = localStorage.getItem("tivexx-user");
    if (!storedUser) {
      router.push("/login");
      return;
    }

    const user = JSON.parse(storedUser);
    const userId = user.id || user.userId;

    fetch(`/api/referral-stats?userId=${userId}&t=${Date.now()}`)
      .then((r) => r.json())
      .then((data) => {
        let balance = 50000;
        const stored = localStorage.getItem("tivexx-user");
        if (stored) {
          const u = JSON.parse(stored);
          const localBal = u.balance || 50000;
          const refEarned = data.referral_balance || 0;
          const lastSync =
            localStorage.getItem("tivexx-last-synced-referrals") || "0";
          const newEarned = Math.max(0, refEarned - parseInt(lastSync));
          balance = localBal + newEarned;
          u.balance = balance;
          localStorage.setItem("tivexx-user", JSON.stringify(u));
          if (newEarned > 0) {
            localStorage.setItem(
              "tivexx-last-synced-referrals",
              refEarned.toString(),
            );
          }
        }

        setUserData({
          id: userId,
          referral_code: data.referral_code,
          referral_count: data.referral_count,
          referral_balance: data.referral_balance,
          pending_count: data.pending_count || 0,
          approved_count: data.approved_count ?? data.referral_count,
          balance,
        });
        setApprovedCount(data.approved_count ?? 0);
        setPendingCount(data.pending_count || 0);

        setAnimatedEarnings(data.referral_balance || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // Poll every 30s to auto-promote pending -> approved when friend hits Beginner 30
    // Non-destructive: skip poll update while a withdraw request is in flight
    const poll = setInterval(() => {
      try {
        if (isWithdrawing.current) return;
        const su = localStorage.getItem("tivexx-user");
        if (!su) return;
        const u = JSON.parse(su);
        const uid = u.id || u.userId;
        if (!uid) return;
        fetch(`/api/referral-stats?userId=${uid}&t=${Date.now()}`)
          .then((r) => r.json())
          .then((data) => {
            setUserData((prev) =>
              prev
                ? {
                    ...prev,
                    referral_count: data.referral_count ?? prev.referral_count,
                    referral_balance: data.referral_balance ?? prev.referral_balance,
                    pending_count: data.pending_count ?? 0,
                    approved_count: data.approved_count ?? 0,
                  }
                : prev
            );
            setApprovedCount(data.approved_count ?? 0);
            setPendingCount(data.pending_count ?? 0);
          })
          .catch(() => {});
      } catch {}
    }, 30000);
    return () => clearInterval(poll);
  }, [router]);

  const referralLink = userData?.referral_code
    ? `/register?ref=${userData.referral_code}`
    : "/register";

  const getFullReferralLink = () => {
    const effOrigin = origin || (typeof window !== "undefined" ? window.location.origin : "");
    if (!userData?.referral_code || !effOrigin) return "";
    return `${effOrigin}/register?ref=${userData.referral_code}`;
  };

  const handleCopy = () => {
    const linkOnly = getFullReferralLink();
    if (!linkOnly) return;
    navigator.clipboard.writeText(linkOnly);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const linkOnly = getFullReferralLink();
    if (!linkOnly) return;
    const msg = `${activeMessage}\n\nSign up here: ${linkOnly}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const shareTelegram = () => {
    const linkOnly = getFullReferralLink();
    if (!linkOnly) return;
    const msg = `${activeMessage}\n\nSign up here: ${linkOnly}`;
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(linkOnly)}&text=${encodeURIComponent(msg)}`,
      "_blank",
    );
  };

  const cycleMessage = () => {
    const currentIndex = referralMessages.indexOf(activeMessage);
    const nextIndex = (currentIndex + 1) % referralMessages.length;
    setActiveMessage(referralMessages[nextIndex]);
  };

  const formatCurrency = (amount: number) => {
    const formatted = new Intl.NumberFormat("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

    // Calculate font size based on number of digits (shrinks for larger amounts)
    const numDigits = formatted.split(".")[0].replace(/,/g, "").length;
    const baseSize = 1.75; // rem
    const minSize = 1.0; // rem
    const sizePerDigit = 0.15; // rem reduction per digit
    const fontSize = Math.max(
      minSize,
      baseSize - (numDigits - 4) * sizePerDigit,
    );

    return (
      <span
        className="font-mono inline-flex items-baseline"
        style={{ fontSize: `${fontSize}rem` }}
      >
        <span className="text-[0.6em] align-top opacity-80">₦</span>
        <span className="font-black tracking-tight">
          {formatted.split(".")[0]}
        </span>
        <span className="text-[0.6em] opacity-60">
          .{formatted.split(".")[1] || "00"}
        </span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050d14]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-ping"></div>
            <div
              className="absolute inset-2 rounded-full border-2 border-emerald-400/50 animate-ping"
              style={{ animationDelay: "0.3s" }}
            ></div>
            <div className="absolute inset-4 rounded-full bg-emerald-500/20 animate-pulse"></div>
          </div>
          <p className="text-emerald-400 text-sm font-medium tracking-widest uppercase">
            Loading
          </p>
        </div>
      </div>
    );
  }

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

      {/* Header */}
      <div className="sticky top-0 z-10 hh-header">
        <div className="max-w-md mx-auto px-6 pt-8 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link href="/dashboard">
                <button className="hh-back-btn">
                  <ArrowLeft className="h-5 w-5" />
                </button>
              </Link>
              <div className="ml-3">
                <h1 className="hh-title">Refer & Earn</h1>
                <p className="hh-subtitle">Invite friends, earn rewards</p>
              </div>
            </div>
            <div className="hh-reward-badge">
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span>each ₦500</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 space-y-4 pt-2 relative z-10 pb-6">
        {/* Hero Card — first thing on the page. The first-₦500 VIP form now
            lives inside the Withdraw-as-airtime popup below, not as a card. */}

        {/* Hero Card */}
        <div className="hh-card hh-card-hero hh-entry-1 relative overflow-hidden">
          <div className="hh-orb hh-orb-1" aria-hidden="true"></div>
          <div className="hh-orb hh-orb-2" aria-hidden="true"></div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="hh-icon-ring">
                  <Award className="h-5 w-5 text-amber-300" />
                </div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Referral Program
                </span>
              </div>
              <div className="hh-live-indicator">
                <span className="hh-live-dot"></span>
                <span className="text-xs">Active</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Earn per referral</p>
                <p className="text-3xl font-black text-white hh-fit-amount">
                  <span className="text-sm align-top opacity-80">₦</span>
                  <span className="tracking-tight">500</span>
                </p>
                <p className="text-[10px] text-emerald-300 font-bold mt-1">Approved only when friend reaches Beginner (30+)</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-1">Approved earnings</p>
                <div
                  className={`transition-colors duration-300 ${isEarningsChanging ? "text-amber-200" : "text-amber-300"}`}
                >
                  {formatCurrency(animatedEarnings)}
                </div>
              </div>
            </div>

            <div className="hh-progress-mini mt-4">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-400">Approved <span className="text-emerald-400 font-black">{approvedCount}</span> • Pending <span className="text-amber-300 font-black">{pendingCount}</span></span>
                <span className="text-white font-bold">
                  {userData?.referral_count || 0}{" "}
                  <span className="text-gray-500">/ ∞</span>
                </span>
              </div>
              <div className="hh-progress-track">
                <div
                  className="hh-progress-fill"
                  style={{
                    width: `${Math.min((approvedCount || 0) * 5, 100)}%`,
                  }}
                ></div>
              </div>
              <div className="text-[11px] text-white/50 mt-1">✅ Approved = friend reached Beginner (Trust 30+). Pending referrals don't pay yet.</div>
            </div>
            {/* Referral withdraw — airtime or cash, min 10k after first ₦500 */}
            {(() => {
              const min = vip.redeemed ? REFERRAL_MIN_WITHDRAW : 500;
              // Server truth: referral_balance is approved-only once loaded; fall back to approvedCount*500 pre-load
              const avail = (userData?.referral_balance ?? (approvedCount || 0) * 500);
              const canWithdraw = avail >= min;
              const openAirPopup = () => {
                try {
                  const r = (typeof crypto !== "undefined" && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
                  setApClientRef(r);
                } catch { setApClientRef(`${Date.now()}-${Math.floor(Math.random() * 1e9)}`); }
                setApMsg(""); setShowAirPopup(true);
              };
              return (
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="mb-2">
                    <div className="text-xs font-black text-white">Referral Withdraw</div>
                    <div className="text-[11px] text-white/60">Available: <span className="text-emerald-300 font-black">₦{avail.toLocaleString()}</span> • Min: ₦{min.toLocaleString()} {vip.redeemed ? "(20 referrals)" : "(first ₦500)"}</div>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <button disabled={!canWithdraw} onClick={openAirPopup} className={`w-full rounded-full font-black py-2.5 text-sm ${canWithdraw ? "bg-gradient-to-r from-amber-500 to-emerald-500 text-black" : "bg-white/10 text-white/40 cursor-not-allowed"}`}>
                      Withdraw as airtime
                    </button>
                    <button disabled={!canWithdraw} onClick={async ()=>{
                    const { uid, notifyToken } = getAuth();
                    if(!uid) return;
                    // simple local withdraw: require bank set
                    const bd = (()=>{ try{ return JSON.parse(localStorage.getItem("bank_details")||"null") }catch{return null}})();
                    if(!bd) { window.location.href="/setup-bank"; return; }
                    isWithdrawing.current = true;
                    try{
                      const res = await fetch("/api/referral-withdraw",{method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ userId: uid, amount: avail, notifyToken })});
                      const j = await res.json();
                      if(!res.ok){ alert(j.error||"Withdraw failed"); return; }
                      alert("Referral withdrawal requested: ₦"+avail.toLocaleString());
                      // Local mirror for Profile → History → Referrals tab.
                      try {
                        const prev = JSON.parse(localStorage.getItem("tivexx-referral-withdrawals") || "[]");
                        prev.unshift({ id: `${Date.now()}-${Math.floor(Math.random()*1e9)}`, amount: avail, date: new Date().toISOString() });
                        localStorage.setItem("tivexx-referral-withdrawals", JSON.stringify(prev.slice(0, 200)));
                      } catch {}
                      const nb = Number(j.referral_balance ?? j.available ?? 0);
                      const nac = Number(j.approved_count ?? j.approvedCount ?? 0);
                      setAnimatedEarnings(nb);
                      setUserData((prev:any)=> prev ? { ...prev, referral_balance: nb, approved_count: nac } : prev);
                      setApprovedCount(nac);
                      // First withdrawal (any method) consumes the one-time slot.
                      if (!vip.redeemed) {
                        const next = { available: 0, redeemed: true, phone: "", network: "", date: new Date().toISOString(), history: [...vip.history] };
                        saveVip(next); setVip(next);
                      }
                    } finally { isWithdrawing.current = false; }
                  }} className={`w-full rounded-full font-black py-2.5 text-sm ${canWithdraw ? "bg-emerald-500 text-white" : "bg-white/10 text-white/40 cursor-not-allowed"}`}>
                    {canWithdraw ? "Withdraw as cash" : `Need ₦${min.toLocaleString()}`}
                  </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Withdraw-as-airtime popup (same page, no navigation) */}
        {showAirPopup && (() => {
          const apAvail = (userData?.referral_balance ?? (approvedCount || 0) * 500);
          const apMin = vip.redeemed ? REFERRAL_MIN_WITHDRAW : 500;
          const apCan = apAvail >= apMin && apPhone.length === 11 && !apLoading;
          return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => { if (!apLoading) setShowAirPopup(false); }}>
              <div className="hh-popup max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-base font-black text-white">Withdraw as Airtime</div>
                  <button onClick={() => { if (!apLoading) setShowAirPopup(false); }} className="text-white/50 hover:text-white font-black px-2" aria-label="Close">✕</button>
                </div>
                <div className="text-xs text-white/60 mb-3">Amount: <span className="text-amber-300 font-black">₦{(vip.redeemed ? apAvail : 500).toLocaleString()}</span> {vip.redeemed ? "• min ₦10,000" : "• one-time first ₦500"}</div>
                {!vip.redeemed && <div className="text-[11px] text-white/50 -mt-2 mb-3">Your first-withdrawal balance: <span className="text-amber-300 font-black">₦500</span> • one-time only, airtime or cash</div>}
                <div className="grid grid-cols-2 gap-2">
                  <select value={apNetwork} onChange={(e) => setApNetwork(e.target.value)} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm font-bold text-white outline-none">
                    <option className="text-black" value="MTN">MTN</option>
                    <option className="text-black" value="GLO">GLO</option>
                    <option className="text-black" value="AIRTEL">AIRTEL</option>
                    <option className="text-black" value="9MOBILE">9MOBILE</option>
                  </select>
                  <input inputMode="numeric" placeholder="080..." value={apPhone} onChange={(e) => setApPhone(e.target.value.replace(/\D/g, "").slice(0, 11))} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm font-bold text-white placeholder:text-white/30 outline-none" />
                </div>
                {apMsg && <div className={`mt-2 text-xs font-bold ${apMsg.startsWith("Airtime sent") ? "text-emerald-300" : "text-amber-300"}`}>{apMsg}</div>}
                <button disabled={!apCan} onClick={async () => {
                  setApMsg(""); setApLoading(true);
                  try {
                    const { uid, notifyToken } = getAuth();
                    if (!uid) throw new Error("Login first");
                    if (!vip.redeemed) {
                      const res = await fetch("/api/airtime", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: uid, phone: apPhone, network: apNetwork, amount: 500 }) });
                      const j = await res.json().catch(() => ({}));
                      if (!res.ok) throw new Error(j.error || "Failed");
                      const next = { available: 0, redeemed: true, phone: apPhone, network: apNetwork, date: new Date().toISOString(), history: [...vip.history, { phone: apPhone, network: apNetwork, date: new Date().toISOString(), status: "success", amount: 500 }] };
                      saveVip(next); setVip(next);
                      setApMsg(`Airtime sent to ${apPhone} ✓`);
                      setTimeout(() => setShowAirPopup(false), 1200);
                    } else {
                      const res = await fetch("/api/referral-airtime", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: uid, notifyToken, phone: apPhone, network: apNetwork, amount: apAvail, clientRef: apClientRef }) });
                      const j = await res.json().catch(() => ({}));
                      if (!res.ok) throw new Error(j.error || "Failed");
                      const nb = Number(j.referral_balance ?? j.available ?? 0);
                      const nac = Number(j.approved_count ?? j.approvedCount ?? 0);
                      setAnimatedEarnings(nb);
                      setUserData((prev: any) => prev ? { ...prev, referral_balance: nb, approved_count: nac } : prev);
                      setApprovedCount(nac);
                      setApMsg(`Airtime sent to ${apPhone} ✓`);
                      setTimeout(() => setShowAirPopup(false), 1200);
                    }
                  } catch (e: any) {
                    setApMsg(`Pending — ${(e as any)?.message || "try again"}`);
                  }
                  setApLoading(false);
                }} className={`w-full mt-3 rounded-full font-black py-3 text-sm ${apCan ? "bg-gradient-to-r from-amber-500 to-emerald-500 text-black" : "bg-white/10 text-white/40 cursor-not-allowed"}`}>
                  {apLoading ? "Sending..." : `Withdraw ${(vip.redeemed ? apAvail : 500).toLocaleString()} Airtime →`}
                </button>
                <button onClick={() => { if (!apLoading) setShowAirPopup(false); }} className="w-full mt-2 rounded-full border border-white/15 text-white font-bold py-2.5 text-sm">Close</button>
                {!vip.redeemed && <div className="text-[11px] text-white/50 text-center mt-2">One-time only. After this, minimum is <b className="text-white">₦10,000</b> (20 referrals).</div>}
              </div>
            </div>
          );
        })()}

        {/* Referral Link Card */}
        <div className="hh-card hh-entry-2">
          <div className="flex items-center justify-between mb-4">
            <div className="hh-section-title">Your Referral Link</div>
            <button onClick={cycleMessage} className="hh-change-message-btn">
              <TrendingUp className="h-3 w-3" />
              <span>Change message</span>
            </button>
          </div>

          <div className="hh-message-bubble mb-4">
            <p className="text-sm text-white/90 leading-relaxed">
              {activeMessage}
            </p>
          </div>

          <div className="space-y-3">
            <div className="hh-link-container">
              <div className="hh-link-label">Your unique link</div>
              <div className="hh-link-value">
                <span className="truncate">
                  {getFullReferralLink() || "Loading your referral link..."}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                disabled={!getFullReferralLink()}
                onClick={handleCopy}
                className={`hh-share-btn ${copied ? "hh-share-success" : "hh-share-copy"} ${!getFullReferralLink() ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {copied ? (
                  <>
                    <Check className="h-5 w-5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-5 w-5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              <button
                disabled={!getFullReferralLink()}
                onClick={shareWhatsApp}
                className={`hh-share-btn hh-share-wa ${!getFullReferralLink() ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Share2 className="h-5 w-5" />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Share Buttons */}
        <div className="grid grid-cols-2 gap-3 hh-entry-3">
          <button
            disabled={!getFullReferralLink()}
            onClick={shareWhatsApp}
            className={`hh-action-btn hh-action-green ${!getFullReferralLink() ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <span className="hh-action-icon">📱</span>
            <span>WhatsApp</span>
          </button>
          <button
            disabled={!getFullReferralLink()}
            onClick={shareTelegram}
            className={`hh-action-btn hh-action-blue ${!getFullReferralLink() ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <span className="hh-action-icon">✈️</span>
            <span>Telegram</span>
          </button>
        </div>

        {/* Auto Tap Referral — separate page/section above How It Works */}
        <AutoTapReferralSection autoTapPlan={autoTapPlan} origin={origin} referralLink={referralLink} userData={userData} />

        {/* How It Works */}
        <div className="hh-card hh-entry-4">
          <div className="hh-section-title mb-4">How It Works</div>
          <div className="space-y-3">
            {[
              {
                icon: "🔗",
                title: "Share Your Link",
                desc: "Share your unique referral link with friends",
                color: "emerald",
              },
              {
                icon: "👥",
                title: "They Sign Up",
                desc: "Friends register using your referral code",
                color: "green",
              },
              {
                icon: "💰",
                title: "Earn Rewards",
                desc: "Count adds instantly • ₦500 pending until friend hits Beginner (30+)",
                color: "emerald",
              },
              {
                icon: "⭐",
                title: "Approved on Beginner",
                desc: "₦500 becomes withdrawable when friend reaches Trust 30+",
                color: "amber",
                highlight: true,
              },
            ].map((step, idx) => (
              <div
                key={idx}
                className={`hh-step-item ${step.highlight ? "hh-step-highlight" : ""}`}
                style={{ animationDelay: `${idx * 100 + 400}ms` }}
              >
                <div className={`hh-step-icon hh-step-${step.color}`}>
                  <span className="text-xl">{step.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="hh-step-number">Step {idx + 1}</span>
                    {step.highlight && (
                      <span className="hh-step-badge">Important</span>
                    )}
                  </div>
                  <h4 className="hh-step-title">{step.title}</h4>
                  <p className="hh-step-desc">{step.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-600" />
              </div>
            ))}
          </div>
        </div>

        {/* Your Performance */}
        <div className="hh-card hh-entry-5">
          <div className="hh-section-title text-center mb-5">
            Your Performance
          </div>

          {/* Successful — pending-box type, done icon, green count */}
          <div className="hh-pending-card !bg-emerald-500/10 !border-emerald-500/25 mb-3">
            <div className="flex items-center gap-3">
              <div className="hh-pending-icon !bg-emerald-500/15 !border-emerald-500/30">
                <Check className="h-5 w-5 text-emerald-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-white">
                    Successful verification
                  </span>
                  <span className="text-2xl font-black text-emerald-300 leading-none">
                    {approvedCount}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-400">
                    Total earning
                  </span>
                  <span className="text-emerald-300">
                    {formatCurrency(approvedCount * 500)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Pending Referrals */}
          <div className="hh-pending-card">
            <div className="flex items-center gap-3">
              <div className="hh-pending-icon">
                <Clock className="h-5 w-5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-amber-200/80">
                    Pending verification
                  </span>
                  <span className="text-lg font-bold text-amber-300">
                    {pendingCount}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-400">
                    Potential earnings
                  </span>
                  <span className="text-sm font-bold text-emerald-400">
                    {formatCurrency(pendingCount * 500)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Verified Referrers */}
        <div className="hh-card hh-entry-5">
          <div className="flex items-center gap-3">
            <div className="hh-pending-icon !bg-emerald-500/15 !border-emerald-500/30">
              <Users className="h-5 w-5 text-emerald-300" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-black text-white">Verified referrers</div>
              <div className="flex items-end justify-between mt-1">
                <span className="text-3xl font-black text-amber-300 leading-none">{approvedCount}</span>
                <span className="text-emerald-300">{formatCurrency(approvedCount * 500)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Unverified Referrers */}
        <div className="hh-card hh-entry-6">
          <div className="flex items-center gap-3">
            <div className="hh-pending-icon">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-black text-white">Unverified referrers</div>
              <div className="text-[11px] text-white/45">Only the balance is unverified — activates at Beginner</div>
              <div className="flex items-end justify-between mt-1">
                <span className="text-3xl font-black text-amber-300 leading-none">{pendingCount}</span>
                <span className="text-emerald-300">{formatCurrency(pendingCount * 500)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pro Tip */}
        <div className="hh-card hh-tip-card hh-entry-6">
          <div className="flex items-start gap-3">
            <div className="hh-tip-icon">
              <Sparkles className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">Pro Tip</h4>
              <p className="text-sm text-emerald-200/80">
                Share your link on social media and messaging platforms to
                maximize your earnings. Each successful referral earns you
                ₦500 once approved (friend reaches Beginner 30+)!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />

      <style jsx global>{`
        /* ─── IMPORT FONT ─── */
        @import url("https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap");

        /* ─── ROOT & BACKGROUND ─── */
        .hh-root {
          font-family: "Syne", sans-serif;
          background: #050d14;
          color: white;
          min-height: 100vh;
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
            rgba(59, 130, 246, 0.4),
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
            rgba(59, 130, 246, 0.3),
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
        .hh-header {
          background: linear-gradient(
            180deg,
            rgba(5, 13, 20, 0.95) 0%,
            rgba(5, 13, 20, 0.8) 100%
          );
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(16, 185, 129, 0.15);
        }

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
          transition: all 0.2s ease;
          cursor: pointer;
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
        }

        .hh-reward-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(
            135deg,
            rgba(16, 185, 129, 0.15),
            rgba(245, 158, 11, 0.15)
          );
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 30px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 700;
          color: #fbbf24;
        }

        /* ─── CARDS ─── */
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

        .hh-card:hover {
          transform: translateY(-2px);
          box-shadow:
            0 20px 60px rgba(0, 0, 0, 0.4),
            0 0 30px rgba(16, 185, 129, 0.05);
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

        .hh-card-hero {
          background: linear-gradient(
            135deg,
            rgba(16, 185, 129, 0.2) 0%,
            rgba(5, 13, 20, 0.9) 50%,
            rgba(245, 158, 11, 0.1) 100%
          );
          border-color: rgba(16, 185, 129, 0.3);
        }

        /* ─── ORBS ─── */
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

        .hh-orb-2 {
          width: 100px;
          height: 100px;
          background: radial-gradient(
            circle,
            rgba(245, 158, 11, 0.15),
            transparent
          );
          bottom: 20px;
          left: -20px;
          animation: hh-orb-float 8s ease-in-out infinite reverse;
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

        /* ─── ICON RING ─── */
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

        /* ─── LIVE INDICATOR ─── */
        .hh-live-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 20px;
          padding: 4px 10px;
        }

        .hh-live-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 6px #10b981;
          animation: hh-live-pulse 1.5s ease-in-out infinite;
        }

        @keyframes hh-live-pulse {
          0%,
          100% {
            box-shadow: 0 0 4px #10b981;
            transform: scale(1);
          }
          50% {
            box-shadow:
              0 0 10px #10b981,
              0 0 20px rgba(16, 185, 129, 0.4);
            transform: scale(1.15);
          }
        }

        /* ─── PROGRESS MINI ─── */
        .hh-progress-mini {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 12px;
        }

        .hh-progress-track {
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          overflow: hidden;
        }

        .hh-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #10b981, #fbbf24);
          border-radius: 10px;
          transition: width 0.5s ease;
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
        }

        /* ─── SECTION TITLE ─── */
        .hh-section-title {
          font-size: 15px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.01em;
        }

        /* ─── CHANGE MESSAGE BUTTON ─── */
        .hh-change-message-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 6px 12px;
          font-size: 11px;
          font-weight: 600;
          color: #10b981;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .hh-change-message-btn:hover {
          background: rgba(16, 185, 129, 0.1);
          border-color: rgba(16, 185, 129, 0.3);
          transform: translateY(-1px);
        }

        /* ─── MESSAGE BUBBLE ─── */
        .hh-message-bubble {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 16px;
          padding: 16px;
          position: relative;
          animation: hh-message-pulse 2s ease-in-out infinite;
        }

        @keyframes hh-message-pulse {
          0%,
          100% {
            border-color: rgba(16, 185, 129, 0.2);
          }
          50% {
            border-color: rgba(16, 185, 129, 0.4);
            box-shadow: 0 0 20px rgba(16, 185, 129, 0.1);
          }
        }

        .hh-message-bubble::before {
          content: "";
          position: absolute;
          bottom: -8px;
          left: 20px;
          width: 16px;
          height: 16px;
          background: rgba(0, 0, 0, 0.3);
          border-right: 1px solid rgba(16, 185, 129, 0.2);
          border-bottom: 1px solid rgba(16, 185, 129, 0.2);
          transform: rotate(45deg);
          border-radius: 2px;
        }

        /* ─── LINK CONTAINER ─── */
        .hh-link-container {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          padding: 12px;
        }

        .hh-link-label {
          font-size: 11px;
          color: #10b981;
          margin-bottom: 4px;
          font-weight: 600;
        }

        .hh-link-value {
          font-family: "JetBrains Mono", monospace;
          font-size: 13px;
          color: white;
          background: rgba(255, 255, 255, 0.03);
          padding: 8px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          overflow-x: auto;
          white-space: nowrap;
        }

        /* ─── SHARE BUTTONS ─── */
        .hh-share-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          border-radius: 14px;
          font-weight: 700;
          font-size: 14px;
          transition: all 0.2s ease;
          cursor: pointer;
          border: none;
        }

        .hh-share-copy {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
        }

        .hh-share-success {
          background: #059669;
          color: white;
        }

        .hh-share-wa {
          background: linear-gradient(135deg, #25d366, #128c7e);
          color: white;
          box-shadow: 0 4px 15px rgba(37, 211, 102, 0.3);
        }

        .hh-share-btn:hover {
          transform: translateY(-2px);
          filter: brightness(1.1);
        }

        .hh-share-btn:active {
          transform: scale(0.97);
        }

        /* ─── ACTION BUTTONS ─── */
        .hh-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 16px;
          border-radius: 16px;
          font-weight: 700;
          font-size: 15px;
          transition: all 0.2s ease;
          cursor: pointer;
          border: none;
          color: white;
          animation: hh-card-appear 0.4s ease-out both;
        }

        .hh-action-btn:hover {
          transform: translateY(-2px) scale(1.02);
        }

        .hh-action-btn:active {
          transform: scale(0.98);
        }

        .hh-action-green {
          background: linear-gradient(135deg, #059669, #047857);
          box-shadow: 0 4px 20px rgba(5, 150, 105, 0.3);
        }

        .hh-action-blue {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          box-shadow: 0 4px 20px rgba(37, 99, 235, 0.3);
        }

        .hh-action-icon {
          font-size: 20px;
        }

        /* ─── STEP ITEMS ─── */
        .hh-step-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          transition: all 0.2s ease;
          animation: hh-card-appear 0.4s ease-out both;
        }

        .hh-step-item:hover {
          background: rgba(255, 255, 255, 0.06);
          transform: translateX(4px);
        }

        .hh-step-highlight {
          background: linear-gradient(
            135deg,
            rgba(245, 158, 11, 0.15),
            rgba(245, 158, 11, 0.05)
          );
          border: 2px solid rgba(245, 158, 11, 0.3);
        }

        .hh-step-icon {
          width: 28px;
          height: 28px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 14px;
        }

        .hh-step-emerald {
          background: linear-gradient(
            135deg,
            rgba(16, 185, 129, 0.2),
            rgba(16, 185, 129, 0.1)
          );
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .hh-step-green {
          background: linear-gradient(
            135deg,
            rgba(5, 150, 105, 0.2),
            rgba(5, 150, 105, 0.1)
          );
          border: 1px solid rgba(5, 150, 105, 0.3);
        }

        .hh-step-amber {
          background: linear-gradient(
            135deg,
            rgba(245, 158, 11, 0.2),
            rgba(245, 158, 11, 0.1)
          );
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .hh-step-number {
          font-size: 11px;
          font-weight: 700;
          color: #10b981;
          background: rgba(16, 185, 129, 0.1);
          padding: 2px 8px;
          border-radius: 20px;
        }

        .hh-step-badge {
          font-size: 10px;
          font-weight: 700;
          color: #fbbf24;
          background: rgba(245, 158, 11, 0.15);
          padding: 2px 8px;
          border-radius: 20px;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .hh-step-title {
          font-weight: 700;
          color: white;
          margin-top: 2px;
          font-size: 13px;
        }

        .hh-step-desc {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 2px;
        }

        /* Reduce earning amount size to keep layout neat (do not hide content) */
        .hh-fit-amount {
          display: inline-flex;
          align-items: baseline;
          gap: 6px;
          white-space: nowrap;
          font-size: 1.25rem; /* slightly reduced for a cooler look */
          letter-spacing: -0.01em;
        }

        /* ─── STAT CARDS ─── */
        .hh-stat-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.2s ease;
        }

        .hh-stat-card:hover {
          transform: translateY(-2px);
          border-color: rgba(16, 185, 129, 0.2);
        }

        .hh-stat-referrals {
          background: linear-gradient(
            135deg,
            rgba(245, 158, 11, 0.1),
            rgba(245, 158, 11, 0.02)
          );
        }

        .hh-stat-earned {
          background: linear-gradient(
            135deg,
            rgba(16, 185, 129, 0.1),
            rgba(16, 185, 129, 0.02)
          );
        }

        .hh-stat-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .hh-stat-content {
          flex: 1;
        }

        .hh-stat-value {
          font-size: 22px;
          font-weight: 800;
          line-height: 1;
          font-family: "JetBrains Mono", monospace;
        }

        .hh-stat-label {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 4px;
        }

        /* ─── PENDING CARD ─── */
        .hh-pending-card {
          background: linear-gradient(
            135deg,
            rgba(245, 158, 11, 0.1),
            rgba(245, 158, 11, 0.02)
          );
          border: 1px solid rgba(245, 158, 11, 0.2);
          border-radius: 16px;
          padding: 16px;
          margin-top: 12px;
        }

        .hh-pending-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
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

        /* ─── FLOATING BUTTON ─── */
        .hh-float-btn {
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 18px 24px;
          background: linear-gradient(135deg, #10b981, #059669, #047857);
          border: none;
          border-radius: 30px;
          color: white;
          font-weight: 800;
          font-size: 16px;
          box-shadow:
            0 10px 40px rgba(16, 185, 129, 0.4),
            0 0 30px rgba(16, 185, 129, 0.2);
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
          cursor: pointer;
          animation: hh-float-glow 2s ease-in-out infinite;
        }

        @keyframes hh-float-glow {
          0%,
          100% {
            box-shadow:
              0 10px 40px rgba(16, 185, 129, 0.4),
              0 0 30px rgba(16, 185, 129, 0.2);
          }
          50% {
            box-shadow:
              0 15px 50px rgba(16, 185, 129, 0.6),
              0 0 40px rgba(16, 185, 129, 0.3);
          }
        }

        .hh-float-shimmer {
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.2),
            transparent
          );
          animation: hh-shimmer-slide 2.5s ease-in-out infinite;
        }

        @keyframes hh-shimmer-slide {
          0% {
            left: -100%;
          }
          100% {
            left: 200%;
          }
        }

        .hh-float-btn:hover {
          transform: translateY(-3px) scale(1.02);
        }

        .hh-float-btn:active {
          transform: scale(0.98);
        }

        /* ─── BOTTOM NAV ─── */
        .hh-bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          max-width: 448px;
          margin: 0 auto;
          background: rgba(5, 13, 20, 0.92);
          backdrop-filter: blur(20px);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          justify-content: space-around;
          align-items: center;
          height: 64px;
          z-index: 100;
          box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.5);
        }

        .hh-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          color: #4b5563;
          text-decoration: none;
          font-size: 11px;
          font-weight: 600;
          transition:
            color 0.2s,
            transform 0.2s;
          padding: 8px 16px;
          border-radius: 12px;
        }

        .hh-nav-item:hover {
          color: #10b981;
          transform: translateY(-2px);
        }

        .hh-nav-active {
          color: #10b981 !important;
        }

        .hh-nav-active svg {
          filter: drop-shadow(0 0 6px rgba(16, 185, 129, 0.6));
        }

        /* ─── ANIMATIONS ─── */
        @keyframes hh-card-appear {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

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
        .hh-entry-5 {
          animation: hh-entry 0.5s ease-out 0.4s both;
        }
        .hh-entry-5b {
          animation: hh-entry 0.5s ease-out 0.45s both;
        }
        .hh-entry-6 {
          animation: hh-entry 0.5s ease-out 0.5s both;
        }

        /* ─── RANK CARD v2 (image style: YOUR RANK + level boxes) ─── */
        .hh-rank2-title { font-size: 15px; font-weight: 800; letter-spacing: 0.06em; color: rgba(255,255,255,0.55); margin: 2px 2px 8px; }
        .hh-rank2-card { background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015));
          border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 18px; }
        .hh-rank2-top { display: flex; align-items: center; gap: 12px; }
        .hh-rank2-badge { width: 60px; height: 60px; border-radius: 18px; border: 1px solid;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .hh-rank2-head { flex: 1; min-width: 0; }
        .hh-rank2-name { font-size: 22px; font-weight: 800; color: white; letter-spacing: -0.02em; line-height: 1.15; }
        .hh-rank2-sub { font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 2px; font-family: "JetBrains Mono", monospace; }
        .hh-rank2-count { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.55); white-space: nowrap; }
        .hh-rank2-bar { height: 10px; background: rgba(255,255,255,0.07); border-radius: 999px; overflow: hidden; margin-top: 16px; }
        .hh-rank2-fill { height: 100%; border-radius: 999px; transition: width 0.8s ease-out; }
        .hh-rank2-meta { display: flex; align-items: center; justify-content: space-between; margin-top: 8px;
          font-size: 12px; color: rgba(255,255,255,0.5); }
        .hh-rank2-need { color: #34d399; font-weight: 700; }
        .hh-rank2-levels { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-top: 16px; }
        .hh-rank2-lvl { border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02);
          border-radius: 18px; padding: 12px 4px 10px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .hh-rank2-lvl-ico { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .hh-rank2-lvl-label { font-size: 10px; font-weight: 700; color: white; }
        .hh-rank2-lvl-active { background: rgba(255,255,255,0.045); }

        /* ─── RANK CARD (legacy) ─── */
        .hh-rank-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 20px;
        }
        .hh-rank-main {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
        }
        .hh-rank-icon {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        }
        .hh-rank-info {
          flex: 1;
          min-width: 0;
        }
        .hh-rank-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: rgba(255,255,255,0.5);
          margin-bottom: 4px;
        }
        .hh-rank-name {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }
        .hh-rank-score {
          font-size: 12px;
          color: rgba(255,255,255,0.6);
          margin-top: 4px;
          font-family: "JetBrains Mono", monospace;
        }
        .hh-rank-next {
          background: rgba(255,255,255,0.03);
          border: 1px solid;
          border-radius: 12px;
          padding: 12px 16px;
          min-width: 140px;
        }
        .hh-rank-next-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: rgba(255,255,255,0.5);
          margin-bottom: 2px;
        }
        .hh-rank-next-need {
          font-size: 14px;
          font-weight: 700;
          color: white;
          font-family: "JetBrains Mono", monospace;
        }
        .hh-rank-progress {
          margin-top: 8px;
        }
        .hh-rank-progress-bar {
          height: 8px;
          background: rgba(255,255,255,0.08);
          border-radius: 4px;
          overflow: hidden;
          position: relative;
        }
        .hh-rank-progress-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.8s ease-out;
          box-shadow: 0 0 12px rgba(16,185,129,0.5);
        }
        .hh-rank-progress-labels {
          display: flex;
          justify-content: space-between;
          margin-top: 8px;
          font-size: 10px;
          color: rgba(255,255,255,0.5);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .hh-rank-max {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 12px;
          padding: 12px;
          background: linear-gradient(135deg, rgba(245,158,11,0.15), rgba(251,191,36,0.05));
          border: 1px solid rgba(245,158,11,0.3);
          border-radius: 12px;
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

        /* ─── POPUP (same-page modal — navy card, glowing CTA) ─── */
        .hh-popup {
          background: linear-gradient(135deg, #0d1f2d, #0a1628);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 30px 60px rgba(0,0,0,0.5);
          animation: hh-popup-appear 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes hh-popup-appear {
          from { opacity: 0; transform: scale(0.8) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .hh-popup-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        /* ─── REDUCED MOTION ─── */
        @media (prefers-reduced-motion: reduce) {
          .hh-bubble,
          .hh-orb-1,
          .hh-orb-2,
          .hh-live-dot,
          .hh-float-btn,
          .hh-float-shimmer,
          [class*="hh-entry-"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

function AutoTapReferralSection({ autoTapPlan, origin, referralLink, userData }: { autoTapPlan: string | null; origin: string; referralLink: string; userData: any }) {
  const router = useRouter();
  const [autoRefCode, setAutoRefCode] = useState("");
  const [autoRefCount, setAutoRefCount] = useState(0);
  const planMap: Record<string, { label: string; need: number; maxEarn: number }> = {
    "24h": { label: "24 hours: 1500 taps", need: 10, maxEarn: 150000 },
    "2d": { label: "2 days: 3500 taps", need: 20, maxEarn: 350000 },
    "3d": { label: "3 days: 5500 taps", need: 30, maxEarn: 550000 },
    "1w": { label: "1 week: 10,000 taps", need: 50, maxEarn: 1000000 },
  };
  const plan = autoTapPlan ? planMap[autoTapPlan] : null;

  useEffect(() => {
    if (!autoTapPlan) return;
    // Isolated per-plan count (same rule as the Tiered Referral page):
    // ONLY signups stamped with this plan — normal referrals never leak in.
    let cancelled = false;
    const loadPlanCount = () => {
      const uid = (userData as any)?.id || (userData as any)?.userId;
      if (!uid) return;
      fetch(`/api/referral-stats?userId=${uid}&plan=${encodeURIComponent(autoTapPlan)}&t=${Date.now()}`)
        .then(r=>r.json())
        .then(d=>{ if (!cancelled && typeof d?.plan_count === "number") setAutoRefCount(d.plan_count); })
        .catch(()=>{});
    };
    setAutoRefCount(0);
    loadPlanCount();
    const id = setInterval(loadPlanCount, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, [autoTapPlan, userData]);

  if (!autoTapPlan || !plan) {
    // hidden when not in autoTap referral mode — no extra page
    return null;
  }

  // IMPORTANT: ?ref= must be the REAL referral_code (signup looks it up in
  // users.referral_code). Fake per-plan codes (XXXX-AUTO-...) never match and
  // silently record no referral. Plan context travels via &autoTapPlan=.
  const realCode = (userData as any)?.referral_code || (userData as any)?.referralCode || (userData as any)?.userId || "";
  const autoLink = origin && realCode
    ? `${origin}/register?ref=${encodeURIComponent(realCode)}${autoTapPlan ? `&autoTapPlan=${encodeURIComponent(autoTapPlan)}` : ""}`
    : `${origin}${referralLink}`;
  const done = autoRefCount;
  const need = plan.need;
  const pct = Math.min(100, Math.round((done/need)*100));

  const copy = () => {
    navigator.clipboard.writeText(autoLink);
  };

  return (
    <div className="hh-card hh-entry-3 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-amber-500/10">
      <div className="flex items-center gap-2 mb-3">
        <div className="hh-icon-ring"><Users className="h-4 w-4 text-emerald-300" /></div>
        <span className="text-xs font-black tracking-widest text-emerald-300">AUTO TAP REFERRAL</span>
        <span className="ml-auto text-[11px] font-bold text-white/60">{autoTapPlan}</span>
      </div>
      <h3 className="text-sm font-black text-white">Unlock {plan.label} — {need} referrals</h3>
      <p className="text-xs text-white/60 mt-1">Share your dedicated Auto Tap link. Referrals from this link count toward this plan AND your total. Max ₦{plan.maxEarn.toLocaleString()} when unlocked.</p>
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs mb-1"><span className="text-white/60">Progress</span><span className="font-mono font-bold text-white">{done}/{need}</span></div>
        <div className="hh-progress-track"><div className="hh-progress-fill" style={{ width: `${pct}%` }}></div></div>
      </div>
      <div className="mt-3 bg-black/30 rounded-xl p-2.5 border border-white/10">
        <div className="text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1">Your Auto Tap referral link</div>
        <div className="text-xs font-mono text-white break-all">{autoLink || "generating..."}</div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <button onClick={copy} className="hh-share-btn hh-share-copy flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black"><Copy className="h-4 w-4" /> Copy link</button>
        <button onClick={()=> { const msg = `Join FlashGain9ja and help me unlock Auto Tap ${plan.label}! ${autoLink}`; window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_self"); }} className="hh-share-btn hh-share-wa flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black"><Share2 className="h-4 w-4" /> Share</button>
      </div>
      {done >= need ? (
        <button onClick={()=> router.push("/dashboard")} className="w-full mt-3 rounded-full bg-emerald-500 text-white font-black py-3 text-sm">Unlock & Start Auto Tap →</button>
      ) : (
        <p className="text-[11px] text-amber-300 mt-2 text-center">{need - done} more referral{need-done===1?"":"s"} to unlock</p>
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";

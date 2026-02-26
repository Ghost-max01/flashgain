// app/refer/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/referral";

interface UserData {
  id: string;
  referral_code: string;
  referral_count: number;
  referral_balance: number;
  pending_count?: number;
  balance?: number;
}

export default function ReferPage() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");
  const [activeMessage, setActiveMessage] = useState("");
  const [animatedEarnings, setAnimatedEarnings] = useState(0);
  const [isEarningsChanging, setIsEarningsChanging] = useState(false);

  const referralMessages = [
    "Turn your phone into a money-making machine! Earn ₦5,000 cash for every friend who joins FlashGain through your link.",
    "Make money while connecting with friends! Each referral gives you ₦5,000 instantly when they sign up and complete tasks.",
    "Your network is your net worth! Share FlashGain with friends and earn ₦5,000 per successful referral - no limits!",
    "Want extra cash? Refer friends to FlashGain and get ₦5,000 credited to your wallet immediately after they join.",
    "The easiest way to earn online: Invite friends, they join FlashGain, you get ₦5,000 each. Simple and fast!",
    "Stop scrolling and start earning! Every friend you refer brings ₦5,000 straight to your FlashGain wallet.",
    "Referral bonus alert! Get ₦5,000 for every friend who signs up using your link and becomes active on FlashGain.",
    "Your friends want to earn too! Share your referral link and collect ₦5,000 each time they join the FlashGain community.",
    "Building passive income is real! One referral = ₦5,000. Ten referrals = ₦50,000. Start sharing your link today!",
    "FlashGain pays you to grow our community. Each friend you bring earns you ₦5,000 cash deposited in your wallet.",
    "Your referral link is worth ₦5,000 per friend. Share it everywhere and watch your earnings multiply quickly!",
    "Ready to earn serious cash? Every successful referral through your link adds ₦5,000 to your balance - start now!",
    "Don't keep FlashGain a secret! Tell friends, earn ₦5,000 each, and build your savings effortlessly every day.",
    "Transform your social circle into income! Each friend you refer brings ₦5,000 straight into your account.",
    "Referral rewards made simple: Share link → Friend joins → You earn ₦5,000. That's real cash in your pocket!",
    "Your friends are looking for ways to earn. Introduce them to FlashGain and collect ₦5,000 per referral today!",
    "Make every introduction count! Each friend who signs up through your link earns you ₦5,000 instantly.",
    "FlashGain's referral program pays you ₦5,000 per friend. Start sharing your link and build your income stream!",
    "One text message could earn you ₦5,000! Share your referral link with friends who'd love to earn with FlashGain.",
    "Your referral link = free money machine. Each friend = ₦5,000. Share now and watch your balance grow!",
  ];

  // Animate earnings
  useEffect(() => {
    if (!userData) return;

    const targetEarnings =
      userData.referral_balance + (userData.pending_count || 0) * 10000;
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
          balance,
        });

        setAnimatedEarnings(
          data.referral_balance + (data.pending_count || 0) * 10000,
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router]);

  const referralLink = userData?.referral_code
    ? `/register?ref=${userData.referral_code}`
    : "/register";

  const handleCopy = () => {
    if (!origin) return;
    const linkOnly = `${origin}${referralLink}`;
    navigator.clipboard.writeText(linkOnly);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    if (!origin) return;
    const msg = `${activeMessage}\n\nSign up here: ${origin}${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_self");
  };

  const shareTelegram = () => {
    if (!origin) return;
    const link = `${origin}${referralLink}`;
    const msg = `${activeMessage}\n\nSign up here: ${link}`;
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(msg)}`,
      "_self",
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
              <span>each ₦5k</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 space-y-4 pt-2 relative z-10 pb-6">
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
                  <span className="tracking-tight">5,000</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-1">Potential earnings</p>
                <div
                  className={`transition-colors duration-300 ${isEarningsChanging ? "text-amber-200" : "text-amber-300"}`}
                >
                  {formatCurrency(animatedEarnings)}
                </div>
              </div>
            </div>

            <div className="hh-progress-mini mt-4">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-400">Referrals</span>
                <span className="text-white font-bold">
                  {userData?.referral_count || 0}{" "}
                  <span className="text-gray-500">/ ∞</span>
                </span>
              </div>
              <div className="hh-progress-track">
                <div
                  className="hh-progress-fill"
                  style={{
                    width: `${Math.min((userData?.referral_count || 0) * 2, 100)}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

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
                  {origin ? `${origin}${referralLink}` : "Loading..."}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleCopy}
                className={`hh-share-btn ${copied ? "hh-share-success" : "hh-share-copy"}`}
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
                onClick={shareWhatsApp}
                className="hh-share-btn hh-share-wa"
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
            onClick={shareWhatsApp}
            className="hh-action-btn hh-action-green"
          >
            <span className="hh-action-icon">📱</span>
            <span>WhatsApp</span>
          </button>
          <button
            onClick={shareTelegram}
            className="hh-action-btn hh-action-blue"
          >
            <span className="hh-action-icon">✈️</span>
            <span>Telegram</span>
          </button>
        </div>

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
                desc: "Get ₦5,000 credited instantly per referral",
                color: "emerald",
              },
              {
                icon: "⭐",
                title: "Friends Complete Tasks",
                desc: "Referral is verified after they complete 2 tasks",
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

        {/* Stats Dashboard */}
        <div className="hh-card hh-entry-5">
          <div className="hh-section-title text-center mb-5">
            Your Performance
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="hh-stat-card hh-stat-referrals">
              <div className="hh-stat-icon">
                <Users className="h-5 w-5" />
              </div>
              <div className="hh-stat-content">
                <div className="hh-stat-value text-amber-300">
                  {userData?.referral_count || 0}
                </div>
                <div className="hh-stat-label">Successful</div>
              </div>
            </div>

            <div className="hh-stat-card hh-stat-earned">
              <div className="hh-stat-icon">
                <Wallet className="h-5 w-5" />
              </div>
              <div className="hh-stat-content">
                <div className="hh-stat-value text-emerald-300">
                  {formatCurrency(userData?.referral_balance || 0)}
                </div>
                <div className="hh-stat-label">Earned</div>
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
                    {userData?.pending_count || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-400">
                    Potential earnings
                  </span>
                  <span className="text-sm font-bold text-emerald-400">
                    {formatCurrency((userData?.pending_count || 0) * 10000)}
                  </span>
                </div>
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
                ₦5,000 instantly!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="hh-bottom-nav">
        <Link href="/dashboard" className="hh-nav-item">
          <Home className="h-5 w-5" />
          <span>Home</span>
        </Link>
        <Link href="/abouttivexx" className="hh-nav-item">
          <Gamepad2 className="h-5 w-5" />
          <span>About</span>
        </Link>
        <Link href="/refer" className="hh-nav-item hh-nav-active">
          <User className="h-5 w-5" />
          <span>Refer</span>
        </Link>
      </div>

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
        .hh-entry-6 {
          animation: hh-entry 0.5s ease-out 0.5s both;
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

export const dynamic = "force-dynamic";

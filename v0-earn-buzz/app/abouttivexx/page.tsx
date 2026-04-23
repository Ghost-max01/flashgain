"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Home, Gamepad2, User, Sparkles, Shield, Users, Award, TrendingUp, Clock, Gift } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function AboutPage() {
  const router = useRouter()
  const [userData, setUserData] = useState<any | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const stored =
        localStorage.getItem("tivexx9ja-user") ||
        localStorage.getItem("tivexx-user") ||
        localStorage.getItem("momo-credit-user") ||
        localStorage.getItem("tivexx-user-old")

      if (stored) {
        setUserData(JSON.parse(stored))
      } else {
        setUserData(null)
      }
    } catch (e) {
      setUserData(null)
    } finally {
      setLoaded(true)
    }
  }, [])

  if (!loaded) {
    return (
      <div className="hh-root min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Animated background bubbles */}
        <div className="hh-bubbles-container" aria-hidden="true">
          {[...Array(12)].map((_, i) => (
            <div key={i} className={`hh-bubble hh-bubble-${i + 1}`}></div>
          ))}
        </div>

        {/* Mesh gradient overlay */}
        <div className="hh-mesh-overlay" aria-hidden="true"></div>

        <div className="hh-loading-container">
          <div className="hh-loading-spinner">
            <div className="hh-spinner-ring"></div>
            <div className="hh-spinner-ring hh-spinner-ring-2"></div>
            <div className="hh-spinner-ring hh-spinner-ring-3"></div>
          </div>
          <h1 className="hh-loading-title">FlashGain 9ja</h1>
          <p className="hh-loading-text">Loading about page...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="hh-root min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Animated background bubbles */}
        <div className="hh-bubbles-container" aria-hidden="true">
          {[...Array(12)].map((_, i) => (
            <div key={i} className={`hh-bubble hh-bubble-${i + 1}`}></div>
          ))}
        </div>

        {/* Mesh gradient overlay */}
        <div className="hh-mesh-overlay" aria-hidden="true"></div>

        <Card className="hh-login-card max-w-lg w-full p-8">
          <div className="text-center">
            <div className="hh-icon-large mx-auto mb-4">
              <Sparkles className="h-10 w-10 text-amber-300" />
            </div>
            <h2 className="hh-title-large mb-2">Welcome to FlashGain 9ja</h2>
            <p className="text-sm text-white/80 mb-6">
              Sign in to access the full About page and learn how FlashGain 9ja
              helps thousands of Nigerians earn, grow and withdraw without fees.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push("/login")}
                className="hh-primary-btn"
              >
                Sign in
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="hh-secondary-btn-small"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </Card>
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
        <div className="max-w-5xl mx-auto px-6 pt-8 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/dashboard")}
                className="hh-back-btn"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="hh-title">About FlashGain 9ja</h1>
                <p className="hh-subtitle">
                  Nigeria's most reliable earning platform
                </p>
              </div>
            </div>

            <div className="hh-badge">
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span>Trusted Platform</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-6 relative z-10">
        {/* Hero Section */}
        <div className="hh-card hh-card-hero hh-entry-1 relative overflow-hidden mb-6">
          <div className="hh-orb hh-orb-1" aria-hidden="true"></div>
          <div className="hh-orb hh-orb-2" aria-hidden="true"></div>

          <div className="relative z-10 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="hh-icon-ring">
                <Sparkles className="h-5 w-5 text-amber-300" />
              </div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Our Mission
              </span>
            </div>

            <h1 className="hh-glow-title text-4xl mb-4">FlashGain 9ja</h1>

            <p className="text-white/80 max-w-2xl mx-auto leading-relaxed">
              FlashGain 9ja was created to empower Nigerians with real earning
              opportunities, fast withdrawals and trusted digital services. Our
              system helps users support their families, grow their hustle, fund
              education and improve their financial life.
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
              <div className="hh-stat-large">
                <Users className="h-6 w-6 text-emerald-400 mb-2" />
                <div className="hh-stat-number">100,000+</div>
                <div className="hh-stat-label-large">Active Users</div>
              </div>
              <div className="hh-stat-large">
                <TrendingUp className="h-6 w-6 text-amber-400 mb-2" />
                <div className="hh-stat-number">Millions</div>
                <div className="hh-stat-label-large">Total Payouts</div>
              </div>
              <div className="hh-stat-large">
                <Clock className="h-6 w-6 text-purple-400 mb-2" />
                <div className="hh-stat-number">24/7</div>
                <div className="hh-stat-label-large">Support</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT SECTION */}
          <div className="lg:col-span-2 space-y-6">
            {/* What You Can Do */}
            <div className="hh-card hh-entry-2">
              <h2 className="hh-section-title mb-4 flex items-center gap-2">
                <Gift className="h-5 w-5 text-amber-400" />
                What You Can Do on FlashGain 9ja
              </h2>

              <ul className="space-y-3 text-sm text-white/85">
                <li className="hh-list-item">
                  <span className="hh-list-bullet"></span>
                  Earn ₦2,000 every 1 minute by claiming through the daily
                  earnings button.
                </li>
                <li className="hh-list-item">
                  <span className="hh-list-bullet"></span>
                  Earn ₦2,000 per verified referral with no limits. Some users
                  earn from 50 to 300 referrals.
                </li>
                <li className="hh-list-item">
                  <span className="hh-list-bullet"></span>
                  Access Quick Loans instantly with no collateral or BVN
                  required.
                </li>
                <li className="hh-list-item">
                  <span className="hh-list-bullet"></span>
                  Apply for Business Loans from ₦500,000 to ₦5,000,000 with a 3%
                  processing fee and 12 months repayment.
                </li>
                <li className="hh-list-item">
                  <span className="hh-list-bullet"></span>
                  Earn through tasks, referrals, bonuses and performance
                  rewards.
                </li>
                <li className="hh-list-item">
                  <span className="hh-list-bullet"></span>
                  Withdrawals remain 100% free forever.
                </li>
              </ul>
            </div>

            {/* Why Trust FlashGain 9ja */}
            <div className="hh-card hh-entry-3">
              <h3 className="hh-section-title mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-400" />
                Why Nigerians Trust FlashGain 9ja
              </h3>
              <ul className="space-y-3 text-sm text-white/85">
                <li className="hh-list-item">
                  <span className="hh-list-bullet"></span>
                  No hidden charges and no withdrawal fees.
                </li>
                <li className="hh-list-item">
                  <span className="hh-list-bullet"></span>
                  Super fast customer support through Telegram.
                </li>
                <li className="hh-list-item">
                  <span className="hh-list-bullet"></span>
                  Identity and anti-fraud systems that protect users.
                </li>
                <li className="hh-list-item">
                  <span className="hh-list-bullet"></span>
                  Built specifically for Nigerian users' needs.
                </li>
              </ul>
            </div>

            {/* Impact Stories */}
            <div className="hh-card hh-entry-4">
              <h3 className="hh-section-title mb-4 flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-400" />
                Impact Across Nigeria
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="hh-impact-card">
                  <div className="font-bold text-white mb-1">
                    Education Support
                  </div>
                  <p className="text-sm text-white/70">
                    Students used FlashGain 9ja earnings to continue school.
                  </p>
                </div>
                <div className="hh-impact-card">
                  <div className="font-bold text-white mb-1">
                    Business Support
                  </div>
                  <p className="text-sm text-white/70">
                    Small business owners expanded their capital through
                    earnings.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <aside className="space-y-6">
            {/* Official Notice */}
            <div className="hh-card hh-entry-5 text-center">
              <div className="hh-icon-ring mx-auto mb-3">
                <Shield className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="text-sm text-white/80 mb-2">Official Notice</div>
              <div className="text-xl font-bold text-amber-300 mb-2">
                Verified Platform
              </div>
              <p className="text-xs text-white/70 mb-4">
                FlashGain 9ja strictly follows identity checks and fraud
                prevention systems to protect all users and ensure transparent
                earnings.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() =>
                    window.location.href = "/dashboard#chat"
                  }
                  className="hh-support-btn-purple w-full"
                >
                  Contact Support
                </button>

                <button
                  onClick={() =>
                    window.open("https://t.me/flashgain9janews", "_self")
                  }
                  className="hh-support-btn-amber w-full"
                >
                  Join Community Channel
                </button>
              </div>
            </div>

            {/* Our Promise */}
            <div className="hh-card hh-entry-6">
              <div className="flex items-start gap-3">
                <div className="hh-tip-icon-small">
                  <Sparkles className="h-4 w-4 text-amber-300" />
                </div>
                <div>
                  <div className="font-bold text-white mb-1">Our Promise</div>
                  <p className="text-xs text-white/70">
                    Withdrawals will remain free forever. FlashGain 9ja will
                    always ensure your balance is protected and paid.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="hh-card hh-entry-7">
              <h4 className="font-bold text-white mb-3">Quick Links</h4>
              <div className="space-y-2">
                <Link href="/dashboard" className="hh-quick-link">
                  <Home className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
                <Link href="/refer" className="hh-quick-link">
                  <Users className="h-4 w-4" />
                  <span>Refer & Earn</span>
                </Link>
                <Link href="/task" className="hh-quick-link">
                  <Gift className="h-4 w-4" />
                  <span>Daily Tasks</span>
                </Link>
              </div>
            </div>
          </aside>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-white/40 mt-10">
          FlashGain 9ja © {new Date().getFullYear()}. All rights reserved.
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="hh-bottom-nav">
        <Link href="/dashboard" className="hh-nav-item">
          <Home className="h-5 w-5" />
          <span>Home</span>
        </Link>
        <Link href="/abouttivexx" className="hh-nav-item hh-nav-active">
          <Gamepad2 className="h-5 w-5" />
          <span>About</span>
        </Link>
        <Link href="/refer" className="hh-nav-item">
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

        /* ─── LOADING ─── */
        .hh-loading-container {
          position: relative;
          z-index: 10;
          text-align: center;
          animation: hh-entry 0.5s ease-out;
        }

        .hh-loading-spinner {
          position: relative;
          width: 80px;
          height: 80px;
          margin: 0 auto 24px;
        }

        .hh-spinner-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 3px solid transparent;
          border-top-color: #10b981;
          animation: hh-spin 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)
            infinite;
        }

        .hh-spinner-ring-2 {
          width: 70%;
          height: 70%;
          top: 15%;
          left: 15%;
          border-top-color: #fbbf24;
          animation-duration: 2s;
          animation-direction: reverse;
        }

        .hh-spinner-ring-3 {
          width: 40%;
          height: 40%;
          top: 30%;
          left: 30%;
          border-top-color: #3b82f6;
          animation-duration: 1.2s;
        }

        @keyframes hh-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .hh-loading-title {
          font-size: 28px;
          font-weight: 800;
          background: linear-gradient(135deg, #10b981, #fbbf24);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 8px;
          animation: hh-glow 2.5s infinite alternate;
        }

        @keyframes hh-glow {
          0% {
            text-shadow: 0 0 5px rgba(16, 185, 129, 0.3);
          }
          100% {
            text-shadow:
              0 0 20px rgba(16, 185, 129, 0.6),
              0 0 30px rgba(251, 191, 36, 0.3);
          }
        }

        .hh-loading-text {
          color: rgba(255, 255, 255, 0.7);
          font-size: 14px;
        }

        /* ─── LOGIN CARD ─── */
        .hh-login-card {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.08) 0%,
            rgba(255, 255, 255, 0.03) 100%
          );
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          backdrop-filter: blur(12px);
          position: relative;
          z-index: 10;
        }

        .hh-title-large {
          font-size: 24px;
          font-weight: 800;
          color: white;
        }

        .hh-primary-btn {
          padding: 12px 24px;
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 30px;
          font-weight: 600;
          color: white;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .hh-primary-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
        }

        .hh-secondary-btn-small {
          padding: 12px 24px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 30px;
          font-weight: 600;
          color: white;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .hh-secondary-btn-small:hover {
          background: rgba(255, 255, 255, 0.15);
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

        .hh-badge {
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
          font-weight: 600;
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
          padding: 24px;
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
            rgba(16, 185, 129, 0.15) 0%,
            rgba(5, 13, 20, 0.9) 50%,
            rgba(245, 158, 11, 0.1) 100%
          );
          border-color: rgba(16, 185, 129, 0.2);
        }

        /* ─── ORBS ─── */
        .hh-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(40px);
          pointer-events: none;
        }

        .hh-orb-1 {
          width: 250px;
          height: 250px;
          background: radial-gradient(
            circle,
            rgba(16, 185, 129, 0.15),
            transparent
          );
          top: -80px;
          right: -80px;
          animation: hh-orb-float 8s ease-in-out infinite;
        }

        .hh-orb-2 {
          width: 200px;
          height: 200px;
          background: radial-gradient(
            circle,
            rgba(245, 158, 11, 0.1),
            transparent
          );
          bottom: -60px;
          left: -60px;
          animation: hh-orb-float 10s ease-in-out infinite reverse;
        }

        @keyframes hh-orb-float {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(12px, -12px) scale(1.05);
          }
          66% {
            transform: translate(-8px, 8px) scale(0.98);
          }
        }

        /* ─── ICON RING ─── */
        .hh-icon-ring {
          width: 48px;
          height: 48px;
          border-radius: 16px;
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

        .hh-icon-large {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.15);
          border: 2px solid rgba(16, 185, 129, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: hh-icon-pulse 2s ease-in-out infinite;
        }

        @keyframes hh-icon-pulse {
          0%,
          100% {
            transform: scale(1);
            box-shadow: 0 0 20px rgba(16, 185, 129, 0.2);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 30px rgba(16, 185, 129, 0.4);
          }
        }

        /* ─── SECTION TITLE ─── */
        .hh-section-title {
          font-size: 18px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.01em;
        }

        /* ─── STATS ─── */
        .hh-stat-large {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 20px;
          text-align: center;
          transition: all 0.2s ease;
        }

        .hh-stat-large:hover {
          background: rgba(255, 255, 255, 0.05);
          transform: translateY(-2px);
        }

        .hh-stat-number {
          font-size: 28px;
          font-weight: 800;
          color: #fbbf24;
          line-height: 1.2;
          font-family: "JetBrains Mono", monospace;
        }

        .hh-stat-label-large {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
          margin-top: 4px;
        }

        /* ─── LIST ITEMS ─── */
        .hh-list-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 4px 0;
        }

        .hh-list-bullet {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
          margin-top: 8px;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }

        .hh-list-item:hover .hh-list-bullet {
          background: #fbbf24;
          transform: scale(1.2);
        }

        /* ─── IMPACT CARDS ─── */
        .hh-impact-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 14px;
          padding: 16px;
          transition: all 0.2s ease;
        }

        .hh-impact-card:hover {
          background: rgba(255, 255, 255, 0.05);
          transform: translateX(4px);
        }

        /* ─── SUPPORT BUTTONS ─── */
        .hh-support-btn-purple {
          padding: 14px;
          background: linear-gradient(135deg, #7c3aed, #5b21b6);
          border-radius: 14px;
          font-weight: 600;
          color: white;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);
        }

        .hh-support-btn-purple:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(124, 58, 237, 0.5);
        }

        .hh-support-btn-amber {
          padding: 14px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border-radius: 14px;
          font-weight: 600;
          color: white;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
        }

        .hh-support-btn-amber:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(245, 158, 11, 0.5);
        }

        /* ─── TIP ICON SMALL ─── */
        .hh-tip-icon-small {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        /* ─── QUICK LINKS ─── */
        .hh-quick-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          color: white;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .hh-quick-link:hover {
          background: rgba(16, 185, 129, 0.1);
          border-color: rgba(16, 185, 129, 0.3);
          transform: translateX(4px);
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
        .hh-entry-7 {
          animation: hh-entry 0.5s ease-out 0.6s both;
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
          .hh-icon-large,
          [class*="hh-entry-"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
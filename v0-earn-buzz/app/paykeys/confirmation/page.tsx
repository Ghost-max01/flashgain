"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import {
  XCircle,
  ArrowRight,
  Home,
  Gamepad2,
  User,
  Shield,
  AlertTriangle,
  Mail,
  KeyRound,
} from "lucide-react";
import Link from "next/link";

function PayKeyConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showResult, setShowResult] = useState(false);

  // Read transaction details from search params
  const fullName = searchParams.get("fullName") || "N/A";
  const amount = searchParams.get("amount") || "N/A";
  const method = searchParams.get("method") || "Unknown";

  // Read user credentials from localStorage
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("tivexx-user");
      if (stored) {
        const user = JSON.parse(stored);
        setUserEmail(user.email || "");
        setUserId(user.userId || user.referral_code || user.referralCode || user.id || "");
      }
    } catch {}
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowResult(true);
    }, 3000); // Tivexx-style 3s loading
    return () => clearTimeout(timer);
  }, []);

  if (!showResult) {
    // Tivexx-style loading popup with dynamic 3-wheel spinner
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
            <div className="hh-spinner-ring hh-spinner-ring-outer"></div>
            <div className="hh-spinner-ring hh-spinner-ring-middle"></div>
            <div className="hh-spinner-ring hh-spinner-ring-inner"></div>
          </div>
          <h1 className="hh-loading-title">FlashGain 9ja</h1>
          <p className="hh-loading-text">Confirming your payment...</p>
        </div>
      </div>
    );
  }

  // Failed payment display with dashboard styling
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="hh-back-btn"
            >
              <ArrowRight className="h-5 w-5 rotate-180" />
            </button>
            <div>
              <h1 className="hh-title">Payment Status</h1>
              <p className="hh-subtitle">Transaction verification</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 space-y-4 pt-2 relative z-10 pb-6">
        {/* Result Card */}
        <div className="hh-card hh-card-hero hh-entry-1 relative overflow-hidden">
          <div className="hh-orb hh-orb-1" aria-hidden="true"></div>
          <div className="hh-orb hh-orb-2" aria-hidden="true"></div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="hh-icon-ring">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                </div>
                <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                  Failed
                </span>
              </div>
              <div className="hh-live-indicator hh-live-indicator-red">
                <span className="hh-live-dot-red"></span>
                <span className="text-xs">Error</span>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="hh-icon-large-error mb-4">
                <XCircle className="h-16 w-16 text-red-400" />
              </div>

              <h2 className="hh-error-title">
                Transaction verification failed!
              </h2>

              <p className="text-center text-sm text-white/80 leading-relaxed">
                Your payment could not be confirmed. Reason: No payment received
                or invalid payment method.
              </p>

              <div className="hh-warning-box mt-4">
                <span className="text-red-300 text-sm font-medium">
                  If you have made the payment, kindly send your payment proof
                  to our support team immediately.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Summary Card */}
        <div className="hh-card hh-entry-2">
          <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">Transaction Summary</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Amount</span>
              <span className="text-sm font-bold text-amber-400">₦{Number(amount).toLocaleString() || amount}</span>
            </div>
            <div className="hh-summary-divider"></div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Payment Method</span>
              <span className="text-sm font-semibold text-white">{method}</span>
            </div>
            <div className="hh-summary-divider"></div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Status</span>
              <span className="hh-status-badge-inline hh-status-badge-inline-error">
                <XCircle className="h-3 w-3" />
                Failed
              </span>
            </div>
          </div>
        </div>

        {/* Login Credentials Card */}
        <div className="hh-card hh-credentials-card hh-entry-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="hh-cred-icon">
              <KeyRound className="h-4 w-4 text-emerald-300" />
            </div>
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Your Login Credentials</h4>
          </div>
          <p className="text-xs text-white/60 mb-3">Use these to log back into your account at any time.</p>
          <div className="space-y-2">
            <div className="hh-cred-row">
              <Mail className="h-4 w-4 text-white/40 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-white/40 uppercase tracking-wider">Email</span>
                <p className="text-sm font-semibold text-white truncate">{userEmail || "—"}</p>
              </div>
            </div>
            <div className="hh-cred-row">
              <KeyRound className="h-4 w-4 text-white/40 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-white/40 uppercase tracking-wider">User ID (use as password)</span>
                <p className="text-sm font-semibold text-emerald-400 truncate">{userId || "—"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 hh-entry-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="hh-secondary-btn w-full"
          >
            Go to Dashboard
          </button>

          <button
            onClick={() => {
              // Build transaction summary message
              const msg = [
                `📋 Payment Support Request`,
                ``,
                ` Amount: ₦${Number(amount).toLocaleString() || amount}`,
                `🏦 Method: ${method}`,
                `🆔 User ID: ${userId || "N/A"}`,
                `❌ Status: Failed / Not Confirmed`,
                ``,
                `I have made this payment but it was not verified. Please check and credit my account. Thank you.`,
              ].join("\n");

              // Open Telegram DM with pre-filled message — user just taps Send
              const encoded = encodeURIComponent(msg);
              window.open(`https://t.me/flashgainsupport?text=${encoded}`, "_self");
            }}
            className="hh-support-btn-full"
          >
            <svg
              className="hh-telegram-icon"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 0a12 12 0 100 24A12 12 0 0012 0zm5.303 7.224c.1-.002.32.023.464.14.05.035.084.076.117.12a.502.502 0 01.17.325c.016.093.036.305.02.471-.18 1.897-.962 6.502-1.36 8.627-.168.9-.5 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.183 3.247-2.977 3.307-3.23.007-.031.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014z" />
            </svg>
            Forward Details to Support
          </button>
        </div>

        {/* Help Card */}
        <div className="hh-card hh-tip-card hh-entry-5">
          <div className="flex items-start gap-3">
            <div className="hh-tip-icon">
              <Shield className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">Need Help?</h4>
              <p className="text-sm text-emerald-200/80">
                Our support team is available 24/7 to assist you with any
                payment issues. Tap the button above — your details will be copied automatically.
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
          width: 100px;
          height: 100px;
          margin: 0 auto 32px;
        }

        /* Dynamic 3-Wheel Spinner */
        .hh-spinner-ring {
          position: absolute;
          border-radius: 50%;
          border: 3px solid transparent;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
        }

        .hh-spinner-ring-outer {
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-top: 3px solid #10b981;
          border-right: 3px solid #10b981;
          border-bottom: 3px solid transparent;
          border-left: 3px solid transparent;
          animation: spin-outer 2.2s cubic-bezier(0.68, -0.55, 0.265, 1.55)
            infinite;
        }

        .hh-spinner-ring-middle {
          top: 15px;
          left: 15px;
          width: 70px;
          height: 70px;
          border-bottom: 3px solid #fbbf24;
          border-left: 3px solid #fbbf24;
          border-top: 3px solid transparent;
          border-right: 3px solid transparent;
          animation: spin-middle 2.4s cubic-bezier(0.45, 0.05, 0.55, 0.95)
            infinite;
        }

        .hh-spinner-ring-inner {
          top: 30px;
          left: 30px;
          width: 40px;
          height: 40px;
          border-top: 3px solid #3b82f6;
          border-left: 3px solid #3b82f6;
          border-bottom: 3px solid transparent;
          border-right: 3px solid transparent;
          animation: spin-inner 2.6s cubic-bezier(0.445, 0.05, 0.55, 0.95)
            infinite;
        }

        @keyframes spin-outer {
          0% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(180deg);
          }
          50% {
            transform: rotate(360deg);
          }
          75% {
            transform: rotate(180deg);
          }
          100% {
            transform: rotate(0deg);
          }
        }

        @keyframes spin-middle {
          0% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(-180deg);
          }
          50% {
            transform: rotate(-360deg);
          }
          75% {
            transform: rotate(-180deg);
          }
          100% {
            transform: rotate(0deg);
          }
        }

        @keyframes spin-inner {
          0% {
            transform: rotate(0deg);
          }
          33% {
            transform: rotate(360deg);
          }
          66% {
            transform: rotate(-360deg);
          }
          100% {
            transform: rotate(0deg);
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
            rgba(239, 68, 68, 0.15) 0%,
            rgba(5, 13, 20, 0.9) 50%,
            rgba(239, 68, 68, 0.1) 100%
          );
          border-color: rgba(239, 68, 68, 0.2);
        }

        .hh-tip-card {
          background: linear-gradient(
            135deg,
            rgba(16, 185, 129, 0.15),
            rgba(16, 185, 129, 0.05)
          );
          border: 1px solid rgba(16, 185, 129, 0.2);
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
            rgba(239, 68, 68, 0.2),
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
            rgba(239, 68, 68, 0.15),
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
            rgba(239, 68, 68, 0.2),
            rgba(239, 68, 68, 0.1)
          );
          border: 1px solid rgba(239, 68, 68, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hh-icon-large-error {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.15);
          border: 2px solid rgba(239, 68, 68, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: hh-icon-pulse-error 2s ease-in-out infinite;
        }

        @keyframes hh-icon-pulse-error {
          0%,
          100% {
            transform: scale(1);
            box-shadow: 0 0 20px rgba(239, 68, 68, 0.2);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 30px rgba(239, 68, 68, 0.4);
          }
        }

        /* ─── LIVE INDICATOR ─── */
        .hh-live-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          padding: 4px 10px;
        }

        .hh-live-indicator-red {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.3);
        }

        .hh-live-dot-red {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ef4444;
          box-shadow: 0 0 6px #ef4444;
          animation: hh-live-pulse-red 1.5s ease-in-out infinite;
        }

        @keyframes hh-live-pulse-red {
          0%,
          100% {
            box-shadow: 0 0 4px #ef4444;
            transform: scale(1);
          }
          50% {
            box-shadow:
              0 0 10px #ef4444,
              0 0 20px rgba(239, 68, 68, 0.4);
            transform: scale(1.15);
          }
        }

        .hh-error-title {
          font-size: 22px;
          font-weight: 800;
          color: #ef4444;
          margin: 16px 0 8px;
          text-align: center;
        }

        .hh-warning-box {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 12px;
          padding: 16px;
          margin-top: 12px;
          width: 100%;
        }

        /* ─── STATUS CARD ─── */
        .hh-status-icon-error {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ef4444;
        }

        .hh-status-label {
          font-size: 11px;
          color: #9ca3af;
          font-weight: 500;
        }

        .hh-status-value-error {
          font-size: 16px;
          font-weight: 700;
          color: #ef4444;
          margin-top: 2px;
        }

        .hh-status-emoji {
          font-size: 28px;
          opacity: 0.7;
        }

        /* ─── BUTTONS ─── */
        .hh-secondary-btn {
          padding: 16px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .hh-secondary-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
        }

        .hh-secondary-btn:active {
          transform: scale(0.98);
        }

        .hh-support-btn-full {
          width: 100%;
          padding: 16px;
          border-radius: 14px;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: white;
          font-weight: 700;
          font-size: 15px;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 4px 20px rgba(37, 99, 235, 0.3);
        }

        .hh-support-btn-full:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(37, 99, 235, 0.5);
        }

        .hh-support-btn-full:active {
          transform: scale(0.98);
        }

        .hh-telegram-icon {
          width: 20px;
          height: 20px;
          animation: hh-spin-slow 2s linear infinite;
        }

        @keyframes hh-spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        /* ─── TIP ICON ─── */
        .hh-tip-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
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

        /* ─── SUMMARY CARD ─── */
        .hh-summary-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.06);
        }

        .hh-status-badge-inline {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
        }

        .hh-status-badge-inline-error {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }

        /* ─── CREDENTIALS CARD ─── */
        .hh-credentials-card {
          background: linear-gradient(
            135deg,
            rgba(16, 185, 129, 0.08) 0%,
            rgba(255, 255, 255, 0.03) 100%
          );
          border-color: rgba(16, 185, 129, 0.15);
        }

        .hh-cred-icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .hh-cred-row {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          padding: 10px 12px;
        }

        /* ─── COPIED NOTICE ─── */
        .hh-copied-notice {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.25);
          border-radius: 10px;
          padding: 10px 14px;
          animation: hh-entry 0.3s ease-out both;
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
          .hh-live-dot-red,
          .hh-icon-large-error,
          .hh-telegram-icon,
          .hh-spinner-ring-outer,
          .hh-spinner-ring-middle,
          .hh-spinner-ring-inner,
          [class*="hh-entry-"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function PayKeyConfirmationPage() {
  return (
    <Suspense
      fallback={
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
              <div className="hh-spinner-ring hh-spinner-ring-outer"></div>
              <div className="hh-spinner-ring hh-spinner-ring-middle"></div>
              <div className="hh-spinner-ring hh-spinner-ring-inner"></div>
            </div>
            <h1 className="hh-loading-title">FlashGain 9ja</h1>
            <p className="hh-loading-text">Confirming your payment...</p>
          </div>
        </div>
      }
    >
      <PayKeyConfirmationContent />
    </Suspense>
  );
}

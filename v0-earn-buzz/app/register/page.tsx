"use client";

import type React from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Home,
  Gamepad2,
  User,
  Sparkles,
  Shield,
  Gift,
  Award,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [showPasswordReminder, setShowPasswordReminder] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const storedUser = localStorage.getItem("tivexx-user");
    if (storedUser) {
      router.push("/dashboard");
    }
  }, [mounted, router]);

  useEffect(() => {
    if (!mounted) return;

    const refCode = searchParams.get("ref");
    if (refCode) {
      setReferralCode(refCode);
    }
  }, [mounted, searchParams]);

  // Password reminder notification
  useEffect(() => {
    if (!mounted) return;

    const showReminder = () => {
      setShowPasswordReminder(true);
      setTimeout(() => {
        setShowPasswordReminder(false);
        // Show again after 7 seconds
        setTimeout(showReminder, 7000);
      }, 2000);
    };

    // Start the reminder cycle after 3 seconds
    const initialTimer = setTimeout(showReminder, 3000);

    return () => {
      clearTimeout(initialTimer);
    };
  }, [mounted]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          referralCode: referralCode || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      const userData = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        balance: 20000, // Changed signup bonus to ₦20,000
        userId: data.user.referral_code,
        hasMomoNumber: false,
        level: "Basic",
        referralCode: data.user.referral_code,
      };

      localStorage.setItem("tivexx-user", JSON.stringify(userData));
      localStorage.removeItem("tivexx-welcome-popup-shown");

      router.push("/welcome");
    } catch (error: any) {
      console.error("[v0] Registration error:", error);
      setError(error.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
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
          <p className="hh-loading-text">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="hh-root min-h-screen relative overflow-hidden">
      {/* Animated background bubbles */}
      <div className="hh-bubbles-container" aria-hidden="true">
        {[...Array(12)].map((_, i) => (
          <div key={i} className={`hh-bubble hh-bubble-${i + 1}`}></div>
        ))}
      </div>

      {/* Mesh gradient overlay */}
      <div className="hh-mesh-overlay" aria-hidden="true"></div>

      {/* Password Reminder Notification */}
      {showPasswordReminder && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="hh-reminder-popup">
            <div className="hh-reminder-icon">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium">
              💡 Remember to use a memorable password!
            </span>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center min-h-screen p-6 relative z-10">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8 hh-entry-1">
            <h1 className="hh-glow-title mb-2">FlashGain 9ja</h1>
            <p className="hh-subtitle">Join thousands earning daily</p>
          </div>

          {/* Main Card */}
          <div className="hh-card hh-entry-2">
            <h2 className="hh-section-title text-center mb-6">
              Create Your Account
            </h2>

            {referralCode && (
              <div className="hh-referral-alert mb-4">
                <Gift className="h-4 w-4 text-emerald-300" />
                <span>
                  🎉 You're signing up with referral code:{" "}
                  <strong>{referralCode}</strong>
                </span>
              </div>
            )}

            {error && (
              <div className="hh-error-alert mb-4">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-5">
              {/* Name Input */}
              <div className="hh-form-group">
                <Input
                  type="text"
                  placeholder="Enter Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="hh-input"
                />
              </div>

              {/* Email Input */}
              <div className="hh-form-group">
                <Input
                  type="email"
                  placeholder="Enter Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="hh-input"
                />
              </div>

              {/* Password Input */}
              <div className="hh-form-group">
                <Input
                  type="password"
                  placeholder="Enter Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="hh-input"
                />
              </div>

              {/* Referral Code Input */}
              <div className="hh-form-group relative">
                <Input
                  type="text"
                  placeholder="Referral Code (Auto-filled)"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  readOnly={!!searchParams.get("ref")}
                  className={`hh-input ${searchParams.get("ref") ? "hh-input-readonly" : ""}`}
                />
                {searchParams.get("ref") && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-300">
                    <Award className="h-5 w-5" />
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="hh-submit-btn w-full"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="hh-spinner-small"></span>
                    Creating Account...
                  </span>
                ) : (
                  "Register & Get ₦20,000"
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-6 pt-6 border-t border-white/8">
              <p className="text-center text-white/80">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-emerald-300 hover:text-emerald-200 font-semibold transition-colors"
                >
                  Login Now
                </Link>
              </p>
              <p className="text-center text-xs text-white/40 mt-3">
                Get instant ₦20,000 bonus + earn ₦5,000 per referral
              </p>
            </div>
          </div>

          {/* Security Note */}
          <div className="hh-card hh-tip-card hh-entry-3 mt-4">
            <div className="flex items-start gap-3">
              <div className="hh-tip-icon">
                <Shield className="h-5 w-5 text-emerald-300" />
              </div>
              <div>
                <h4 className="font-bold text-white mb-1">
                  Secure Registration
                </h4>
                <p className="text-sm text-emerald-200/80">
                  Your information is encrypted and protected. We never share
                  your data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
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
          width: 60px;
          height: 60px;
          margin: 0 auto 16px;
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

        .hh-spinner-small {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: hh-spin 1s linear infinite;
        }

        @keyframes hh-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .hh-loading-text {
          color: rgba(255, 255, 255, 0.7);
          font-size: 14px;
        }

        /* ─── REMINDER POPUP ─── */
        .hh-reminder-popup {
          background: linear-gradient(135deg, #0d1f2d, #0a1628);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 30px;
          padding: 12px 24px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          gap: 12px;
          animation: hh-reminder-appear 2s ease-in-out forwards;
        }

        .hh-reminder-icon {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(245, 158, 11, 0.2);
          border: 1px solid rgba(245, 158, 11, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fbbf24;
        }

        @keyframes hh-reminder-appear {
          0% {
            opacity: 0;
            transform: translateY(-20px) scale(0.9);
          }
          15% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          85% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-20px) scale(0.9);
          }
        }

        /* ─── GLOW TITLE ─── */
        .hh-glow-title {
          font-size: 42px;
          font-weight: 800;
          background: linear-gradient(135deg, #10b981, #fbbf24);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: hh-title-glow 2.5s infinite alternate;
        }

        @keyframes hh-title-glow {
          0% {
            text-shadow: 0 0 5px rgba(16, 185, 129, 0.3);
          }
          100% {
            text-shadow:
              0 0 20px rgba(16, 185, 129, 0.6),
              0 0 30px rgba(251, 191, 36, 0.3);
          }
        }

        .hh-subtitle {
          font-size: 14px;
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
          border-radius: 24px;
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

        .hh-tip-card {
          background: linear-gradient(
            135deg,
            rgba(16, 185, 129, 0.15),
            rgba(16, 185, 129, 0.05)
          );
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        /* ─── SECTION TITLE ─── */
        .hh-section-title {
          font-size: 22px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.01em;
        }

        /* ─── REFERRAL ALERT ─── */
        .hh-referral-alert {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 14px;
          padding: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #10b981;
          font-size: 14px;
          animation: hh-fade-in 0.5s ease;
        }

        .hh-error-alert {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 14px;
          padding: 14px;
          color: #f87171;
          font-size: 14px;
          animation: hh-fade-in 0.5s ease;
        }

        @keyframes hh-fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* ─── FORM ELEMENTS ─── */
        .hh-form-group {
          margin-bottom: 16px;
        }

        .hh-input {
          width: 100%;
          height: 56px;
          padding: 0 20px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          color: white;
          font-size: 15px;
          transition: all 0.2s ease;
        }

        .hh-input:focus {
          outline: none;
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        .hh-input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        .hh-input-readonly {
          background: rgba(16, 185, 129, 0.1);
          border-color: rgba(16, 185, 129, 0.3);
          color: #10b981;
        }

        /* ─── SUBMIT BUTTON ─── */
        .hh-submit-btn {
          width: 100%;
          height: 56px;
          border-radius: 16px;
          font-weight: 800;
          font-size: 16px;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          background: linear-gradient(135deg, #10b981, #059669, #047857);
          color: white;
          box-shadow: 0 6px 30px rgba(16, 185, 129, 0.4);
          animation: hh-btn-glow 2s ease-in-out infinite;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hh-submit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 40px rgba(16, 185, 129, 0.6);
        }

        .hh-submit-btn:active {
          transform: scale(0.98);
        }

        .hh-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          animation: none;
        }

        @keyframes hh-btn-glow {
          0%,
          100% {
            box-shadow: 0 6px 30px rgba(16, 185, 129, 0.4);
          }
          50% {
            box-shadow:
              0 6px 40px rgba(16, 185, 129, 0.6),
              0 0 30px rgba(16, 185, 129, 0.3);
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
          .hh-spinner-ring,
          .hh-spinner-ring-2,
          .hh-spinner-ring-3,
          .hh-submit-btn,
          .hh-glow-title,
          .hh-reminder-popup,
          [class*="hh-entry-"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

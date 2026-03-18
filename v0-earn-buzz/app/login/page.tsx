"use client";

import { useState, useEffect } from "react";
import type React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase/client";
import { persistUserSession, restoreUserSessionFromCookie } from "@/lib/session-client";
import {
  Home,
  Gamepad2,
  User,
  Shield,
  Sparkles,
  Mail,
  Lock,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const storedUser = localStorage.getItem("tivexx-user") || restoreUserSessionFromCookie();
    if (storedUser) {
      router.push("/dashboard");
    }
  }, [mounted, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!supabase) {
        setError("Database connection not available");
        setLoading(false);
        return;
      }

      let fullUser: any = null;

      // STEP 1: Try Supabase Auth login first
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (!authError && authData?.user) {
        // User exists in Supabase Auth → pull everything
        const { data } = await supabase
          .from("users")
          .select("*")
          .eq("id", authData.user.id)
          .single();

        fullUser = data;
      } else {
        // STEP 2: Legacy fallback — check your old users table
        const { data: localUser } = await supabase
          .from("users")
          .select("*")
          .eq("email", email)
          .single();

        const normalizedInput = password.trim().toUpperCase();
        const normalizedReferralCode = (localUser?.referral_code || "").toUpperCase();
        const matchesPassword = localUser?.password === password;
        const matchesUserId = normalizedInput.length > 0 && normalizedInput === normalizedReferralCode;

        if (!localUser || (!matchesPassword && !matchesUserId)) {
          setError("Invalid email, password, or user ID");
          setLoading(false);
          return;
        }

        fullUser = localUser;

        // REMOVED THE signUp() LINE ON PURPOSE
        // This was giving people extra referral money on every new browser
        // No more silent migration here → referral bonus only on real register
      }

      // Save the FULL user object with correct numbers
      const stableUserId = fullUser?.userId || fullUser?.referral_code || fullUser?.referralCode || fullUser?.id
      persistUserSession({
        ...fullUser,
        userId: stableUserId,
        balance: Number(fullUser?.balance || 0),
        referral_balance: Number(fullUser?.referral_balance || 0),
        referral_count: Number(fullUser?.referral_count || 0),
      });

      router.push("/dashboard");
    } catch (err) {
      setError("Login failed");
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

      <div className="flex-1 flex flex-col items-center justify-center min-h-screen p-6 relative z-10">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8 hh-entry-1">
            <h1 className="hh-glow-title mb-2">FlashGain 9ja</h1>
            <p className="hh-subtitle">Nigeria's trusted earning platform</p>
          </div>

          {/* Main Card */}
          <div className="hh-card hh-entry-2">
            <h2 className="hh-section-title text-center mb-6">Welcome Back</h2>

            {error && (
              <div className="hh-error-alert mb-4">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email Input with Icon */}
              <div className="hh-input-wrapper">
                <Mail className="hh-input-icon" />
                <Input
                  type="email"
                  placeholder="Enter Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="hh-input hh-input-with-icon"
                />
              </div>

              {/* Password or User ID Input with Icon */}
              <div className="hh-input-wrapper">
                <Lock className="hh-input-icon" />
                <Input
                  type="text"
                  placeholder="Enter Password or User ID"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="hh-input hh-input-with-icon"
                />
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
                    Logging in...
                  </span>
                ) : (
                  "Login"
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-6 pt-6 border-t border-white/8">
              <p className="text-center text-white/80">
                Don't have an account?{" "}
                <Link
                  href="/register"
                  className="text-emerald-300 hover:text-emerald-200 font-semibold transition-colors"
                >
                  Register Now
                </Link>
              </p>
              <p className="text-center text-xs text-white/40 mt-3">
                Get ₦20,000 signup bonus + earn ₦5,000 per referral
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
                <h4 className="font-bold text-white mb-1">Secure Login</h4>
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

        /* ─── ERROR ALERT ─── */
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
        .hh-input-wrapper {
          position: relative;
          width: 100%;
        }

        .hh-input-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          width: 18px;
          height: 18px;
          color: #10b981;
          z-index: 1;
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

        .hh-input-with-icon {
          padding-left: 48px;
        }

        .hh-input:focus {
          outline: none;
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        .hh-input::placeholder {
          color: rgba(255, 255, 255, 0.3);
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
          .hh-spinner-ring,
          .hh-spinner-ring-2,
          .hh-spinner-ring-3,
          .hh-submit-btn,
          .hh-glow-title,
          [class*="hh-entry-"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

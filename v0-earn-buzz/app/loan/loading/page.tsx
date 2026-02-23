"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Sparkles, Shield, Clock } from "lucide-react"

export default function LoanLoadingPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to loan fee instruction page after 7 seconds
    const timer = setTimeout(() => {
      router.push("/loan/fee-instruction")
    }, 7000)

    return () => clearTimeout(timer)
  }, [router])

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

      {/* Main Content */}
      <div className="relative z-10 max-w-md w-full px-6">
        <div className="hh-loading-card">
          {/* Premium Multi-Ring Spinner */}
          <div className="hh-spinner-container">
            <div className="hh-spinner-ring-outer"></div>
            <div className="hh-spinner-ring-middle"></div>
            <div className="hh-spinner-ring-inner"></div>
            <div className="hh-spinner-core">
              <Sparkles className="hh-spinner-icon" />
            </div>
          </div>

          {/* Text Content */}
          <div className="text-center space-y-3">
            <h2 className="hh-title-glow">Processing Loan Application</h2>
            <p className="hh-description">Please wait while we process your loan details...</p>
          </div>

          {/* Progress Indicators */}
          <div className="hh-progress-container">
            <div className="hh-progress-bar">
              <div className="hh-progress-fill"></div>
            </div>
            <div className="hh-progress-steps">
              <div className="hh-step hh-step-active">
                <div className="hh-step-dot"></div>
                <span className="hh-step-label">Processing</span>
              </div>
              <div className="hh-step">
                <div className="hh-step-dot"></div>
                <span className="hh-step-label">Verifying</span>
              </div>
              <div className="hh-step">
                <div className="hh-step-dot"></div>
                <span className="hh-step-label">Complete</span>
              </div>
            </div>
          </div>

          {/* Timer Indicator */}
          <div className="hh-timer-container">
            <Clock className="hh-timer-icon" />
            <span className="hh-timer-text">Redirecting in a few seconds...</span>
          </div>

          {/* Security Badge */}
          <div className="hh-security-badge">
            <Shield className="hh-shield-icon" />
            <span className="hh-security-text">Secured by 256-bit encryption</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .hh-root {
          font-family: 'Syne', sans-serif;
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

        @keyframes hh-bubble-rise {
          0%   { transform: translateY(100vh) scale(0.5); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 0.6; }
          100% { transform: translateY(-10vh) scale(1.2); opacity: 0; }
        }

        /* ─── MESH OVERLAY ─── */
        .hh-mesh-overlay {
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse 60% 40% at 20% 80%, rgba(16,185,129,0.07) 0%, transparent 60%),
            radial-gradient(ellipse 50% 50% at 80% 20%, rgba(59,130,246,0.06) 0%, transparent 60%),
            radial-gradient(ellipse 40% 30% at 50% 50%, rgba(139,92,246,0.04) 0%, transparent 60%);
          pointer-events: none;
          z-index: 0;
        }

        /* ─── LOADING CARD ─── */
        .hh-loading-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 32px;
          padding: 40px 32px;
          backdrop-filter: blur(20px);
          position: relative;
          overflow: hidden;
          animation: card-appear 0.6s ease-out;
          box-shadow: 0 30px 60px rgba(0,0,0,0.5);
        }

        .hh-loading-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #10b981, #8b5cf6, #f59e0b, transparent);
          animation: border-glow 2s linear infinite;
        }

        @keyframes border-glow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes card-appear {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* ─── SPINNER CONTAINER ─── */
        .hh-spinner-container {
          position: relative;
          width: 120px;
          height: 120px;
          margin: 0 auto 32px;
        }

        /* Outer Ring */
        .hh-spinner-ring-outer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: 3px solid transparent;
          border-top-color: #10b981;
          border-right-color: #10b981;
          border-radius: 50%;
          animation: spin-outer 2s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
          box-shadow: 0 0 20px rgba(16,185,129,0.3);
        }

        /* Middle Ring */
        .hh-spinner-ring-middle {
          position: absolute;
          top: 15px;
          left: 15px;
          right: 15px;
          bottom: 15px;
          border: 3px solid transparent;
          border-top-color: #8b5cf6;
          border-left-color: #8b5cf6;
          border-radius: 50%;
          animation: spin-middle 1.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite reverse;
          box-shadow: 0 0 20px rgba(139,92,246,0.3);
        }

        /* Inner Ring */
        .hh-spinner-ring-inner {
          position: absolute;
          top: 30px;
          left: 30px;
          right: 30px;
          bottom: 30px;
          border: 3px solid transparent;
          border-bottom-color: #f59e0b;
          border-right-color: #f59e0b;
          border-radius: 50%;
          animation: spin-inner 1.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
          box-shadow: 0 0 20px rgba(245,158,11,0.3);
        }

        /* Core Icon */
        .hh-spinner-core {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, rgba(16,185,129,0.2), rgba(139,92,246,0.2));
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: core-pulse 1.5s ease-in-out infinite;
        }

        .hh-spinner-icon {
          width: 24px;
          height: 24px;
          color: #fbbf24;
          animation: icon-spin 3s linear infinite;
        }

        @keyframes spin-outer {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes spin-middle {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(-360deg); }
        }

        @keyframes spin-inner {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes core-pulse {
          0%, 100% { 
            transform: translate(-50%, -50%) scale(1);
            box-shadow: 0 0 20px rgba(16,185,129,0.3);
          }
          50% { 
            transform: translate(-50%, -50%) scale(1.1);
            box-shadow: 0 0 40px rgba(139,92,246,0.5);
          }
        }

        @keyframes icon-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* ─── TEXT CONTENT ─── */
        .hh-title-glow {
          font-size: 24px;
          font-weight: 800;
          background: linear-gradient(135deg, #10b981, #8b5cf6, #f59e0b);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 8px;
          animation: text-glow 2s ease-in-out infinite;
        }

        @keyframes text-glow {
          0%, 100% { text-shadow: 0 0 10px rgba(16,185,129,0.3); }
          50% { text-shadow: 0 0 20px rgba(139,92,246,0.5), 0 0 30px rgba(245,158,11,0.3); }
        }

        .hh-description {
          color: rgba(255,255,255,0.7);
          font-size: 14px;
          animation: fade-pulse 2s ease-in-out infinite;
        }

        @keyframes fade-pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }

        /* ─── PROGRESS CONTAINER ─── */
        .hh-progress-container {
          margin: 32px 0 24px;
        }

        .hh-progress-bar {
          width: 100%;
          height: 6px;
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 16px;
        }

        .hh-progress-fill {
          width: 45%;
          height: 100%;
          background: linear-gradient(90deg, #10b981, #8b5cf6, #f59e0b);
          border-radius: 10px;
          animation: progress-move 2s ease-in-out infinite;
          box-shadow: 0 0 20px rgba(16,185,129,0.5);
        }

        @keyframes progress-move {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }

        .hh-progress-steps {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .hh-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          flex: 1;
        }

        .hh-step-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
          transition: all 0.3s ease;
          position: relative;
        }

        .hh-step-active .hh-step-dot {
          background: #10b981;
          box-shadow: 0 0 15px #10b981;
          animation: dot-pulse 1.5s ease-in-out infinite;
        }

        .hh-step-active .hh-step-dot::before {
          content: '';
          position: absolute;
          top: -4px;
          left: -4px;
          right: -4px;
          bottom: -4px;
          border-radius: 50%;
          background: rgba(16,185,129,0.3);
          animation: ripple 1.5s ease-out infinite;
        }

        @keyframes dot-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }

        @keyframes ripple {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }

        .hh-step-label {
          font-size: 11px;
          font-weight: 600;
          color: rgba(255,255,255,0.5);
        }

        .hh-step-active .hh-step-label {
          color: #10b981;
        }

        /* ─── TIMER CONTAINER ─── */
        .hh-timer-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 24px;
          padding: 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 40px;
        }

        .hh-timer-icon {
          width: 16px;
          height: 16px;
          color: #f59e0b;
          animation: clock-tick 1s steps(1) infinite;
        }

        @keyframes clock-tick {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .hh-timer-text {
          font-size: 13px;
          color: rgba(255,255,255,0.6);
        }

        /* ─── SECURITY BADGE ─── */
        .hh-security-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          background: linear-gradient(135deg, rgba(16,185,129,0.1), rgba(59,130,246,0.1));
          border: 1px solid rgba(16,185,129,0.2);
          border-radius: 40px;
        }

        .hh-shield-icon {
          width: 16px;
          height: 16px;
          color: #10b981;
          animation: shield-glow 2s ease-in-out infinite;
        }

        @keyframes shield-glow {
          0%, 100% { filter: drop-shadow(0 0 2px #10b981); }
          50% { filter: drop-shadow(0 0 8px #10b981); }
        }

        .hh-security-text {
          font-size: 12px;
          font-weight: 500;
          color: rgba(255,255,255,0.8);
        }

        /* ─── REDUCED MOTION ─── */
        @media (prefers-reduced-motion: reduce) {
          .hh-bubble,
          .hh-spinner-ring-outer,
          .hh-spinner-ring-middle,
          .hh-spinner-ring-inner,
          .hh-spinner-core,
          .hh-spinner-icon,
          .hh-progress-fill,
          .hh-step-active .hh-step-dot,
          .hh-timer-icon,
          .hh-shield-icon {
            animation: none !important;
          }
          
          .hh-loading-card::before {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}
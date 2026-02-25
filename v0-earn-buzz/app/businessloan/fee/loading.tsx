"use client"

export default function Loading() {
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

      {/* Loading Content */}
      <div className="hh-loading-container">
        <div className="hh-loading-spinner">
          <div className="hh-spinner-ring"></div>
          <div className="hh-spinner-ring hh-spinner-ring-2"></div>
          <div className="hh-spinner-ring hh-spinner-ring-3"></div>
          <div className="hh-spinner-core">
            <div className="hh-spinner-core-inner"></div>
          </div>
        </div>
        <h1 className="hh-loading-title">Flash Gain</h1>
        <p className="hh-loading-text">Loading your experience...</p>
      </div>

      <style jsx>{`
        /* ─── IMPORT FONT ─── */
        @import url("https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800;900&display=swap");

        /* ─── ROOT & BACKGROUND ─── */
        .hh-root {
          font-family: "Syne", sans-serif;
          background: #050d14;
          color: white;
          min-height: 100vh;
          width: 100%;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 9999;
        }

        /* ─── BUBBLES ─── */
        .hh-bubbles-container {
          position: absolute;
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
          position: absolute;
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

        /* ─── LOADING CONTAINER ─── */
        .hh-loading-container {
          position: relative;
          z-index: 10;
          text-align: center;
          animation: hh-appear 0.6s ease-out;
          padding: 20px;
        }

        @keyframes hh-appear {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* ─── PREMIUM MULTI-RING SPINNER ─── */
        .hh-loading-spinner {
          position: relative;
          width: 100px;
          height: 100px;
          margin: 0 auto 32px;
        }

        /* Outer Ring */
        .hh-spinner-ring {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: 3px solid transparent;
          border-top-color: #10b981;
          border-right-color: #10b981;
          border-radius: 50%;
          animation: hh-spin-outer 2s cubic-bezier(0.68, -0.55, 0.265, 1.55)
            infinite;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
        }

        /* Middle Ring */
        .hh-spinner-ring-2 {
          top: 15px;
          left: 15px;
          width: 70px;
          height: 70px;
          border-top-color: #8b5cf6;
          border-right-color: transparent;
          border-left-color: #8b5cf6;
          animation: hh-spin-middle 1.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)
            infinite reverse;
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
        }

        /* Inner Ring */
        .hh-spinner-ring-3 {
          top: 30px;
          left: 30px;
          width: 40px;
          height: 40px;
          border-top-color: #f59e0b;
          border-right-color: #f59e0b;
          border-left-color: transparent;
          animation: hh-spin-inner 1.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)
            infinite;
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.3);
        }

        /* Core */
        .hh-spinner-core {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 20px;
          height: 20px;
          background: linear-gradient(135deg, #10b981, #8b5cf6, #f59e0b);
          border-radius: 50%;
          animation: hh-core-pulse 1.5s ease-in-out infinite;
          box-shadow: 0 0 30px rgba(16, 185, 129, 0.6);
        }

        .hh-spinner-core-inner {
          width: 100%;
          height: 100%;
          background: inherit;
          border-radius: 50%;
          animation: hh-core-ripple 2s ease-out infinite;
        }

        @keyframes hh-spin-outer {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes hh-spin-middle {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(-360deg);
          }
        }

        @keyframes hh-spin-inner {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes hh-core-pulse {
          0%,
          100% {
            transform: translate(-50%, -50%) scale(1);
            box-shadow: 0 0 20px rgba(16, 185, 129, 0.5);
          }
          50% {
            transform: translate(-50%, -50%) scale(1.2);
            box-shadow:
              0 0 40px rgba(139, 92, 246, 0.6),
              0 0 60px rgba(245, 158, 11, 0.4);
          }
        }

        @keyframes hh-core-ripple {
          0% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.3);
          }
          70% {
            box-shadow: 0 0 0 20px rgba(16, 185, 129, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
          }
        }

        /* ─── LOADING TITLE ─── */
        .hh-loading-title {
          font-size: 28px;
          font-weight: 800;
          background: linear-gradient(135deg, #10b981, #8b5cf6, #f59e0b);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 8px;
          animation: hh-title-glow 2.5s infinite alternate;
          letter-spacing: -0.02em;
        }

        @keyframes hh-title-glow {
          0% {
            text-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
          }
          100% {
            text-shadow:
              0 0 20px rgba(139, 92, 246, 0.5),
              0 0 30px rgba(245, 158, 11, 0.3);
          }
        }

        /* ─── LOADING TEXT ─── */
        .hh-loading-text {
          color: rgba(255, 255, 255, 0.7);
          font-size: 14px;
          font-weight: 400;
          animation: hh-text-pulse 2s ease-in-out infinite;
          letter-spacing: 0.5px;
        }

        @keyframes hh-text-pulse {
          0%,
          100% {
            opacity: 0.7;
          }
          50% {
            opacity: 1;
          }
        }

        /* ─── PROGRESS BAR ─── */
        .hh-progress-bar {
          width: 200px;
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          margin: 24px auto 0;
          overflow: hidden;
          position: relative;
        }

        .hh-progress-fill {
          width: 30%;
          height: 100%;
          background: linear-gradient(90deg, #10b981, #8b5cf6, #f59e0b);
          border-radius: 10px;
          animation: hh-progress-move 1.5s ease-in-out infinite;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.5);
        }

        @keyframes hh-progress-move {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        /* ─── REDUCED MOTION ─── */
        @media (prefers-reduced-motion: reduce) {
          .hh-bubble,
          .hh-spinner-ring,
          .hh-spinner-ring-2,
          .hh-spinner-ring-3,
          .hh-spinner-core,
          .hh-loading-title,
          .hh-loading-text,
          .hh-progress-fill {
            animation: none !important;
          }

          .hh-spinner-core {
            transform: translate(-50%, -50%) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
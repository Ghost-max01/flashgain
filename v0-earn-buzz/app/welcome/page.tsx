"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Shield, Award, Star } from "lucide-react";

export default function WelcomePage() {
  const router = useRouter();
  const [displayText, setDisplayText] = useState("");
  const fullText = "Flash Gain";
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [showDots, setShowDots] = useState(false);

  useEffect(() => {
    // Typing animation
    if (currentIndex < fullText.length) {
      const timer = setTimeout(() => {
        setDisplayText(fullText.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, 150);
      return () => clearTimeout(timer);
    } else {
      // After typing completes, show subtitle
      setTimeout(() => setShowSubtitle(true), 500);
      // Then show dots
      setTimeout(() => setShowDots(true), 1000);
    }
  }, [currentIndex, fullText]);

  useEffect(() => {
    // Redirect to dashboard after 6 seconds
    const timer = setTimeout(() => {
      router.push("/dashboard");
    }, 6000);

    return () => clearTimeout(timer);
  }, [router]);

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

      {/* Floating particles */}
      <div className="hh-particles" aria-hidden="true">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="hh-particle"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDuration: `${10 + Math.random() * 20}s`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center px-6">
        {/* Glowing orbs behind text */}
        <div className="hh-glow-orb hh-glow-orb-1"></div>
        <div className="hh-glow-orb hh-glow-orb-2"></div>

        {/* Welcome Text with Typing Animation */}
        <div className="hh-title-container">
          <h1 className="hh-title-main">
            {displayText}
            <span className="hh-cursor">|</span>
          </h1>

          {/* Decorative elements */}
          <div className="hh-title-decoration">
            <Sparkles className="hh-decoration-icon hh-decoration-1" />
            <Star className="hh-decoration-icon hh-decoration-2" />
            <Award className="hh-decoration-icon hh-decoration-3" />
          </div>
        </div>

        {/* Subtitle with Fade Animation */}
        {showSubtitle && <p className="hh-subtitle-main">Financial Services</p>}

        {/* Loading Dots with Bounce Animation */}
        {showDots && (
          <div className="hh-dots-container">
            <div className="hh-dot hh-dot-1"></div>
            <div className="hh-dot hh-dot-2"></div>
            <div className="hh-dot hh-dot-3"></div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="hh-progress-container">
          <div className="hh-progress-bar">
            <div className="hh-progress-fill"></div>
          </div>
        </div>

        {/* Security Badge */}
        <div className="hh-security-badge">
          <Shield className="hh-shield-icon" />
          <span className="hh-security-text">Secured by Flash Gain</span>
        </div>
      </div>

      <style jsx>{`
        /* ─── IMPORT FONT ─── */
        @import url("https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap");

        /* ─── ROOT & BACKGROUND ─── */
        .hh-root {
          font-family: "Syne", sans-serif;
          background: #050d14;
          color: white;
          min-height: 100vh;
          position: relative;
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

        /* ─── PARTICLES ─── */
        .hh-particles {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }

        .hh-particle {
          position: absolute;
          width: 2px;
          height: 2px;
          background: rgba(16, 185, 129, 0.3);
          border-radius: 50%;
          animation: hh-particle-float linear infinite;
        }

        @keyframes hh-particle-float {
          0% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh) translateX(20px);
            opacity: 0;
          }
        }

        /* ─── GLOW ORBS ─── */
        .hh-glow-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          z-index: -1;
        }

        .hh-glow-orb-1 {
          width: 300px;
          height: 300px;
          background: radial-gradient(
            circle,
            rgba(16, 185, 129, 0.3),
            transparent
          );
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: hh-glow-pulse 4s ease-in-out infinite;
        }

        .hh-glow-orb-2 {
          width: 200px;
          height: 200px;
          background: radial-gradient(
            circle,
            rgba(139, 92, 246, 0.2),
            transparent
          );
          top: 30%;
          left: 60%;
          animation: hh-glow-float 6s ease-in-out infinite;
        }

        @keyframes hh-glow-pulse {
          0%,
          100% {
            opacity: 0.5;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 0.8;
            transform: translate(-50%, -50%) scale(1.2);
          }
        }

        @keyframes hh-glow-float {
          0%,
          100% {
            transform: translate(0, 0);
          }
          50% {
            transform: translate(20px, -20px);
          }
        }

        /* ─── TITLE CONTAINER ─── */
        .hh-title-container {
          position: relative;
          margin-bottom: 20px;
        }

        .hh-title-main {
          font-size: 64px;
          font-weight: 800;
          font-family: "JetBrains Mono", monospace;
          background: linear-gradient(135deg, #10b981, #fbbf24, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: hh-title-glow 2s ease-in-out infinite;
          margin-bottom: 16px;
          position: relative;
          text-shadow: 0 0 30px rgba(16, 185, 129, 0.3);
        }

        @keyframes hh-title-glow {
          0%,
          100% {
            filter: drop-shadow(0 0 10px rgba(16, 185, 129, 0.3));
          }
          50% {
            filter: drop-shadow(0 0 30px rgba(139, 92, 246, 0.5));
          }
        }

        .hh-cursor {
          display: inline-block;
          width: 8px;
          margin-left: 4px;
          background: linear-gradient(135deg, #10b981, #fbbf24);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: hh-cursor-blink 1s step-end infinite;
        }

        @keyframes hh-cursor-blink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }

        /* ─── DECORATION ICONS ─── */
        .hh-title-decoration {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
        }

        .hh-decoration-icon {
          position: absolute;
          width: 24px;
          height: 24px;
          color: rgba(255, 255, 255, 0.3);
        }

        .hh-decoration-1 {
          top: -20px;
          left: 20%;
          animation: hh-float-1 3s ease-in-out infinite;
        }

        .hh-decoration-2 {
          bottom: -20px;
          right: 20%;
          animation: hh-float-2 4s ease-in-out infinite;
        }

        .hh-decoration-3 {
          top: 50%;
          right: -30px;
          animation: hh-float-3 5s ease-in-out infinite;
        }

        @keyframes hh-float-1 {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-10px) rotate(10deg);
          }
        }

        @keyframes hh-float-2 {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(10px) rotate(-10deg);
          }
        }

        @keyframes hh-float-3 {
          0%,
          100% {
            transform: translateX(0) rotate(0deg);
          }
          50% {
            transform: translateX(-10px) rotate(10deg);
          }
        }

        /* ─── SUBTITLE ─── */
        .hh-subtitle-main {
          font-size: 24px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 40px;
          animation: hh-fade-in 0.8s ease-out;
          letter-spacing: 2px;
        }

        @keyframes hh-fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* ─── DOTS CONTAINER ─── */
        .hh-dots-container {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin-bottom: 40px;
          animation: hh-dots-appear 0.5s ease-out;
        }

        @keyframes hh-dots-appear {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .hh-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981, #059669);
          animation: hh-dot-bounce 1.4s ease-in-out infinite;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.5);
        }

        .hh-dot-1 {
          animation-delay: 0s;
        }
        .hh-dot-2 {
          animation-delay: 0.2s;
        }
        .hh-dot-3 {
          animation-delay: 0.4s;
        }

        @keyframes hh-dot-bounce {
          0%,
          100% {
            transform: translateY(0);
            box-shadow: 0 0 20px rgba(16, 185, 129, 0.5);
          }
          50% {
            transform: translateY(-15px);
            box-shadow: 0 0 30px rgba(16, 185, 129, 0.8);
          }
        }

        /* ─── PROGRESS BAR ─── */
        .hh-progress-container {
          max-width: 300px;
          margin: 0 auto 30px;
        }

        .hh-progress-bar {
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          overflow: hidden;
        }

        .hh-progress-fill {
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, #10b981, #fbbf24, #8b5cf6);
          border-radius: 10px;
          animation: hh-progress-shrink 6s linear forwards;
          transform-origin: left;
        }

        @keyframes hh-progress-shrink {
          from {
            transform: scaleX(1);
          }
          to {
            transform: scaleX(0);
          }
        }

        /* ─── SECURITY BADGE ─── */
        .hh-security-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 30px;
          width: fit-content;
          margin: 0 auto;
          animation: hh-badge-appear 1s ease-out 2s both;
        }

        @keyframes hh-badge-appear {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .hh-shield-icon {
          width: 16px;
          height: 16px;
          color: #10b981;
          animation: hh-shield-glow 2s ease-in-out infinite;
        }

        @keyframes hh-shield-glow {
          0%,
          100% {
            filter: drop-shadow(0 0 2px #10b981);
          }
          50% {
            filter: drop-shadow(0 0 8px #10b981);
          }
        }

        .hh-security-text {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
          letter-spacing: 0.5px;
        }

        /* ─── REDUCED MOTION ─── */
        @media (prefers-reduced-motion: reduce) {
          .hh-bubble,
          .hh-particle,
          .hh-glow-orb-1,
          .hh-glow-orb-2,
          .hh-decoration-icon,
          .hh-dot,
          .hh-progress-fill,
          .hh-shield-icon {
            animation: none !important;
          }

          .hh-cursor {
            opacity: 1;
          }
        }

        /* ─── RESPONSIVE ─── */
        @media (max-width: 640px) {
          .hh-title-main {
            font-size: 48px;
          }

          .hh-subtitle-main {
            font-size: 20px;
          }
        }
      `}</style>
    </div>
  );
}

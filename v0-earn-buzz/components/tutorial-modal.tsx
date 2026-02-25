"use client";

import { useState, useEffect } from "react";
import {
  Gift,
  Users,
  Wallet,
  TrendingUp,
  CheckCircle2,
  Send,
  Sparkles,
  Award,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TutorialModalProps {
  onClose: () => void;
}

export function TutorialModal({ onClose }: TutorialModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [joinedChannel, setJoinedChannel] = useState(false);
  const [message, setMessage] = useState("");
  const [finished, setFinished] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  // Persist joined state in localStorage
  useEffect(() => {
    const joined = localStorage.getItem("joined_community");
    if (joined === "true") {
      setJoinedChannel(true);
    }
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, [currentStep]);

  const steps = [
    {
      icon: Gift,
      title: "Welcome to Flash Gain!",
      description:
        "Earn welcome bonus and daily cash by completing easy tasks. But first, join our Telegram channel for updates!",
      color: "emerald",
      gradient: "from-emerald-500 to-emerald-600",
    },
    {
      icon: Users,
      title: "Refer & Earn",
      description:
        "Invite friends and earn bonuses for each successful referral. The more you refer, the more you earn!",
      color: "purple",
      gradient: "from-purple-500 to-purple-600",
    },
    {
      icon: TrendingUp,
      title: "Daily Earnings",
      description:
        "Claim rewards every 60 seconds. Tap the claim button and watch your wallet balance grow instantly.",
      color: "amber",
      gradient: "from-amber-500 to-amber-600",
    },
    {
      icon: Wallet,
      title: "Withdraw Anytime",
      description:
        "After completing tasks and reaching minimum earnings, withdrawals unlock instantly.",
      color: "blue",
      gradient: "from-blue-500 to-blue-600",
    },
  ];

  const current = steps[currentStep];
  const Icon = current.icon;

  const handleNext = () => {
    if (currentStep === 0 && !joinedChannel) {
      setMessage("Please join the Telegram channel first before proceeding.");
      return;
    }

    setMessage("");
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      setFinished(true);
      setTimeout(() => {
        try {
          onClose();
        } catch (e) {
          console.error("onClose error", e);
        }
      }, 2000);
    }
  };

  const handleJoinChannel = () => {
    window.open("https://t.me/helpinghandsnews", "_self");
    setJoinedChannel(true);
    setMessage("");
    localStorage.setItem("joined_community", "true");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      aria-modal="true"
      role="dialog"
    >
      <div className="hh-modal max-w-md w-full">
        {/* Animated background bubbles inside modal */}
        <div className="hh-modal-bubbles" aria-hidden="true">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`hh-modal-bubble hh-modal-bubble-${i + 1}`}
            ></div>
          ))}
        </div>

        {/* Icon Section with Gradient */}
        <div
          className={`hh-modal-icon-container bg-gradient-to-br ${current.gradient}`}
        >
          <div className="hh-modal-icon-wrapper">
            <Icon className="hh-modal-icon" />
          </div>
          {currentStep === 0 && !joinedChannel && (
            <div className="hh-sparkle-container">
              <Sparkles className="hh-sparkle-icon" />
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="hh-modal-content" key={animKey}>
          {!finished ? (
            <>
              <h3 className="hh-modal-title">{current.title}</h3>
              <p className="hh-modal-description">{current.description}</p>

              {/* Animated warning message */}
              {message && (
                <div className="hh-warning-message">
                  <span>{message}</span>
                </div>
              )}

              {/* Step 1 logic - No proceed button until joined */}
              {currentStep === 0 ? (
                <div className="hh-modal-actions">
                  {!joinedChannel && (
                    <button onClick={handleJoinChannel} className="hh-join-btn">
                      <Send className="h-4 w-4" />
                      <span>Join Telegram Channel</span>
                      <Sparkles className="h-3 w-3 text-amber-300 animate-pulse" />
                    </button>
                  )}
                  {/* Only show proceed button after joining channel */}
                  {joinedChannel && (
                    <button onClick={handleNext} className="hh-proceed-btn">
                      Proceed
                    </button>
                  )}
                </div>
              ) : (
                <div className="hh-modal-actions">
                  <button onClick={handleNext} className="hh-next-btn">
                    {currentStep === steps.length - 1
                      ? "Finish Tutorial"
                      : "Next"}
                    <Award className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Progress dots */}
              <div className="hh-progress-dots">
                {steps.map((_, i) => (
                  <span
                    key={i}
                    className={`hh-dot ${i === currentStep ? "hh-dot-active" : ""}`}
                  />
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="hh-success-animation">
                <CheckCircle2 className="hh-success-icon" />
              </div>
              <h3 className="hh-success-title">Congratulations!</h3>
              <p className="hh-success-text">
                You're all set to start earning with Flash Gain.
              </p>
              <div className="hh-modal-actions">
                <button onClick={onClose} className="hh-dashboard-btn">
                  Proceed to Dashboard
                </button>
              </div>

              {/* Confetti Animation */}
              <div className="hh-confetti-container" aria-hidden="true">
                <span className="hh-confetti hh-confetti-1">🎉</span>
                <span className="hh-confetti hh-confetti-2">✨</span>
                <span className="hh-confetti hh-confetti-3">🎈</span>
                <span className="hh-confetti hh-confetti-4">🌟</span>
                <span className="hh-confetti hh-confetti-5">⭐</span>
              </div>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .hh-modal {
          background: linear-gradient(135deg, #0d1f2d, #0a1628);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 32px;
          overflow: hidden;
          position: relative;
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5);
          animation: hh-modal-appear 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes hh-modal-appear {
          from {
            opacity: 0;
            transform: scale(0.8) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        /* Modal Bubbles */
        .hh-modal-bubbles {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }

        .hh-modal-bubble {
          position: absolute;
          border-radius: 50%;
          opacity: 0;
          animation: hh-modal-bubble-rise linear infinite;
        }

        .hh-modal-bubble-1 {
          width: 8px;
          height: 8px;
          left: 10%;
          background: radial-gradient(
            circle,
            rgba(16, 185, 129, 0.4),
            transparent
          );
          animation-duration: 8s;
          animation-delay: 0s;
        }
        .hh-modal-bubble-2 {
          width: 14px;
          height: 14px;
          left: 25%;
          background: radial-gradient(
            circle,
            rgba(59, 130, 246, 0.3),
            transparent
          );
          animation-duration: 11s;
          animation-delay: 1.5s;
        }
        .hh-modal-bubble-3 {
          width: 6px;
          height: 6px;
          left: 40%;
          background: radial-gradient(
            circle,
            rgba(16, 185, 129, 0.5),
            transparent
          );
          animation-duration: 9s;
          animation-delay: 3s;
        }
        .hh-modal-bubble-4 {
          width: 18px;
          height: 18px;
          left: 55%;
          background: radial-gradient(
            circle,
            rgba(139, 92, 246, 0.2),
            transparent
          );
          animation-duration: 13s;
          animation-delay: 0.5s;
        }
        .hh-modal-bubble-5 {
          width: 10px;
          height: 10px;
          left: 70%;
          background: radial-gradient(
            circle,
            rgba(16, 185, 129, 0.3),
            transparent
          );
          animation-duration: 10s;
          animation-delay: 2s;
        }
        .hh-modal-bubble-6 {
          width: 5px;
          height: 5px;
          left: 82%;
          background: radial-gradient(
            circle,
            rgba(52, 211, 153, 0.6),
            transparent
          );
          animation-duration: 7s;
          animation-delay: 4s;
        }

        @keyframes hh-modal-bubble-rise {
          0% {
            transform: translateY(100%) scale(0.5);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(-50%) scale(1.2);
            opacity: 0;
          }
        }

        /* Icon Section */
        .hh-modal-icon-container {
          position: relative;
          padding: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          overflow: hidden;
        }

        .hh-modal-icon-wrapper {
          width: 80px;
          height: 80px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: hh-icon-pulse 2s ease-in-out infinite;
          box-shadow: 0 0 30px rgba(16, 185, 129, 0.3);
        }

        .hh-modal-icon {
          width: 40px;
          height: 40px;
          color: white;
        }

        @keyframes hh-icon-pulse {
          0%,
          100% {
            transform: scale(1);
            box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
          }
          50% {
            transform: scale(1.1);
            box-shadow: 0 0 40px rgba(16, 185, 129, 0.5);
          }
        }

        .hh-sparkle-container {
          position: absolute;
          top: 20px;
          right: 20px;
          animation: hh-sparkle-rotate 3s linear infinite;
        }

        .hh-sparkle-icon {
          width: 20px;
          height: 20px;
          color: #fbbf24;
          filter: drop-shadow(0 0 10px #fbbf24);
        }

        @keyframes hh-sparkle-rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        /* Content Section */
        .hh-modal-content {
          padding: 32px;
          text-align: center;
          position: relative;
          z-index: 10;
          background: linear-gradient(
            135deg,
            rgba(5, 13, 20, 0.8),
            rgba(5, 13, 20, 0.9)
          );
        }

        .hh-modal-title {
          font-size: 24px;
          font-weight: 800;
          color: white;
          margin-bottom: 12px;
          animation: hh-title-fade 0.5s ease;
        }

        @keyframes hh-title-fade {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .hh-modal-description {
          color: rgba(255, 255, 255, 0.7);
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 24px;
          animation: hh-desc-fade 0.5s ease 0.1s both;
        }

        @keyframes hh-desc-fade {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Warning Message */
        .hh-warning-message {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 30px;
          padding: 12px 20px;
          margin-bottom: 20px;
          color: #f87171;
          font-size: 13px;
          font-weight: 500;
          animation: hh-warning-slide 0.3s ease;
        }

        @keyframes hh-warning-slide {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Action Buttons */
        .hh-modal-actions {
          margin-bottom: 24px;
        }

        .hh-join-btn {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          border: none;
          border-radius: 16px;
          color: white;
          font-weight: 700;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 20px rgba(37, 99, 235, 0.3);
          animation: hh-btn-glow 2s ease-in-out infinite;
        }

        .hh-join-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(37, 99, 235, 0.5);
        }

        .hh-join-btn:active {
          transform: scale(0.98);
        }

        .hh-proceed-btn {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #10b981, #059669, #047857);
          border: none;
          border-radius: 16px;
          color: white;
          font-weight: 700;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3);
          animation: hh-btn-glow 2s ease-in-out infinite;
        }

        .hh-proceed-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(16, 185, 129, 0.5);
        }

        .hh-proceed-btn:active {
          transform: scale(0.98);
        }

        .hh-next-btn {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          border: none;
          border-radius: 16px;
          color: white;
          font-weight: 700;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 20px rgba(139, 92, 246, 0.3);
        }

        .hh-next-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(139, 92, 246, 0.5);
        }

        .hh-next-btn:active {
          transform: scale(0.98);
        }

        .hh-dashboard-btn {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #10b981, #059669);
          border: none;
          border-radius: 16px;
          color: white;
          font-weight: 700;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3);
        }

        .hh-dashboard-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(16, 185, 129, 0.5);
        }

        .hh-dashboard-btn:active {
          transform: scale(0.98);
        }

        @keyframes hh-btn-glow {
          0%,
          100% {
            box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3);
          }
          50% {
            box-shadow:
              0 4px 30px rgba(16, 185, 129, 0.5),
              0 0 20px rgba(16, 185, 129, 0.2);
          }
        }

        /* Progress Dots */
        .hh-progress-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
        }

        .hh-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          transition: all 0.3s ease;
        }

        .hh-dot-active {
          background: #10b981;
          transform: scale(1.2);
          box-shadow: 0 0 15px #10b981;
          animation: hh-dot-pulse 1.5s ease-in-out infinite;
        }

        @keyframes hh-dot-pulse {
          0%,
          100% {
            box-shadow: 0 0 5px #10b981;
          }
          50% {
            box-shadow: 0 0 15px #10b981;
          }
        }

        /* Success Section */
        .hh-success-animation {
          animation: hh-success-bounce 0.5s ease-out;
          margin-bottom: 16px;
        }

        .hh-success-icon {
          width: 80px;
          height: 80px;
          color: #10b981;
          margin: 0 auto;
        }

        @keyframes hh-success-bounce {
          0% {
            transform: scale(0);
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
          }
        }

        .hh-success-title {
          font-size: 28px;
          font-weight: 800;
          background: linear-gradient(135deg, #10b981, #fbbf24);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 8px;
        }

        .hh-success-text {
          color: rgba(255, 255, 255, 0.7);
          font-size: 14px;
          margin-bottom: 24px;
        }

        /* Confetti */
        .hh-confetti-container {
          position: relative;
          height: 60px;
          margin-top: 20px;
        }

        .hh-confetti {
          position: absolute;
          font-size: 24px;
          opacity: 0;
          transform: translateY(0) scale(0.6);
          animation: hh-confetti-fly 1.8s ease forwards;
        }

        .hh-confetti-1 {
          left: 15%;
          animation-delay: 0.1s;
        }
        .hh-confetti-2 {
          left: 35%;
          animation-delay: 0.25s;
        }
        .hh-confetti-3 {
          left: 55%;
          animation-delay: 0.4s;
        }
        .hh-confetti-4 {
          left: 75%;
          animation-delay: 0.55s;
        }
        .hh-confetti-5 {
          left: 90%;
          animation-delay: 0.7s;
        }

        @keyframes hh-confetti-fly {
          0% {
            opacity: 0;
            transform: translateY(0) scale(0.6);
          }
          30% {
            opacity: 1;
            transform: translateY(-25px) scale(1.1);
          }
          70% {
            transform: translateY(-45px) scale(0.9);
            opacity: 0.8;
          }
          100% {
            transform: translateY(-80px) scale(0.7);
            opacity: 0;
          }
        }

        /* Reduced Motion */
        @media (prefers-reduced-motion: reduce) {
          .hh-modal,
          .hh-modal-bubble,
          .hh-modal-icon-wrapper,
          .hh-sparkle-icon,
          .hh-join-btn,
          .hh-proceed-btn,
          .hh-next-btn,
          .hh-dot-active,
          .hh-success-animation,
          .hh-confetti {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

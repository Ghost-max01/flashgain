"use client";

export const dynamic = "force-dynamic"; // client page, skip prerender

import React, { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Copy, Check, Home, Gamepad2, User, Sparkles, Shield, Landmark, Hash, User2, Bank, CreditCard } from "lucide-react";

function InvestmentPaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const amountParam = searchParams.get("amount") || "";
  const planParam = searchParams.get("plan") || "";
  const fullName = searchParams.get("fullName") || "";
  const referenceId = searchParams.get("ref") || "500404";
  const bankName = "Moniepoint";
  const accountNumber = "5203016033";
  const accountName = "Favour Odinakachukwu";

  const [copiedField, setCopiedField] = React.useState<string | null>(null);
  const [showOpayWarning, setShowOpayWarning] = React.useState<boolean>(true);
  const [copiedRefId, setCopiedRefId] = React.useState(false);
  const timersRef = React.useRef<number[]>([]);

  React.useEffect(() => {
    setShowOpayWarning(true);
    function scheduleCycle() {
      const hideTimer = window.setTimeout(() => {
        setShowOpayWarning(false);
        const showTimer = window.setTimeout(() => {
          setShowOpayWarning(true);
          scheduleCycle();
        }, 10000);
        timersRef.current.push(showTimer);
      }, 4000);
      timersRef.current.push(hideTimer);
    }
    scheduleCycle();
    return () => {
      timersRef.current.forEach((id) => clearTimeout(id));
      timersRef.current = [];
    };
  }, []);

  const formatNumber = (val: string | number) => {
    const n = Number(String(val).replace(/[^0-9.-]/g, ""));
    if (isNaN(n)) return String(val);
    return n.toLocaleString("en-NG");
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleConfirmPayment = () => {
    const rawAmount = String(amountParam).replace(/[^0-9.-]/g, "");
    const params = new URLSearchParams({ fullName, amount: rawAmount });
    router.push(`/paykeys/confirmation?${params.toString()}`);
  };

  const numeric = parseInt((amountParam || "").toString().replace(/[^\d]/g, ""), 10);
  const displayAmount = Number.isNaN(numeric) ? amountParam : `₦${numeric.toLocaleString()}`;

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
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="hh-back-btn">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="hh-title">Investment Payment</h1>
                <p className="hh-subtitle">Complete your transfer</p>
              </div>
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
                  <Sparkles className="h-4 w-4 text-amber-300" />
                </div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Secure Payment</span>
              </div>
              <div className="hh-live-indicator">
                <span className="hh-live-dot"></span>
                <span className="text-xs">Processing</span>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="hh-icon-large mb-3">
                <Shield className="h-10 w-10 text-emerald-300" />
              </div>
              <p className="text-center text-sm text-white/80">
                Complete this bank transfer to proceed with your payment
              </p>
            </div>
          </div>
        </div>

        {/* Amount Card */}
        <div className="hh-card hh-entry-2 flex items-center justify-center py-6">
          <div className="text-center">
            <p className="text-sm text-emerald-400/70 mb-2 uppercase tracking-widest font-semibold">Amount to Transfer</p>
            <h2 className="text-5xl font-black text-white tracking-tight">
              <span className="text-2xl opacity-80">₦</span>
              {formatNumber(amountParam)}
            </h2>
          </div>
        </div>

        {/* Bank Details Card */}
        <div className="hh-card hh-entry-3">
          <div className="space-y-4">
            {/* Bank Name */}
            <div className="hh-detail-item">
              <div className="flex items-center gap-2 mb-1">
                <Landmark className="h-4 w-4 text-emerald-400" />
                <div className="hh-detail-label">Bank Name</div>
              </div>
              <span className="hh-detail-value">{bankName}</span>
            </div>

            {/* Account Number */}
            <div className="hh-detail-item">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-emerald-400" />
                  <div className="hh-detail-label">Account Number</div>
                </div>
                <button
                  onClick={() => copyToClipboard(accountNumber, "account")}
                  className="hh-copy-btn"
                >
                  {copiedField === "account" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <span className="hh-detail-value">{accountNumber}</span>
            </div>

            {/* Account Name */}
            <div className="hh-detail-item">
              <div className="flex items-center gap-2 mb-1">
                <User2 className="h-4 w-4 text-emerald-400" />
                <div className="hh-detail-label">Account Name</div>
              </div>
              <span className="hh-detail-value">{accountName}</span>
            </div>
          </div>
        </div>

        {/* Reference ID */}
        <div className="hh-card hh-entry-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="hh-icon-ring-small">
                <span className="text-xs font-bold">ID</span>
              </div>
              <span className="text-sm text-white/60">Reference ID</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="hh-reference-id">{referenceId}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(referenceId);
                  setCopiedRefId(true);
                  setTimeout(() => setCopiedRefId(false), 2000);
                }}
                className="hh-copy-btn-small"
              >
                {copiedRefId ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* Payment Proof Section */}
        <div className="hh-card hh-proof-card hh-entry-5">
          <h3 className="font-semibold text-amber-300 mb-3 flex items-center gap-2">
            <span className="text-xl">📸</span> Send Payment Proof
          </h3>
          <p className="text-sm text-emerald-200/80 mb-4">
            After making the transfer, please send a screenshot of your payment receipt to our Telegram support team for verification.
          </p>
          <a
            href="https://t.me/helpinghandsupport"
            className="hh-telegram-btn"
          >
            <span className="text-lg">📱</span> Open Telegram Support
          </a>
        </div>

        {/* Confirm Button */}
        <button
          onClick={handleConfirmPayment}
          className="hh-proceed-btn hh-proceed-active w-full hh-entry-6"
        >
          I have made this bank Transfer
        </button>

        {/* Security Note */}
        <div className="hh-card hh-tip-card hh-entry-7">
          <div className="flex items-start gap-3">
            <div className="hh-tip-icon">
              <Shield className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">Secure Transaction</h4>
              <p className="text-sm text-emerald-200/80">
                Your payment is encrypted and securely processed. Never share your banking details with anyone.
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
        <Link href="/about" className="hh-nav-item hh-nav-active">
          <Gamepad2 className="h-5 w-5" />
          <span>About</span>
        </Link>
        <Link href="/refer" className="hh-nav-item">
          <User className="h-5 w-5" />
          <span>Refer</span>
        </Link>
      </div>

      {/* Opay Warning Popup */}
      {showOpayWarning && <OpayWarningPopup onClose={() => setShowOpayWarning(false)} />}

      <style jsx global>{`
        /* ─── IMPORT FONT ─── */
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap');

        /* ─── ROOT & BACKGROUND ─── */
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

        /* ─── HEADER ─── */
        .hh-header {
          background: linear-gradient(180deg, rgba(5,13,20,0.95) 0%, rgba(5,13,20,0.8) 100%);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(16,185,129,0.15);
        }
        .hh-back-btn {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .hh-back-btn:hover {
          background: rgba(255,255,255,0.1);
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
          color: rgba(16,185,129,0.8);
        }
        .hh-amount-badge {
          background: linear-gradient(135deg, rgba(16,185,129,0.2), rgba(245,158,11,0.2));
          border: 1px solid rgba(245,158,11,0.3);
          border-radius: 30px;
          padding: 6px 12px;
        }
        /* ─── CARDS ─── */
        .hh-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 20px;
          backdrop-filter: blur(12px);
          position: relative;
          overflow: hidden;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .hh-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 30px rgba(16,185,129,0.05);
        }
        .hh-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
        }
        .hh-card-hero {
          background: linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,13,20,0.9) 50%, rgba(245,158,11,0.1) 100%);
          border-color: rgba(16,185,129,0.2);
        }
        .hh-proof-card {
          background: linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05));
          border: 1px solid rgba(245,158,11,0.2);
        }
        .hh-tip-card {
          background: linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05));
          border: 1px solid rgba(16,185,129,0.2);
        }
        /* ─── ORBS ─── */
        .hh-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(40px);
          pointer-events: none;
        }
        .hh-orb-1 {
          width: 150px; height: 150px;
          background: radial-gradient(circle, rgba(16,185,129,0.2), transparent);
          top: -40px; right: -40px;
          animation: hh-orb-float 6s ease-in-out infinite;
        }
        .hh-orb-2 {
          width: 100px; height: 100px;
          background: radial-gradient(circle, rgba(245,158,11,0.15), transparent);
          bottom: 20px; left: -20px;
          animation: hh-orb-float 8s ease-in-out infinite reverse;
        }
        @keyframes hh-orb-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(8px, -8px) scale(1.05); }
          66%       { transform: translate(-4px, 6px) scale(0.97); }
        }
        /* ─── ICON RING ─── */
        .hh-icon-ring {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: linear-gradient(135deg, rgba(16,185,129,0.2), rgba(245,158,11,0.2));
          border: 1px solid rgba(245,158,11,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .hh-icon-ring-small {
          width: 24px;
          height: 24px;
          border-radius: 8px;
          background: rgba(16,185,129,0.15);
          border: 1px solid rgba(16,185,129,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .hh-icon-large {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: rgba(16,185,129,0.15);
          border: 2px solid rgba(16,185,129,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: hh-icon-pulse 2s ease-in-out infinite;
        }
        @keyframes hh-icon-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(16,185,129,0.2); }
          50% { transform: scale(1.05); box-shadow: 0 0 30px rgba(16,185,129,0.4); }
        }
        /* ─── LIVE INDICATOR ─── */
        .hh-live-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(16,185,129,0.1);
          border: 1px solid rgba(16,185,129,0.2);
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
          0%, 100% { box-shadow: 0 0 4px #10b981; transform: scale(1); }
          50%       { box-shadow: 0 0 10px #10b981, 0 0 20px rgba(16,185,129,0.4); transform: scale(1.15); }
        }
        /* ─── DETAIL ITEMS ─── */
        .hh-detail-item {
          padding: 14px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 14px;
          transition: all 0.2s ease;
        }
        .hh-detail-item:hover {
          background: rgba(255,255,255,0.05);
        }
        .hh-detail-label {
          font-size: 11px;
          color: #10b981;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .hh-detail-value {
          font-size: 16px;
          font-weight: 600;
          color: white;
          font-family: 'JetBrains Mono', monospace;
          display: block;
          margin-top: 2px;
        }
        .hh-copy-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.6);
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .hh-copy-btn:hover {
          background: rgba(16,185,129,0.1);
          border-color: rgba(16,185,129,0.3);
          color: #10b981;
          transform: scale(1.05);
        }
        .hh-copy-btn-small {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.4);
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .hh-copy-btn-small:hover {
          background: rgba(16,185,129,0.1);
          border-color: rgba(16,185,129,0.3);
          color: #10b981;
        }
        .hh-reference-id {
          font-family: 'JetBrains Mono', monospace;
          font-size: 16px;
          font-weight: 700;
          color: #fbbf24;
          letter-spacing: 1px;
        }
        /* ─── TELEGRAM BUTTON ─── */
        .hh-telegram-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          border-radius: 14px;
          font-weight: 700;
          font-size: 15px;
          color: white;
          transition: all 0.2s ease;
          border: 1px solid rgba(255,255,255,0.1);
          text-decoration: none;
        }
        .hh-telegram-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(37,99,235,0.4);
        }
        .hh-telegram-btn:active {
          transform: scale(0.98);
        }
        /* ─── PROCEED BUTTON ─── */
        .hh-proceed-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 18px;
          border-radius: 16px;
          font-weight: 800;
          font-size: 16px;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .hh-proceed-active {
          background: linear-gradient(135deg, #10b981, #059669, #047857);
          color: white;
          box-shadow: 0 6px 30px rgba(16,185,129,0.4);
          animation: hh-btn-glow 2s ease-in-out infinite;
        }
        .hh-proceed-active:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 40px rgba(16,185,129,0.6);
        }
        .hh-proceed-active:active {
          transform: scale(0.98);
        }
        @keyframes hh-btn-glow {
          0%, 100% { box-shadow: 0 6px 30px rgba(16,185,129,0.4); }
          50% { box-shadow: 0 6px 40px rgba(16,185,129,0.6), 0 0 30px rgba(16,185,129,0.3); }
        }
        /* ─── TIP ICON ─── */
        .hh-tip-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(16,185,129,0.15);
          border: 1px solid rgba(16,185,129,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        /* ─── BOTTOM NAV ─── */
        .hh-bottom-nav {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          max-width: 448px;
          margin: 0 auto;
          background: rgba(5,13,20,0.92);
          backdrop-filter: blur(20px);
          border-top: 1px solid rgba(255,255,255,0.08);
          display: flex;
          justify-content: space-around;
          align-items: center;
          height: 64px;
          z-index: 100;
          box-shadow: 0 -10px 40px rgba(0,0,0,0.5);
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
          transition: color 0.2s, transform 0.2s;
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
          filter: drop-shadow(0 0 6px rgba(16,185,129,0.6));
        }
        /* ─── ANIMATIONS ─── */
        .hh-entry-1 { animation: hh-entry 0.5s ease-out 0.0s both; }
        .hh-entry-2 { animation: hh-entry 0.5s ease-out 0.1s both; }
        .hh-entry-3 { animation: hh-entry 0.5s ease-out 0.2s both; }
        .hh-entry-4 { animation: hh-entry 0.5s ease-out 0.3s both; }
        .hh-entry-5 { animation: hh-entry 0.5s ease-out 0.4s both; }
        .hh-entry-6 { animation: hh-entry 0.5s ease-out 0.5s both; }
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
          .hh-bubble, .hh-orb-1, .hh-orb-2,
          .hh-live-dot, .hh-proceed-active,
          .hh-icon-large, [class*="hh-entry-"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

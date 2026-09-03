"use client";

import { useEffect, useState, useRef } from "react";
import { X, ArrowRight, Award, Sparkles, Clock, Gift, Wallet, Users, TrendingUp, Zap, ChevronRight } from "lucide-react";

type Step = {
  id: string;
  title: string;
  desc: string;
  target?: string; // data-tour selector e.g. [data-tour="trust"]
  icon: any;
  color: string;
};

const STEPS: Step[] = [
  { id: "welcome", title: "Welcome to FlashGain 9ja!", desc: "Your money moves here. Let's take a 30-sec moving tour — you'll see exactly where to earn.", icon: Sparkles, color: "from-emerald-500 to-teal-600" },
  { id: "balance", title: "Your Available Balance", desc: "This is your real balance. Every tap, task and referral lands here instantly.", target: '[data-tour="balance"]', icon: Wallet, color: "from-emerald-500 to-emerald-600" },
  { id: "tap", title: "Tap to Earn Orb", desc: "Tap the green orb in your Balance box. 100 energy → exhaust 10 mins → auto regen. Every tap = ₦100.", target: '[data-tour="tap-orb"]', icon: Zap, color: "from-emerald-500 to-cyan-600" },
  { id: "trust", title: "Trust Score", desc: "Everything compounds: 5 mins = +2, 10 referrals = +2, each navigation = +1, each payment = +5.", target: '[data-tour="trust"]', icon: Award, color: "from-blue-500 to-violet-600" },
  { id: "quick", title: "Quick Actions", desc: "Tasks, Investments, Loans and more — one tap to start earning.", target: '[data-tour="quick-actions"]', icon: TrendingUp, color: "from-amber-500 to-orange-600" },
  { id: "playwin", title: "Play & Win", desc: "Stake & Spin & Win lives here. Live pool + 30% win wheel.", target: '[data-tour="play-win"]', icon: Gift, color: "from-amber-500 to-emerald-600" },
  { id: "referral", title: "Refer & Earn", desc: "Share your link. Every friend = ₦5,000. Watch Trust Score rise as you move.", target: '[data-tour="referral"]', icon: Users, color: "from-violet-500 to-blue-600" },
];

export function GuidedOnboarding({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [leaving, setLeaving] = useState(false);

  const step = STEPS[idx];
  const isWelcome = step.id === "welcome";
  const isLast = idx === STEPS.length - 1;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => { if (open) setIdx(0); }, [open]);

  useEffect(() => {
    if (!open) return;
    function update() {
      if (!step.target) { setRect(null); return; }
      const el = document.querySelector(step.target) as HTMLElement | null;
      if (!el) { setRect(null); return; }
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      setTimeout(() => setRect(el.getBoundingClientRect()), 400);
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const t = setTimeout(update, 600);
    return () => { window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); clearTimeout(t); };
  }, [open, idx, step.target]);

  const close = () => {
    setLeaving(true);
    setTimeout(() => { setLeaving(false); onClose(); }, 260);
  };
  const next = () => {
    if (isLast) close();
    else setIdx(i => i + 1);
  };
  const prev = () => setIdx(i => Math.max(0, i - 1));

  if (!open) return null;
  const Icon = step.icon;

  return (
    <div className={`fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 ${leaving ? "pointer-events-none" : ""}`} role="dialog" aria-modal="true">
      {/* dim + spotlight */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px] transition-opacity" onClick={close} />
      {/* spotlight cutout */}
      {rect && (
        <div
          className="absolute rounded-[18px] transition-all duration-[620ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            left: Math.max(8, rect.left - 10),
            top: Math.max(8, rect.top - 10),
            width: Math.min(window.innerWidth - 16, rect.width + 20),
            height: rect.height + 20,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.62), 0 0 0 2px rgba(16,185,129,0.9), 0 12px 40px rgba(16,185,129,0.35)",
            pointerEvents: "none",
          }}
        >
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full" />
        </div>
      )}

      {/* moving beam for welcome */}
      {isWelcome && <div className="absolute inset-0 pointer-events-none overflow-hidden"><div className="absolute h-[2px] w-[160%] bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent animate-[hh-beam_1.8s_linear_infinite]" style={{ top: "42%" }} /></div>}

      {/* card */}
      <div className={`relative w-full max-w-md rounded-[28px] overflow-hidden border border-white/10 bg-gradient-to-br from-[#0d1f2d] via-[#0a1628] to-[#050d14] shadow-[0_30px_80px_rgba(0,0,0,0.6)] ${leaving ? "animate-[hh-out_0.26s_ease_forwards]" : "animate-[hh-in_0.42s_cubic-bezier(0.22,1,0.36,1)]"}`}>
        <div className="absolute inset-0 pointer-events-none opacity-20" style={{ background: "radial-gradient(600px 220px at 70% -10%, rgba(16,185,129,0.25), transparent 60%), radial-gradient(500px 300px at -10% 80%, rgba(59,130,246,0.18), transparent 60%)" }} />
        {/* top icon bar */}
        <div className={`relative h-[112px] flex items-center justify-center bg-gradient-to-br ${step.color} overflow-hidden`}>
          <div className="absolute w-[180px] h-[180px] rounded-full bg-white/12 blur-2xl" />
          <div className="relative w-20 h-20 rounded-full bg-white/15 border border-white/20 flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.2)] animate-[hh-pulse_1.8s_ease-in-out_infinite]">
            <Icon className="w-10 h-10 text-white" />
          </div>
          <button onClick={close} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/20 border border-white/15 flex items-center justify-center text-white/80 hover:bg-black/30">
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all duration-400 ${i === idx ? "w-7 bg-white" : i < idx ? "w-3 bg-white/70" : "w-3 bg-white/30"}`} />
            ))}
          </div>
        </div>

        <div className="relative p-6 text-center">
          <h3 className="text-[20px] font-black text-white tracking-tight">{step.title}</h3>
          <p className="text-sm text-white/65 leading-relaxed mt-2 min-h-[42px]">{step.desc}</p>

          <div className="flex gap-3 mt-6">
            {idx > 0 && <button onClick={prev} className="px-5 py-3 rounded-full bg-white/5 border border-white/10 text-white font-bold text-sm">Back</button>}
            <button onClick={close} className="flex-1 py-3 rounded-full bg-white/5 border border-white/10 text-white/70 font-bold text-sm">Skip</button>
            <button onClick={next} className="flex-1 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(16,185,129,0.35)]">
              {isLast ? "Start Earning" : "Next"} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-white/35 mt-3 flex items-center justify-center gap-1"><Clock className="w-3 h-3" /> {idx + 1} / {STEPS.length} — moving guide</p>
        </div>
      </div>

      <style>{`
        @keyframes hh-in { from { opacity:0; transform: translateY(16px) scale(0.96); } to { opacity:1; transform: translateY(0) scale(1); } }
        @keyframes hh-out { to { opacity:0; transform: translateY(10px) scale(0.98); } }
        @keyframes hh-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
        @keyframes hh-beam { from { transform: translateX(-60%); } to { transform: translateX(60%); } }
      `}</style>
    </div>
  );
}

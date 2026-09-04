"use client";

import { useEffect, useState } from "react";
import { X, ArrowRight, Award, Sparkles, Clock, Gift, Wallet, Users, TrendingUp, Zap, ChevronRight } from "lucide-react";

type Step = {
  id: string;
  title: string;
  desc: string;
  target?: string;
  icon: any;
  color: string;
};

const STEPS: Step[] = [
  { id: "welcome", title: "Welcome to FlashGain 9ja! 👋", desc: "30-sec moving tour — follow the highlight!", icon: Sparkles, color: "from-emerald-500 to-teal-600" },
  { id: "balance", title: "Your Balance", desc: "Every tap, task & referral lands here instantly.", target: '[data-tour="balance"]', icon: Wallet, color: "from-emerald-500 to-emerald-600" },
  { id: "tap", title: "Tap Orb", desc: "Tap the green orb — 100 energy, ₦100 per tap.", target: '[data-tour="tap-orb"]', icon: Zap, color: "from-emerald-500 to-cyan-600" },
  { id: "trust", title: "Trust Score", desc: "Earn: 5 mins +2, 10 referrals +2, nav +1, payment +5.", target: '[data-tour="trust"]', icon: Award, color: "from-blue-500 to-violet-600" },
  { id: "quick", title: "Quick Actions", desc: "Tasks, Investments, Loans — one tap to start.", target: '[data-tour="quick-actions"]', icon: TrendingUp, color: "from-amber-500 to-orange-600" },
  { id: "playwin", title: "Play & Win", desc: "Stake & Spin wheel — live pool + 30% win.", target: '[data-tour="play-win"]', icon: Gift, color: "from-amber-500 to-emerald-600" },
  { id: "referral", title: "Refer & Earn", desc: "Share link → ₦5,000 per friend!", target: '[data-tour="referral"]', icon: Users, color: "from-violet-500 to-blue-600" },
];

export function GuidedOnboarding({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [tipPos, setTipPos] = useState<{ top: number; left: number; placement: "top" | "bottom" } | null>(null);

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
      try {
        if (!step.target) { setRect(null); setTipPos(null); return; }
        const el = document.querySelector(step.target) as HTMLElement | null;
        if (!el) { setRect(null); setTipPos(null); return; }
        // Push the target up so the tooltip + Next button stay visible (fixes 2/7 hidden Next)
        // Use block:'nearest' first, then fine-adjust so card never clips below viewport
        try {
          const vwTmp = window.innerWidth; const vhTmp = window.innerHeight;
          const estCardH = 156; const gapTmp = 14;
          const r0 = el.getBoundingClientRect();
          const willFitBelow = vhTmp - r0.bottom >= estCardH + gapTmp + 12;
          // if won't fit below, scroll target higher (toward top) to make room
          if (!willFitBelow && r0.top > vhTmp * 0.35) {
            el.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
            // nudge viewport up a bit to expose Next
            setTimeout(() => { try { window.scrollBy({ top: -8, behavior: "smooth" }); } catch {} }, 380);
          } else {
            el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
          }
        } catch {}
        setTimeout(() => {
          try {
            const r = el.getBoundingClientRect();
            setRect(r);
            // compute tooltip position — keep compact like other steps and never hide Next
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const cardW = 268;
            const cardH = 156; // compact height matching actual card (fixes 2/7)
            const gap = 12;
            const safeBottomPad = 10; // keep Next inside viewport
            const spaceBelow = vh - r.bottom;
            const spaceAbove = r.top;
            let top: number;
            let placement: "top" | "bottom";
            if (spaceBelow >= cardH + gap + safeBottomPad) {
              top = r.bottom + gap;
              placement = "bottom";
            } else if (spaceAbove >= cardH + gap + safeBottomPad) {
              top = r.top - cardH - gap;
              placement = "top";
            } else {
              // not enough room either side — pin inside viewport and let target scroll away
              // prefer bottom but clamp hard so Next is always visible
              if (spaceBelow >= spaceAbove) {
                top = Math.min(vh - cardH - safeBottomPad, r.bottom + gap);
                top = Math.max(safeBottomPad, top);
                placement = "bottom";
              } else {
                top = Math.max(safeBottomPad, r.top - cardH - gap);
                top = Math.min(vh - cardH - safeBottomPad, top);
                placement = "top";
              }
            }
            // final safety clamp
            top = Math.max(safeBottomPad, Math.min(vh - cardH - safeBottomPad, top));
            let left = r.left + r.width / 2 - cardW / 2;
            left = Math.max(8, Math.min(vw - cardW - 8, left));
            setTipPos({ top, left, placement });
          } catch { setRect(null); setTipPos(null); }
        }, 420);
      } catch { setRect(null); setTipPos(null); }
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const t = setTimeout(update, 650);
    return () => { try { window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); clearTimeout(t); } catch {} }
  }, [open, idx, step.target]);

  const close = () => {
    setLeaving(true);
    setTimeout(() => { setLeaving(false); onClose(); }, 240);
  };
  const next = () => { if (isLast) close(); else setIdx(i => i + 1); };
  const prev = () => setIdx(i => Math.max(0, i - 1));

  if (!open) return null;
  if (!step) return null;
  const Icon = step.icon || Sparkles;

  // small welcome centered, others are tiny anchored tooltips
  const showAnchored = !!rect && !!tipPos && !isWelcome;

  return (
    <div className={`fixed inset-0 z-[70] ${leaving ? "pointer-events-none" : ""}`} role="dialog" aria-modal="true">
      {/* dim */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[1px] transition-opacity" onClick={close} />

      {/* spotlight cutout — tight highlight around the real element */}
      {rect && (
        <div
          className="absolute rounded-[14px] transition-all duration-[560ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            left: Math.max(6, rect.left - 6),
            top: Math.max(6, rect.top - 6),
            width: Math.min((typeof window !== "undefined" ? window.innerWidth : 390) - 12, rect.width + 12),
            height: rect.height + 12,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.62), 0 0 0 2px rgba(16,185,129,0.95), 0 8px 28px rgba(16,185,129,0.35)",
            pointerEvents: "none",
          }}
        >
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full" />
        </div>
      )}

      {/* moving beam for welcome */}
      {isWelcome && <div className="absolute inset-0 pointer-events-none overflow-hidden"><div className="absolute h-[2px] w-[160%] bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent animate-[hh-beam_1.8s_linear_infinite]" style={{ top: "42%" }} /></div>}

      {/* WELCOME — tiny centered card */}
      {isWelcome && (
        <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
          <div className={`pointer-events-auto relative w-[300px] rounded-[18px] overflow-hidden border border-white/10 bg-gradient-to-br from-[#0d1f2d] via-[#0a1628] to-[#050d14] shadow-[0_20px_60px_rgba(0,0,0,0.6)] ${leaving ? "animate-[hh-out_0.24s_ease_forwards]" : "animate-[hh-in_0.36s_cubic-bezier(0.22,1,0.36,1)]"}`}>
            <div className={`h-[52px] flex items-center gap-2.5 px-3.5 bg-gradient-to-br ${step.color} relative overflow-hidden`}>
              <div className="w-8 h-8 rounded-full bg-white/15 border border-white/20 flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-white" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-black text-white leading-none truncate">{step.title}</div>
                <div className="text-[10px] text-white/70 font-bold">{idx + 1} / {STEPS.length}</div>
              </div>
              <button onClick={close} className="w-6 h-6 rounded-full bg-black/20 border border-white/15 flex items-center justify-center text-white/80"><X className="w-3 h-3" /></button>
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">{STEPS.map((_, i) => (<span key={i} className={`h-1 rounded-full transition-all ${i === idx ? "w-5 bg-white" : i < idx ? "w-2 bg-white/60" : "w-2 bg-white/25"}`} />))}</div>
            </div>
            <div className="p-3.5">
              <p className="text-[12px] text-white/70 leading-snug">{step.desc}</p>
              <div className="flex gap-2 mt-3">
                <button onClick={close} className="flex-1 py-2 rounded-full bg-white/5 border border-white/10 text-white/60 font-bold text-xs">Skip</button>
                <button onClick={next} className="flex-1 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs flex items-center justify-center gap-1">Next <ArrowRight className="w-3 h-3" /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ANCHORED — tiny moving tooltip that follows the spotlight */}
      {showAnchored && tipPos && (
        <div
          className={`absolute w-[268px] rounded-[16px] overflow-hidden border border-white/10 bg-gradient-to-br from-[#0d1f2d] via-[#0e1e2e] to-[#050d14] shadow-[0_16px_40px_rgba(0,0,0,0.55)] ${leaving ? "animate-[hh-out_0.22s_ease_forwards]" : "animate-[hh-in-tip_0.42s_cubic-bezier(0.22,1,0.36,1)]"}`}
          style={{ top: tipPos.top, left: tipPos.left, transition: "top 560ms cubic-bezier(0.22,1,0.36,1), left 560ms cubic-bezier(0.22,1,0.36,1)" }}
        >
          {/* arrow pointing to spotlight */}
          <div className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-[#0d1f2d] border-white/10 rotate-45 ${tipPos.placement === "bottom" ? "-top-1.5 border-l border-t" : "-bottom-1.5 border-r border-b"}`} style={{ background: tipPos.placement === "bottom" ? "#0d1f2d" : "#050d14" }} />
          {/* compact header */}
          <div className={`h-[44px] flex items-center gap-2.5 px-3 bg-gradient-to-br ${step.color} relative overflow-hidden`}>
            <div className="w-7 h-7 rounded-full bg-white/15 border border-white/20 flex items-center justify-center shrink-0"><Icon className="w-3.5 h-3.5 text-white" /></div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-black text-white leading-none truncate">{step.title}</div>
              <div className="text-[10px] text-white/70 font-bold flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {idx + 1}/{STEPS.length}</div>
            </div>
            <button onClick={close} className="w-6 h-6 rounded-full bg-black/20 border border-white/15 flex items-center justify-center text-white/70 shrink-0"><X className="w-3 h-3" /></button>
          </div>
          <div className="px-3 pt-2.5 pb-3">
            {/* dots */}
            <div className="flex gap-1 mb-1.5">{STEPS.map((_, i) => (<span key={i} className={`h-1 rounded-full transition-all ${i === idx ? "w-4 bg-emerald-400" : i < idx ? "w-2 bg-emerald-400/50" : "w-2 bg-white/20"}`} />))}</div>
            <p className="text-[11.5px] text-white/65 leading-snug min-h-[30px]">{step.desc}</p>
            <div className="flex gap-1.5 mt-2.5">
              {idx > 0 && <button onClick={prev} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white font-bold text-xs flex items-center gap-1"><ChevronRight className="w-3 h-3 rotate-180" /> Back</button>}
              <button onClick={close} className="flex-1 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 font-bold text-xs">Skip</button>
              <button onClick={next} className="flex-1 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs flex items-center justify-center gap-1 shadow-[0_6px_14px_rgba(16,185,129,0.3)]">
                {isLast ? "Done ✓" : "Next"} <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* fallback if element not found — tiny bottom sheet */}
      {!showAnchored && !isWelcome && rect === null && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-[300px]">
          <div className={`relative rounded-[16px] overflow-hidden border border-white/10 bg-gradient-to-br from-[#0d1f2d] via-[#0a1628] to-[#050d14] shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-3 flex items-center gap-2.5 ${leaving ? "animate-[hh-out_0.22s_ease_forwards]" : "animate-[hh-in_0.36s_ease]"}`}>
            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center shrink-0`}><Icon className="w-4 h-4 text-white" /></div>
            <div className="flex-1 min-w-0"><div className="text-xs font-black text-white">{step.title}</div><div className="text-[11px] text-white/60 truncate">{step.desc}</div></div>
            <button onClick={next} className="px-3 py-2 rounded-full bg-emerald-500 text-white font-black text-xs shrink-0">Next</button>
            <button onClick={close} className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center"><X className="w-3 h-3 text-white/70" /></button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes hh-in { from { opacity:0; transform: translateY(10px) scale(0.96); } to { opacity:1; transform: translateY(0) scale(1); } }
        @keyframes hh-in-tip { from { opacity:0; transform: scale(0.92); } to { opacity:1; transform: scale(1); } }
        @keyframes hh-out { to { opacity:0; transform: translateY(8px) scale(0.97); } }
        @keyframes hh-beam { from { transform: translateX(-60%); } to { transform: translateX(60%); } }
      `}</style>
    </div>
  );
}

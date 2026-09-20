"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, Megaphone, Headset } from "lucide-react";
import { safeParse } from "@/lib/safe-storage";
import { getMoneymateSupportReply, SUPPORT_GREETING } from "@/lib/Moneymate-support-replies";
import { showLocalNotification } from "@/services/notification-service";
import { BottomNav } from "@/components/bottom-nav";

interface ChatMsg {
  id: string;
  from: "user" | "support";
  text: string;
  at: number;
}

const CHAT_KEY = "tivexx-support-chat";
const UNREAD_KEY = "tivexx-support-unread";
const TELEGRAM_SUPPORT = "https://t.me/Earnbuzzsupport";
const TELEGRAM_CHANNEL = "https://t.me/Moneymate9janews";

function newId() {
  try {
    if (typeof crypto !== "undefined" && (crypto as any).randomUUID) return (crypto as any).randomUUID();
  } catch {}
  return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

function bumpUnread() {
  try {
    const n = Number(localStorage.getItem(UNREAD_KEY) || 0) || 0;
    localStorage.setItem(UNREAD_KEY, String(n + 1));
    window.dispatchEvent(new Event("tivexx:support-unread"));
  } catch {}
}

export default function ChatsPage() {
  const router = useRouter();
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [userName, setUserName] = useState("there");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("tivexx-user");
    if (!raw) { router.push("/login"); return; }
    const u = safeParse<any>(raw, null);
    if (!u) { router.push("/login"); return; }
    setUserName(String(u.name || "there").split(" ")[0]);
    setMsgs(safeParse<ChatMsg[]>(localStorage.getItem(CHAT_KEY), []));
    // Opening chats clears the unread badge.
    try {
      localStorage.setItem(UNREAD_KEY, "0");
      window.dispatchEvent(new Event("tivexx:support-unread"));
    } catch {}
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs]);

  useEffect(() => {
    return () => { if (replyTimer.current) clearTimeout(replyTimer.current); };
  }, []);

  const persist = (list: ChatMsg[]) => {
    setMsgs(list);
    try { localStorage.setItem(CHAT_KEY, JSON.stringify(list.slice(-200))); } catch {}
  };

  const send = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    const mine: ChatMsg = { id: newId(), from: "user", text: clean.slice(0, 500), at: Date.now() };
    const next = [...msgs, mine];
    persist(next);
    setDraft("");
    // SAME automated response as Moneymate support (dashboard popup + /api/chat).
    if (replyTimer.current) clearTimeout(replyTimer.current);
    replyTimer.current = setTimeout(() => {
      const auto = getMoneymateSupportReply(clean);
      const lines = [auto.text];
      if (auto.link) lines.push(`\n${auto.linkLabel || "Open link"}: ${auto.link}`);
      if (auto.followUpMenu) lines.push(`\n${auto.followUpMenu}`);
      const reply: ChatMsg = {
        id: newId(),
        from: "support",
        text: lines.join("\n"),
        at: Date.now(),
      };
      setMsgs((prev) => {
        const updated = [...prev, reply];
        try { localStorage.setItem(CHAT_KEY, JSON.stringify(updated.slice(-200))); } catch {}
        return updated;
      });
      if (document.hidden) {
        bumpUnread();
        // Tab hidden/minimized but app open: surface the reply as a system
        // notification too (no-op unless permission was granted).
        try { showLocalNotification("💬 Support reply", { body: reply.text.slice(0, 120), data: { url: "/chats" } as any }); } catch {}
      }
    }, 1200);
  };

  const fmtTime = (at: number) => {
    try {
      return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date(at));
    } catch { return ""; }
  };

  return (
    <div className="hh-root min-h-screen pb-28 relative overflow-hidden">
      <div className="hh-bubbles-container" aria-hidden="true">
        {[...Array(12)].map((_, i) => (
          <div key={i} className={`hh-bubble hh-bubble-${i + 1}`}></div>
        ))}
      </div>
      <div className="hh-mesh-overlay" aria-hidden="true"></div>

      {/* Header */}
      <div className="sticky top-0 z-10 hh-header">
        <div className="max-w-md mx-auto px-6 pt-8 pb-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <button className="hh-back-btn" aria-label="Back">
                <ArrowLeft className="h-5 w-5" />
              </button>
            </Link>
            <div className="flex-1">
              <h1 className="hh-title">Chats</h1>
              <p className="hh-subtitle flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                Support is online
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 space-y-4 pt-2 relative z-10 pb-6">
        {/* Broadcast channel card */}
        <a
          href={TELEGRAM_CHANNEL}
          target="_blank"
          rel="noreferrer"
          className="block w-full rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 p-3.5 flex items-center gap-3"
        >
          <span className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Megaphone className="h-5 w-5 text-amber-300" />
          </span>
          <div className="flex-1">
            <div className="text-sm font-bold text-white">Broadcast Channel</div>
            <div className="text-xs text-amber-300/80">Withdrawals, updates & announcements drop here first</div>
          </div>
          <span className="text-xs font-black text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded-full">Open</span>
        </a>

        {/* Thread */}
        <div className="hh-card !p-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
            <span className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Headset className="h-4 w-4 text-emerald-300" />
            </span>
            <div>
              <div className="text-sm font-bold text-white">Moneymate Support</div>
              <div className="text-[11px] text-white/50">Typically replies within 24 hours</div>
            </div>
          </div>

          <div className="py-4 space-y-3 min-h-[220px] max-h-[46vh] overflow-y-auto">
            {msgs.length === 0 && (
              <div className="text-center text-sm text-white/50 pt-8">
                <p className="font-bold text-white/70">Hi {userName} 👋</p>
                <p className="mt-1 text-xs whitespace-pre-line">{SUPPORT_GREETING}</p>
              </div>
            )}
            {msgs.map((m) => (
              <div key={m.id} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.from === "user"
                      ? "bg-emerald-500 text-white rounded-br-md"
                      : "bg-white/10 border border-white/10 text-white rounded-bl-md"
                  }`}
                >
                  <div>{m.text}</div>
                  <div className={`text-[10px] mt-1 ${m.from === "user" ? "text-white/70" : "text-white/40"}`}>{fmtTime(m.at)}</div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts — same 1-5 menu as Moneymate support */}
          <div className="flex gap-2 overflow-x-auto pb-3 pt-1">
            {["1", "2", "3", "4", "5"].map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-full bg-white/5 border border-white/15 text-emerald-300"
              >
                {q === "1" ? "1 • About" : q === "2" ? "2 • Earn" : q === "3" ? "3 • Withdrawals" : q === "4" ? "4 • Referral" : "5 • Verification"}
              </button>
            ))}
            <a
              href={TELEGRAM_SUPPORT}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-xs font-black px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300"
            >
              Talk to a human →
            </a>
          </div>

          {/* Composer */}
          <div className="flex gap-2 pt-1">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(draft); }}
              placeholder="Type your message…"
              maxLength={500}
              className="flex-1 rounded-full bg-black/30 border border-white/15 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-emerald-500/50"
            />
            <button
              onClick={() => send(draft)}
              aria-label="Send"
              className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center shrink-0 transition"
            >
              <Send className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      <BottomNav />

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800;900&display=swap');
        .hh-root { font-family: 'Syne', sans-serif; background: #050d14; color: white; min-height: 100vh; }
        .hh-bubbles-container { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
        .hh-bubble { position: absolute; border-radius: 50%; opacity: 0; animation: hh-bubble-rise linear infinite; }
        .hh-bubble-1 { width: 8px; height: 8px; left: 10%; background: radial-gradient(circle, rgba(16,185,129,0.6), transparent); animation-duration: 8s; }
        .hh-bubble-2 { width: 14px; height: 14px; left: 25%; background: radial-gradient(circle, rgba(59,130,246,0.5), transparent); animation-duration: 11s; animation-delay: 1.5s; }
        .hh-bubble-3 { width: 6px; height: 6px; left: 40%; background: radial-gradient(circle, rgba(16,185,129,0.7), transparent); animation-duration: 9s; animation-delay: 3s; }
        .hh-bubble-4 { width: 18px; height: 18px; left: 55%; background: radial-gradient(circle, rgba(139,92,246,0.4), transparent); animation-duration: 13s; animation-delay: 0.5s; }
        .hh-bubble-5 { width: 10px; height: 10px; left: 70%; background: radial-gradient(circle, rgba(16,185,129,0.5), transparent); animation-duration: 10s; animation-delay: 2s; }
        .hh-bubble-6 { width: 5px; height: 5px; left: 82%; background: radial-gradient(circle, rgba(52,211,153,0.8), transparent); animation-duration: 7s; animation-delay: 4s; }
        .hh-bubble-7 { width: 12px; height: 12px; left: 15%; background: radial-gradient(circle, rgba(59,130,246,0.4), transparent); animation-duration: 12s; animation-delay: 5s; }
        .hh-bubble-8 { width: 7px; height: 7px; left: 35%; background: radial-gradient(circle, rgba(16,185,129,0.6), transparent); animation-duration: 9.5s; animation-delay: 2.5s; }
        .hh-bubble-9 { width: 20px; height: 20px; left: 60%; background: radial-gradient(circle, rgba(16,185,129,0.2), transparent); animation-duration: 15s; animation-delay: 1s; }
        .hh-bubble-10 { width: 9px; height: 9px; left: 88%; background: radial-gradient(circle, rgba(139,92,246,0.5), transparent); animation-duration: 10.5s; animation-delay: 6s; }
        .hh-bubble-11 { width: 4px; height: 4px; left: 5%; background: radial-gradient(circle, rgba(52,211,153,0.9), transparent); animation-duration: 6.5s; animation-delay: 3.5s; }
        .hh-bubble-12 { width: 16px; height: 16px; left: 48%; background: radial-gradient(circle, rgba(59,130,246,0.3), transparent); animation-duration: 14s; animation-delay: 7s; }
        @keyframes hh-bubble-rise { 0% { transform: translateY(100vh) scale(0.5); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 0.6; } 100% { transform: translateY(-10vh) scale(1.2); opacity: 0; } }
        .hh-mesh-overlay { position: fixed; inset: 0; background: radial-gradient(ellipse 60% 40% at 20% 80%, rgba(16,185,129,0.07) 0%, transparent 60%), radial-gradient(ellipse 50% 50% at 80% 20%, rgba(59,130,246,0.06) 0%, transparent 60%); pointer-events: none; z-index: 0; }
        .hh-header { background: linear-gradient(180deg, rgba(5,13,20,0.95) 0%, rgba(5,13,20,0.8) 100%); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(16,185,129,0.15); }
        .hh-back-btn { width: 40px; height: 40px; border-radius: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; color: white; }
        .hh-title { font-size: 20px; font-weight: 800; color: white; line-height: 1.2; }
        .hh-subtitle { font-size: 12px; color: rgba(16,185,129,0.8); }
        .hh-card { background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 20px; backdrop-filter: blur(12px); position: relative; overflow: hidden; }
      `}</style>
    </div>
  );
}

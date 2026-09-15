"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, Gamepad2, MessagesSquare, User as UserIcon, CircleUserRound, Award } from "lucide-react";

// Single shared bottom nav — Home • About • Chats • Refer & Earn • Profile.
// Self-contained styling (bv- classes) so it looks identical on every page,
// including pages that never had a bottom nav before.
const ITEMS = [
  { href: "/dashboard", label: "Home", Icon: Home, match: ["/dashboard"] },
  { href: "/abouttivexx", label: "About", Icon: Gamepad2, match: ["/abouttivexx", "/about"] },
  { href: "/chats", label: "Chats", Icon: MessagesSquare, match: ["/chats", "/support"] },
  { href: "/refer", label: "Refer & Earn", Icon: UserIcon, match: ["/refer"] },
  { href: "/profile", label: "Profile", Icon: CircleUserRound, match: ["/profile", "/history", "/setup-bank"] },
];

export function BottomNav() {
  const pathname = usePathname();
  const [unreadChats, setUnreadChats] = useState(0);

  // Unread support-chat badge (local-first; cleared when /chats is opened).
  useEffect(() => {
    try {
      const raw = localStorage.getItem("tivexx-support-unread");
      setUnreadChats(Number(raw || 0) || 0);
    } catch { setUnreadChats(0); }
    const onUpdate = () => {
      try { setUnreadChats(Number(localStorage.getItem("tivexx-support-unread") || 0) || 0); } catch {}
    };
    window.addEventListener("storage", onUpdate);
    window.addEventListener("tivexx:support-unread", onUpdate as EventListener);
    window.addEventListener("focus", onUpdate);
    return () => {
      window.removeEventListener("storage", onUpdate);
      window.removeEventListener("tivexx:support-unread", onUpdate as EventListener);
      window.removeEventListener("focus", onUpdate);
    };
  }, []);

  return (
    <>
      <div className="bv-bottom-nav">
        {ITEMS.map(({ href, label, Icon, match }) => {
          const active = match.some((m) => pathname === m || pathname?.startsWith(m + "/"));
          return (
            <Link key={href} href={href} className={`bv-nav-item${active ? " bv-nav-active" : ""}`}>
              <span className="relative">
                <Icon className="h-5 w-5" />
                {href === "/chats" && unreadChats > 0 && (
                  <span className="bv-nav-badge">
                    {unreadChats > 9 ? "9+" : unreadChats}
                  </span>
                )}
              </span>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
      <style jsx global>{`
        .bv-bottom-nav {
          position: fixed; bottom: 0; left: 0; right: 0; max-width: 448px; margin: 0 auto;
          background: rgba(5,13,20,0.92); backdrop-filter: blur(20px);
          border-top: 1px solid rgba(255,255,255,0.08);
          display: flex; justify-content: space-around; align-items: center;
          min-height: 64px; padding-bottom: env(safe-area-inset-bottom);
          z-index: 100; box-shadow: 0 -10px 40px rgba(0,0,0,0.5);
        }
        .bv-nav-item {
          display: flex; flex-direction: column; align-items: center; gap: 3px;
          color: #9ca3af; text-decoration: none; font-size: 10px; font-weight: 600;
          padding: 8px 10px; position: relative;
        }
        .bv-nav-active { color: #10b981 !important; }
        .bv-nav-badge {
          position: absolute; top: -6px; right: -10px; min-width: 16px; height: 16px;
          padding: 0 4px; border-radius: 9999px; background: #dc2626; color: #fff;
          font-size: 9px; font-weight: 900; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 8px rgba(220,38,38,0.8);
        }
      `}</style>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { persistUserSession, restoreUserSessionFromCookie } from "@/lib/session-client";
import FirstHomepage from "./firsthomepage";

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [showLanding, setShowLanding] = useState(false);

  useEffect(() => {
    const resolveSession = async () => {
      const storedUser = localStorage.getItem("tivexx-user") || restoreUserSessionFromCookie();
      if (storedUser) {
        router.push("/dashboard");
        return;
      }
      if (!supabase) {
        setChecking(false);
        setShowLanding(true);
        return;
      }
      const url = new URL(window.location.href);
      const hasAuthParams =
        url.searchParams.has("access_token") ||
        url.searchParams.has("refresh_token") ||
        url.searchParams.has("type");
      if (hasAuthParams) {
        const { data, error } = await supabase.auth.getSessionFromUrl();
        if (!error && data?.session?.user) {
          const { data: userRow } = await supabase.from("users").select("*").eq("id", data.session.user.id).single();
          if (userRow) {
            persistUserSession({
              ...userRow,
              userId: userRow.userId || userRow.referral_code || userRow.referralCode || userRow.id,
              balance: Number(userRow?.balance || 0),
              referral_balance: Number(userRow?.referral_balance || 0),
              referral_count: Number(userRow?.referral_count || 0),
            });
            router.push("/dashboard");
            return;
          }
        }
      }
      setChecking(false);
      setShowLanding(true);
    };
    resolveSession();
  }, [router]);

  if (checking && !showLanding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f7fb]">
        <div className="animate-pulse text-sm text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!showLanding) return null;

  return <FirstHomepage />;
}

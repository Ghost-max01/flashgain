// app/refer/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  Share2,
  Gift,
  Users,
  Wallet,
  Send,
  ChevronRight,
  Check,
  Sparkles,
  TrendingUp,
  Award,
  Bell,
  Headphones,
  Home,
  Gamepad2,
  User,
  Clock,
  Star,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/referral";

interface UserData {
  id: string;
  referral_code: string;
  referral_count: number;
  referral_balance: number;
  pending_count?: number;
  balance?: number;
}

export default function ReferPage() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");
  const [activeMessage, setActiveMessage] = useState("");
  const [animatedEarnings, setAnimatedEarnings] = useState(0);
  const [isEarningsChanging, setIsEarningsChanging] = useState(false);

  const referralMessages = [
    "FlashGain gives users a fun way to earn online through tap-to-earn tasks, daily rewards, and exciting bonus activities. Members can complete simple tasks every day and grow steady earnings from the comfort of home. The platform also includes a referral system for extra commissions, but the main focus is on daily engagement, reward opportunities, and easy earning features that keep users active and motivated.",
    "FlashGain is designed for users who enjoy earning through simple online activities and rewarding daily tasks. The platform offers tap-to-earn opportunities, daily bonuses, and exciting missions that help users build consistent income over time. Members can also earn extra through referrals, but most of the experience is focused on completing tasks, unlocking rewards, and enjoying smooth daily earning opportunities.",
    "FlashGain creates an exciting earning experience with easy tap-to-earn tasks, bonus activities, and daily reward systems for active users. Members can complete tasks in minutes and receive consistent rewards while exploring fun opportunities on the platform. A referral option is available for additional income, but the main attraction remains the daily tasks, user rewards, and engaging features that make online earning simple.",
    "FlashGain helps users earn online through simple tasks, reward challenges, and daily tap-to-earn opportunities. The platform is built to keep users active with exciting bonuses, regular rewards, and easy earning features that fit any schedule. Users can also invite friends to gain referral commissions, although most benefits come from completing tasks and participating in the platform's daily activities.",
    "FlashGain offers a rewarding online experience where users can complete tap-to-earn tasks and enjoy daily bonus opportunities. The website provides simple ways to earn consistently while unlocking exciting rewards and participating in regular challenges. Referral earnings are available for users who invite others, but the platform mainly focuses on making daily task completion enjoyable and profitable for active members.",
    "FlashGain gives users access to daily earning opportunities through easy tasks, reward systems, and interactive tap-to-earn features. Members can stay active, complete challenges, and enjoy regular bonuses that increase their earning potential every day. A referral program is included for extra rewards, but the platform's biggest advantage comes from its consistent task-based earning experience.",
    "FlashGain is a modern earning platform that rewards users for completing simple online tasks and participating in daily activities. Users can enjoy tap-to-earn features, daily bonuses, and exciting rewards designed to encourage steady earnings. The referral option provides extra commissions, although most of the platform is centered around task rewards and user participation.",
    "FlashGain allows users to earn online with simple daily tasks, quick reward activities, and engaging earning opportunities. The platform keeps users motivated with bonuses, daily rewards, and easy tap-to-earn systems that make online earning more enjoyable. Referral commissions are available, but the main focus remains on task completion and consistent rewards.",
    "FlashGain brings together exciting tap-to-earn features, daily challenges, and rewarding tasks to create a smooth online earning experience. Members can complete activities, unlock bonuses, and earn daily rewards without complicated steps. Users may also earn through referrals, but most benefits come from staying active and completing regular tasks.",
    "FlashGain makes online earning easier with simple tasks, daily bonuses, and reward opportunities for active users. The platform encourages members to complete tap-to-earn activities and enjoy exciting daily incentives that help increase earnings consistently. Referral rewards are included for users who invite friends, though the platform mainly focuses on task-based income.",
    "FlashGain rewards users with daily earning opportunities through engaging tap-to-earn tasks and bonus activities. The platform creates a simple and enjoyable way to earn online while unlocking regular rewards and completing easy challenges. Referral commissions are also possible, but the daily tasks and rewards remain the biggest attraction.",
    "FlashGain offers users an exciting platform filled with daily tasks, quick rewards, and easy earning activities. Members can participate in tap-to-earn opportunities, collect bonuses, and grow their income steadily through active participation. The referral system provides additional commissions, although task rewards remain the center of the experience.",
    "FlashGain is built for users who want simple daily earning opportunities with rewarding tasks and bonus features. The platform provides tap-to-earn activities, regular incentives, and fun challenges that help users stay active and earn consistently. Referral earnings are available as an extra feature, but the main value comes from the task rewards.",
    "FlashGain creates a fun online earning environment with simple tasks, daily bonuses, and rewarding user activities. Members can complete tap-to-earn tasks in their free time and enjoy regular rewards that support consistent earnings. Referral commissions are included, but most users enjoy the platform for its engaging tasks and bonus opportunities.",
    "FlashGain combines easy earning tasks with exciting rewards and daily opportunities for users who enjoy online income platforms. Members can participate in tap-to-earn activities, unlock bonuses, and benefit from regular reward systems that encourage consistency. Referrals provide extra income, but task completion remains the main focus.",
    "FlashGain gives users access to rewarding tap-to-earn tasks, bonus challenges, and exciting daily earning features. The platform helps users enjoy steady online earnings through simple activities and engaging rewards. Members may also earn through referrals, although the daily task system is the biggest part of the platform.",
    "FlashGain offers a simple and enjoyable way to earn online through daily tasks and reward opportunities. Users can complete easy tap-to-earn activities, receive bonuses, and unlock regular incentives while staying active on the platform. Referral commissions are available, but the primary focus is on task rewards and consistent earning.",
    "FlashGain makes online earning exciting with quick tasks, daily rewards, and interactive tap-to-earn opportunities for users. The platform keeps members engaged through bonus systems and rewarding activities that encourage consistent participation. Referral earnings are possible, but the daily task experience remains the highlight.",
    "FlashGain helps users build consistent earnings through simple online tasks, exciting bonuses, and rewarding daily activities. Members can enjoy tap-to-earn systems and regular incentives that make earning online more enjoyable and accessible. Referral commissions are included as an additional feature for active users.",
    "FlashGain provides an easy earning experience with daily rewards, tap-to-earn opportunities, and simple online tasks. Users can complete activities, unlock bonuses, and enjoy regular incentives designed to support steady earnings. Referral rewards are available, though the platform focuses mainly on daily task participation.",
    "FlashGain is an exciting reward platform where users earn through tap-to-earn tasks and engaging daily challenges. Members can enjoy bonuses, complete activities, and unlock steady earning opportunities through active participation. Referrals are available for extra commissions, but task rewards remain the main attraction.",
    "FlashGain allows users to earn daily through easy tasks, exciting rewards, and simple online activities. The platform encourages consistent participation with bonus systems and tap-to-earn opportunities that make online earning enjoyable. Referral commissions are included, but the focus stays on daily rewards and task completion.",
    "FlashGain offers users a rewarding experience filled with daily tasks, bonus opportunities, and exciting earning features. Members can complete tap-to-earn activities and enjoy regular rewards that help increase their earnings steadily. Referral income is possible, but the platform mainly highlights task-based earning.",
    "FlashGain creates an easy way for users to earn online through rewarding tasks and exciting daily activities. Members can participate in tap-to-earn systems, receive bonuses, and enjoy a smooth earning experience designed for consistency. Referral rewards are also available as an extra benefit.",
    "FlashGain is designed to make online earning fun with simple daily tasks, exciting rewards, and easy tap-to-earn activities. Users can unlock bonuses, participate in challenges, and enjoy regular opportunities to earn consistently. Referrals provide additional commissions, but task rewards are the platform's main focus.",
    "FlashGain provides users with rewarding online opportunities through easy tasks and engaging daily earning systems. Members can complete tap-to-earn activities, receive bonuses, and enjoy exciting incentives that support steady earnings. Referral commissions are available, although the main experience centers around tasks and rewards.",
    "FlashGain gives users the chance to earn daily through fun online tasks and rewarding bonus activities. The platform includes tap-to-earn features, exciting incentives, and simple earning systems that make participation enjoyable. Referral earnings are included, but the platform focuses more on regular task rewards.",
    "FlashGain helps users enjoy online earnings through daily challenges, tap-to-earn tasks, and exciting reward systems. Members can stay active, unlock bonuses, and benefit from consistent earning opportunities that fit into everyday schedules. Referral commissions are an extra feature for users who invite others.",
    "FlashGain combines daily rewards, simple earning tasks, and engaging bonus opportunities into one exciting platform. Users can complete tap-to-earn activities and enjoy regular incentives that help build steady online income. The referral system offers additional commissions, though task completion remains the primary feature.",
    "FlashGain is a rewarding platform where users complete simple online tasks and enjoy exciting daily earning opportunities. Members can participate in tap-to-earn activities, collect bonuses, and unlock rewards through active engagement. Referral commissions are available, but most users focus on daily tasks and rewards.",
    "FlashGain creates a smooth earning experience with daily tasks, exciting rewards, and easy tap-to-earn systems for active users. Members can enjoy bonuses and consistent opportunities that make online earning simple and enjoyable. Referral rewards are included as an additional earning option.",
    "FlashGain offers exciting daily earning opportunities through simple tasks and interactive reward features. Users can complete tap-to-earn activities, collect bonuses, and enjoy a consistent flow of rewards designed to encourage active participation. Referrals also provide extra commissions for members.",
    "FlashGain gives users a chance to enjoy daily earnings with easy online tasks, bonus systems, and exciting reward activities. Members can stay active through tap-to-earn opportunities while unlocking regular incentives and benefits. Referral commissions are available but not the main focus.",
    "FlashGain makes online earning more exciting with daily tasks, tap-to-earn systems, and engaging reward opportunities. Users can complete activities, receive bonuses, and enjoy a simple platform built for consistent participation and steady earnings. Referrals are included as an extra benefit.",
    "FlashGain rewards active users with daily earning opportunities, exciting tasks, and simple bonus features. Members can complete tap-to-earn activities and unlock consistent rewards that make online earning enjoyable and flexible. Referral earnings are available alongside the task system.",
    "FlashGain provides users with easy daily tasks, reward opportunities, and exciting tap-to-earn activities that support steady online income. Members can participate regularly, enjoy bonuses, and unlock additional incentives for staying active. Referral commissions are also possible.",
    "FlashGain is designed to help users enjoy online earning through simple tasks, daily bonuses, and rewarding activities. Users can complete tap-to-earn challenges, unlock incentives, and benefit from regular opportunities that increase earnings over time. Referrals are available for extra rewards.",
    "FlashGain combines exciting earning features with rewarding daily tasks and easy online activities for active users. Members can participate in tap-to-earn systems, receive bonuses, and enjoy regular opportunities to earn consistently. Referral commissions are an additional earning option.",
    "FlashGain offers users a fun and rewarding experience with daily earning tasks, bonuses, and exciting activities. Members can complete tap-to-earn opportunities and unlock regular rewards that make earning online easier and more engaging. Referral rewards are available for invited users.",
    "FlashGain helps users earn online through rewarding daily activities, simple tasks, and exciting tap-to-earn features. Members can enjoy bonuses, complete quick challenges, and benefit from regular incentives that encourage active participation. Referral earnings are included as extra rewards.",
    "FlashGain gives users exciting opportunities to earn daily through easy online tasks and rewarding activities. Members can enjoy tap-to-earn features, unlock bonuses, and participate in challenges that support steady earnings. Referral commissions are available but secondary to the task rewards.",
    "FlashGain creates a rewarding online environment with daily earning tasks, exciting bonuses, and easy tap-to-earn systems. Users can stay active, complete challenges, and unlock incentives designed to increase earning opportunities consistently. Referrals are included for additional rewards.",
    "FlashGain offers a simple platform where users complete daily tasks and enjoy rewarding earning opportunities online. Members can participate in tap-to-earn activities, receive bonuses, and benefit from regular incentives for active engagement. Referral commissions are also possible.",
    "FlashGain makes earning online enjoyable with exciting daily tasks, reward systems, and simple bonus opportunities. Users can complete tap-to-earn activities and unlock regular incentives that encourage consistency and participation. Referral rewards are available for invited friends.",
    "FlashGain rewards users through daily earning activities, exciting task systems, and engaging bonus opportunities. Members can complete tap-to-earn tasks and enjoy regular incentives designed to support steady online earnings. Referrals provide extra commissions alongside the task rewards.",
    "FlashGain provides a fun earning experience with daily tasks, exciting bonuses, and simple online activities. Users can enjoy tap-to-earn systems, unlock rewards, and stay active through consistent earning opportunities. Referral commissions are available as an additional feature.",
    "FlashGain allows users to enjoy online earnings through rewarding tasks, daily challenges, and exciting bonus systems. Members can complete tap-to-earn activities and unlock incentives that help build consistent income over time. Referrals are included for extra earning opportunities.",
    "FlashGain helps users stay active with exciting daily tasks, easy earning systems, and rewarding bonuses. Members can participate in tap-to-earn activities and enjoy regular incentives designed to support steady online earnings. Referral commissions are available but not the main focus.",
    "FlashGain offers exciting online earning opportunities through daily tasks, bonus rewards, and simple tap-to-earn activities. Users can complete challenges, unlock incentives, and enjoy a smooth earning experience built for consistency. Referral rewards are also included.",
    "FlashGain is a rewarding platform where users earn through daily activities, easy tasks, and engaging bonus systems. Members can participate in tap-to-earn opportunities and enjoy regular rewards that make online earning enjoyable and accessible. Referral commissions are available for extra income.",
    "FlashGain gives users exciting ways to earn online through daily tap-to-earn tasks, bonus activities, and rewarding challenges. Members can stay active, unlock incentives, and enjoy simple earning opportunities every day. Referral commissions are also available for users who invite friends to join the platform.",
    "FlashGain offers a rewarding earning experience with simple online tasks, daily bonuses, and exciting activities for active users. Members can complete tap-to-earn missions and receive regular rewards designed to encourage consistent participation. Referral rewards are included as an additional feature.",
    "FlashGain helps users enjoy steady online earnings through exciting daily tasks and rewarding tap-to-earn opportunities. Members can unlock bonuses, complete activities, and benefit from simple earning systems built for consistency. Referrals provide extra commissions for active users.",
    "FlashGain is designed to reward users through engaging daily activities, easy online tasks, and exciting earning opportunities. Members can participate in tap-to-earn systems, enjoy bonuses, and unlock incentives that support regular earnings. Referral commissions are also available.",
    "FlashGain creates a fun online earning environment with daily reward systems, exciting challenges, and simple tasks for users. Members can complete tap-to-earn activities and enjoy regular bonuses that help increase earnings over time. Referrals provide additional earning benefits.",
    "FlashGain provides users with easy earning opportunities through rewarding daily tasks and exciting bonus activities. Members can enjoy tap-to-earn systems, unlock incentives, and stay active with regular earning features. Referral rewards are available as an extra benefit.",
    "FlashGain makes online earning enjoyable with daily tasks, exciting rewards, and simple tap-to-earn opportunities. Users can complete activities, receive bonuses, and enjoy regular incentives that encourage active participation. Referral commissions are included for invited users.",
    "FlashGain rewards users with consistent earning opportunities through engaging daily tasks and exciting bonus systems. Members can stay active, complete tap-to-earn challenges, and unlock rewards designed for regular online income. Referrals are available for additional commissions.",
    "FlashGain allows users to enjoy daily earnings through rewarding activities, easy online tasks, and exciting bonus opportunities. Members can participate in tap-to-earn systems and unlock incentives that support steady earning experiences. Referral rewards are also included.",
    "FlashGain offers a smooth earning platform filled with exciting tasks, daily bonuses, and rewarding tap-to-earn features. Users can complete simple activities and enjoy regular incentives designed to make online earning more enjoyable. Referral commissions provide extra income opportunities.",
    "FlashGain helps users earn online through daily tasks, exciting bonuses, and rewarding earning systems. Members can complete tap-to-earn activities, unlock incentives, and benefit from consistent opportunities that encourage participation. Referral rewards are available as extra commissions.",
    "FlashGain creates exciting earning opportunities through daily reward systems, simple tasks, and interactive activities. Members can stay active with tap-to-earn challenges while enjoying regular bonuses and incentives that support steady online earnings. Referrals are included as an additional feature.",
    "FlashGain gives users access to rewarding online activities, exciting bonuses, and daily earning opportunities. Members can complete tap-to-earn tasks, unlock incentives, and enjoy a platform designed for consistent participation. Referral commissions are also available.",
    "FlashGain is a rewarding platform where users enjoy daily tasks, exciting earning activities, and regular bonus opportunities. Members can participate in tap-to-earn systems and unlock rewards that help increase earnings over time. Referrals provide additional earning benefits.",
    "FlashGain provides exciting daily earning opportunities through simple online tasks and rewarding bonus systems. Users can complete tap-to-earn activities, receive incentives, and enjoy a consistent earning experience. Referral rewards are available for active members.",
    "FlashGain combines easy earning tasks, exciting daily rewards, and engaging bonus opportunities into one platform. Members can stay active with tap-to-earn systems while unlocking regular incentives designed for steady earnings. Referrals are included for extra commissions.",
    "FlashGain offers users a simple way to earn online through daily challenges, rewarding tasks, and exciting bonus features. Members can complete tap-to-earn activities and enjoy incentives that encourage active participation. Referral commissions are also possible.",
    "FlashGain rewards users with exciting earning opportunities through daily tasks, bonus activities, and interactive systems. Members can enjoy tap-to-earn features and unlock incentives that support consistent online earnings. Referral rewards are included as an additional benefit.",
    "FlashGain helps users build steady earnings with rewarding daily activities, exciting tasks, and regular bonuses. Members can participate in tap-to-earn systems and enjoy simple earning opportunities designed for active users. Referrals provide extra commissions.",
    "FlashGain creates a fun earning experience through easy online tasks, daily reward systems, and exciting bonus opportunities. Members can complete tap-to-earn activities and unlock incentives that make online earning enjoyable. Referral commissions are also available.",
    "FlashGain offers rewarding earning opportunities through simple tasks, exciting daily bonuses, and engaging user activities. Members can enjoy tap-to-earn systems and unlock regular incentives for staying active on the platform. Referrals provide extra income options.",
    "FlashGain gives users exciting ways to earn online with rewarding tasks, daily challenges, and bonus opportunities. Members can complete tap-to-earn activities and enjoy incentives that encourage steady participation and earnings. Referral rewards are available.",
    "FlashGain provides users with simple daily earning opportunities through exciting tasks and regular bonuses. Members can stay active with tap-to-earn activities and unlock incentives that support consistent online income. Referral commissions are included.",
    "FlashGain is built to reward active users with daily tasks, exciting bonuses, and engaging earning systems. Members can complete tap-to-earn activities and enjoy regular incentives designed for smooth online earnings. Referrals provide additional commissions.",
    "FlashGain combines rewarding tasks, exciting bonus systems, and daily earning opportunities into one easy platform. Members can enjoy tap-to-earn activities and unlock incentives that make online earning more enjoyable. Referral rewards are also available.",
    "FlashGain helps users stay active with rewarding online tasks, exciting challenges, and daily bonus opportunities. Members can complete tap-to-earn activities and enjoy regular incentives designed for consistent earnings. Referral commissions are included as an extra feature.",
    "FlashGain offers users exciting earning experiences through daily tasks, rewarding bonuses, and easy tap-to-earn systems. Members can unlock incentives and enjoy simple earning opportunities while staying active on the platform. Referral rewards are available.",
    "FlashGain gives users access to rewarding activities, exciting earning tasks, and regular daily bonuses. Members can participate in tap-to-earn systems and unlock incentives that encourage consistent participation. Referrals provide additional commissions.",
    "FlashGain creates exciting online earning opportunities through daily tasks, bonus systems, and rewarding activities. Members can complete tap-to-earn challenges and enjoy regular incentives designed to increase earnings steadily. Referral rewards are also included.",
    "FlashGain rewards users with easy earning opportunities through simple tasks, exciting daily bonuses, and engaging activities. Members can stay active with tap-to-earn systems while unlocking incentives that support regular online earnings. Referrals provide extra commissions.",
    "FlashGain provides a rewarding platform filled with exciting daily tasks, bonuses, and easy earning opportunities. Members can complete tap-to-earn activities and unlock incentives that encourage active participation every day. Referral commissions are available.",
    "FlashGain allows users to enjoy daily earning opportunities through rewarding tasks and exciting bonus features. Members can participate in tap-to-earn systems and benefit from incentives designed for consistent online income. Referrals are included as an additional earning option.",
    "FlashGain makes online earning simple with exciting tasks, rewarding activities, and regular daily bonuses. Members can complete tap-to-earn challenges and enjoy incentives that support steady participation and earnings. Referral rewards are available.",
    "FlashGain offers users engaging earning opportunities through daily reward systems, exciting tasks, and simple online activities. Members can enjoy tap-to-earn features and unlock bonuses that make earning online enjoyable. Referral commissions are also included.",
    "FlashGain helps users earn consistently through exciting daily tasks, rewarding bonuses, and engaging activities. Members can complete tap-to-earn opportunities and unlock incentives designed to support regular online income. Referrals provide additional rewards.",
    "FlashGain provides exciting earning experiences through rewarding tasks, daily bonuses, and easy tap-to-earn systems. Members can stay active and enjoy incentives that encourage consistent participation on the platform. Referral commissions are available.",
    "FlashGain rewards users with daily earning opportunities through exciting activities and engaging bonus systems. Members can complete tap-to-earn tasks and enjoy incentives designed for smooth online earning experiences. Referral rewards are also possible.",
    "FlashGain creates an enjoyable online earning platform with daily tasks, exciting rewards, and bonus opportunities. Members can participate in tap-to-earn systems and unlock incentives that support steady earnings. Referrals provide additional commissions.",
    "FlashGain offers rewarding earning opportunities through exciting online tasks and regular daily bonuses. Members can complete tap-to-earn activities and enjoy incentives that encourage active participation and consistent earnings. Referral rewards are included.",
    "FlashGain helps users enjoy online income with rewarding tasks, exciting activities, and simple daily bonus systems. Members can unlock incentives through tap-to-earn opportunities and stay active with regular earning features. Referral commissions are available.",
    "FlashGain gives users a fun way to earn online through daily challenges, exciting tasks, and rewarding bonuses. Members can participate in tap-to-earn systems and unlock incentives that encourage steady participation. Referrals provide extra earning opportunities.",
    "FlashGain combines exciting earning features with rewarding tasks and regular daily bonuses for active users. Members can complete tap-to-earn activities and enjoy incentives designed for smooth online earnings. Referral rewards are also included.",
    "FlashGain offers simple online earning opportunities through daily tasks, engaging bonus systems, and exciting activities. Members can enjoy tap-to-earn features and unlock incentives that support regular participation. Referral commissions are available.",
    "FlashGain rewards users with exciting earning opportunities through daily challenges and rewarding tap-to-earn systems. Members can stay active, receive bonuses, and enjoy incentives that help increase online earnings consistently. Referrals are included.",
    "FlashGain creates a rewarding experience with exciting daily tasks, bonus opportunities, and engaging earning systems. Members can complete tap-to-earn activities and unlock incentives designed for active users. Referral rewards are also available.",
    "FlashGain provides users with exciting online earning opportunities through simple tasks and rewarding daily bonuses. Members can participate in tap-to-earn systems and enjoy incentives that support steady earnings over time. Referral commissions are included.",
    "FlashGain helps users stay active with rewarding tasks, exciting earning opportunities, and regular bonus systems. Members can complete tap-to-earn challenges and unlock incentives designed for consistent online income. Referrals provide additional commissions.",
    "FlashGain offers users exciting daily earning opportunities through engaging tasks and rewarding activities. Members can enjoy tap-to-earn systems, unlock bonuses, and participate in incentives that encourage regular earnings. Referral rewards are available.",
    "FlashGain rewards active users with exciting tasks, daily bonuses, and simple online earning systems. Members can complete tap-to-earn activities and enjoy incentives that support steady participation and income growth. Referral commissions are also included.",
    "FlashGain creates an exciting earning environment where users complete daily tasks, unlock bonuses, and enjoy rewarding tap-to-earn opportunities. Members can stay active through engaging activities and benefit from consistent earning systems designed for online income growth. Referral rewards are available as an additional feature.",
  ];

  // Animate earnings
  useEffect(() => {
    if (!userData) return;

    const targetEarnings =
      userData.referral_balance + (userData.pending_count || 0) * 10000;
    if (targetEarnings === animatedEarnings) return;

    const difference = targetEarnings - animatedEarnings;
    const steps = 30;
    const increment = difference / steps;

    setIsEarningsChanging(true);

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      setAnimatedEarnings((prev) => {
        const newValue = prev + increment;
        if (currentStep >= steps) {
          clearInterval(timer);
          setIsEarningsChanging(false);
          return targetEarnings;
        }
        return Math.round(newValue);
      });
    }, 16);

    return () => clearInterval(timer);
  }, [userData]);

  useEffect(() => {
    setOrigin(window.location.origin);

    // Set initial random message
    setActiveMessage(
      referralMessages[Math.floor(Math.random() * referralMessages.length)],
    );

    const storedUser = localStorage.getItem("tivexx-user");
    if (!storedUser) {
      router.push("/login");
      return;
    }

    const user = JSON.parse(storedUser);
    const userId = user.id || user.userId;

    fetch(`/api/referral-stats?userId=${userId}&t=${Date.now()}`)
      .then((r) => r.json())
      .then((data) => {
        let balance = 50000;
        const stored = localStorage.getItem("tivexx-user");
        if (stored) {
          const u = JSON.parse(stored);
          const localBal = u.balance || 50000;
          const refEarned = data.referral_balance || 0;
          const lastSync =
            localStorage.getItem("tivexx-last-synced-referrals") || "0";
          const newEarned = Math.max(0, refEarned - parseInt(lastSync));
          balance = localBal + newEarned;
          u.balance = balance;
          localStorage.setItem("tivexx-user", JSON.stringify(u));
          if (newEarned > 0) {
            localStorage.setItem(
              "tivexx-last-synced-referrals",
              refEarned.toString(),
            );
          }
        }

        setUserData({
          id: userId,
          referral_code: data.referral_code,
          referral_count: data.referral_count,
          referral_balance: data.referral_balance,
          pending_count: data.pending_count || 0,
          balance,
        });

        setAnimatedEarnings(
          data.referral_balance + (data.pending_count || 0) * 10000,
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router]);

  const referralLink = userData?.referral_code
    ? `/register?ref=${userData.referral_code}`
    : "/register";

  const handleCopy = () => {
    if (!origin) return;
    const linkOnly = `${origin}${referralLink}`;
    navigator.clipboard.writeText(linkOnly);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    if (!origin) return;
    const msg = `${activeMessage}\n\nSign up here: ${origin}${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_self");
  };

  const shareTelegram = () => {
    if (!origin) return;
    const link = `${origin}${referralLink}`;
    const msg = `${activeMessage}\n\nSign up here: ${link}`;
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(msg)}`,
      "_self",
    );
  };

  const cycleMessage = () => {
    const currentIndex = referralMessages.indexOf(activeMessage);
    const nextIndex = (currentIndex + 1) % referralMessages.length;
    setActiveMessage(referralMessages[nextIndex]);
  };

  const formatCurrency = (amount: number) => {
    const formatted = new Intl.NumberFormat("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

    // Calculate font size based on number of digits (shrinks for larger amounts)
    const numDigits = formatted.split(".")[0].replace(/,/g, "").length;
    const baseSize = 1.75; // rem
    const minSize = 1.0; // rem
    const sizePerDigit = 0.15; // rem reduction per digit
    const fontSize = Math.max(
      minSize,
      baseSize - (numDigits - 4) * sizePerDigit,
    );

    return (
      <span
        className="font-mono inline-flex items-baseline"
        style={{ fontSize: `${fontSize}rem` }}
      >
        <span className="text-[0.6em] align-top opacity-80">₦</span>
        <span className="font-black tracking-tight">
          {formatted.split(".")[0]}
        </span>
        <span className="text-[0.6em] opacity-60">
          .{formatted.split(".")[1] || "00"}
        </span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050d14]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-ping"></div>
            <div
              className="absolute inset-2 rounded-full border-2 border-emerald-400/50 animate-ping"
              style={{ animationDelay: "0.3s" }}
            ></div>
            <div className="absolute inset-4 rounded-full bg-emerald-500/20 animate-pulse"></div>
          </div>
          <p className="text-emerald-400 text-sm font-medium tracking-widest uppercase">
            Loading
          </p>
        </div>
      </div>
    );
  }

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
            <div className="flex items-center">
              <Link href="/dashboard">
                <button className="hh-back-btn">
                  <ArrowLeft className="h-5 w-5" />
                </button>
              </Link>
              <div className="ml-3">
                <h1 className="hh-title">Refer & Earn</h1>
                <p className="hh-subtitle">Invite friends, earn rewards</p>
              </div>
            </div>
            <div className="hh-reward-badge">
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span>each ₦5k</span>
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
                  <Award className="h-5 w-5 text-amber-300" />
                </div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Referral Program
                </span>
              </div>
              <div className="hh-live-indicator">
                <span className="hh-live-dot"></span>
                <span className="text-xs">Active</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Earn per referral</p>
                <p className="text-3xl font-black text-white hh-fit-amount">
                  <span className="text-sm align-top opacity-80">₦</span>
                  <span className="tracking-tight">5,000</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-1">Potential earnings</p>
                <div
                  className={`transition-colors duration-300 ${isEarningsChanging ? "text-amber-200" : "text-amber-300"}`}
                >
                  {formatCurrency(animatedEarnings)}
                </div>
              </div>
            </div>

            <div className="hh-progress-mini mt-4">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-400">Referrals</span>
                <span className="text-white font-bold">
                  {userData?.referral_count || 0}{" "}
                  <span className="text-gray-500">/ ∞</span>
                </span>
              </div>
              <div className="hh-progress-track">
                <div
                  className="hh-progress-fill"
                  style={{
                    width: `${Math.min((userData?.referral_count || 0) * 2, 100)}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Referral Link Card */}
        <div className="hh-card hh-entry-2">
          <div className="flex items-center justify-between mb-4">
            <div className="hh-section-title">Your Referral Link</div>
            <button onClick={cycleMessage} className="hh-change-message-btn">
              <TrendingUp className="h-3 w-3" />
              <span>Change message</span>
            </button>
          </div>

          <div className="hh-message-bubble mb-4">
            <p className="text-sm text-white/90 leading-relaxed">
              {activeMessage}
            </p>
          </div>

          <div className="space-y-3">
            <div className="hh-link-container">
              <div className="hh-link-label">Your unique link</div>
              <div className="hh-link-value">
                <span className="truncate">
                  {origin ? `${origin}${referralLink}` : "Loading..."}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleCopy}
                className={`hh-share-btn ${copied ? "hh-share-success" : "hh-share-copy"}`}
              >
                {copied ? (
                  <>
                    <Check className="h-5 w-5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-5 w-5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              <button
                onClick={shareWhatsApp}
                className="hh-share-btn hh-share-wa"
              >
                <Share2 className="h-5 w-5" />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Share Buttons */}
        <div className="grid grid-cols-2 gap-3 hh-entry-3">
          <button
            onClick={shareWhatsApp}
            className="hh-action-btn hh-action-green"
          >
            <span className="hh-action-icon">📱</span>
            <span>WhatsApp</span>
          </button>
          <button
            onClick={shareTelegram}
            className="hh-action-btn hh-action-blue"
          >
            <span className="hh-action-icon">✈️</span>
            <span>Telegram</span>
          </button>
        </div>

        {/* How It Works */}
        <div className="hh-card hh-entry-4">
          <div className="hh-section-title mb-4">How It Works</div>
          <div className="space-y-3">
            {[
              {
                icon: "🔗",
                title: "Share Your Link",
                desc: "Share your unique referral link with friends",
                color: "emerald",
              },
              {
                icon: "👥",
                title: "They Sign Up",
                desc: "Friends register using your referral code",
                color: "green",
              },
              {
                icon: "💰",
                title: "Earn Rewards",
                desc: "Get ₦5,000 credited instantly per referral",
                color: "emerald",
              },
              {
                icon: "⭐",
                title: "Friends Complete Tasks",
                desc: "Referral is verified after they complete 2 tasks",
                color: "amber",
                highlight: true,
              },
            ].map((step, idx) => (
              <div
                key={idx}
                className={`hh-step-item ${step.highlight ? "hh-step-highlight" : ""}`}
                style={{ animationDelay: `${idx * 100 + 400}ms` }}
              >
                <div className={`hh-step-icon hh-step-${step.color}`}>
                  <span className="text-xl">{step.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="hh-step-number">Step {idx + 1}</span>
                    {step.highlight && (
                      <span className="hh-step-badge">Important</span>
                    )}
                  </div>
                  <h4 className="hh-step-title">{step.title}</h4>
                  <p className="hh-step-desc">{step.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-600" />
              </div>
            ))}
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="hh-card hh-entry-5">
          <div className="hh-section-title text-center mb-5">
            Your Performance
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="hh-stat-card hh-stat-referrals">
              <div className="hh-stat-icon">
                <Users className="h-5 w-5" />
              </div>
              <div className="hh-stat-content">
                <div className="hh-stat-value text-amber-300">
                  {userData?.referral_count || 0}
                </div>
                <div className="hh-stat-label">Successful</div>
              </div>
            </div>

            <div className="hh-stat-card hh-stat-earned">
              <div className="hh-stat-icon">
                <Wallet className="h-5 w-5" />
              </div>
              <div className="hh-stat-content">
                <div className="hh-stat-value text-emerald-300">
                  {formatCurrency(userData?.referral_balance || 0)}
                </div>
                <div className="hh-stat-label">Earned</div>
              </div>
            </div>
          </div>

          {/* Pending Referrals */}
          <div className="hh-pending-card">
            <div className="flex items-center gap-3">
              <div className="hh-pending-icon">
                <Clock className="h-5 w-5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-amber-200/80">
                    Pending verification
                  </span>
                  <span className="text-lg font-bold text-amber-300">
                    {userData?.pending_count || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-400">
                    Potential earnings
                  </span>
                  <span className="text-sm font-bold text-emerald-400">
                    {formatCurrency((userData?.pending_count || 0) * 10000)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pro Tip */}
        <div className="hh-card hh-tip-card hh-entry-6">
          <div className="flex items-start gap-3">
            <div className="hh-tip-icon">
              <Sparkles className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">Pro Tip</h4>
              <p className="text-sm text-emerald-200/80">
                Share your link on social media and messaging platforms to
                maximize your earnings. Each successful referral earns you
                ₦5,000 instantly!
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
        <Link href="/abouttivexx" className="hh-nav-item">
          <Gamepad2 className="h-5 w-5" />
          <span>About</span>
        </Link>
        <Link href="/refer" className="hh-nav-item hh-nav-active">
          <User className="h-5 w-5" />
          <span>Refer</span>
        </Link>
      </div>

      <style jsx global>{`
        /* ─── IMPORT FONT ─── */
        @import url("https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap");

        /* ─── ROOT & BACKGROUND ─── */
        .hh-root {
          font-family: "Syne", sans-serif;
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

        /* ─── HEADER ─── */
        .hh-header {
          background: linear-gradient(
            180deg,
            rgba(5, 13, 20, 0.95) 0%,
            rgba(5, 13, 20, 0.8) 100%
          );
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(16, 185, 129, 0.15);
        }

        .hh-back-btn {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .hh-back-btn:hover {
          background: rgba(255, 255, 255, 0.1);
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
          color: rgba(16, 185, 129, 0.8);
        }

        .hh-reward-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(
            135deg,
            rgba(16, 185, 129, 0.15),
            rgba(245, 158, 11, 0.15)
          );
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 30px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 700;
          color: #fbbf24;
        }

        /* ─── CARDS ─── */
        .hh-card {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.06) 0%,
            rgba(255, 255, 255, 0.02) 100%
          );
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 20px;
          backdrop-filter: blur(12px);
          position: relative;
          overflow: hidden;
          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease;
        }

        .hh-card:hover {
          transform: translateY(-2px);
          box-shadow:
            0 20px 60px rgba(0, 0, 0, 0.4),
            0 0 30px rgba(16, 185, 129, 0.05);
        }

        .hh-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.15),
            transparent
          );
        }

        .hh-card-hero {
          background: linear-gradient(
            135deg,
            rgba(16, 185, 129, 0.2) 0%,
            rgba(5, 13, 20, 0.9) 50%,
            rgba(245, 158, 11, 0.1) 100%
          );
          border-color: rgba(16, 185, 129, 0.3);
        }

        /* ─── ORBS ─── */
        .hh-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(40px);
          pointer-events: none;
        }

        .hh-orb-1 {
          width: 150px;
          height: 150px;
          background: radial-gradient(
            circle,
            rgba(16, 185, 129, 0.2),
            transparent
          );
          top: -40px;
          right: -40px;
          animation: hh-orb-float 6s ease-in-out infinite;
        }

        .hh-orb-2 {
          width: 100px;
          height: 100px;
          background: radial-gradient(
            circle,
            rgba(245, 158, 11, 0.15),
            transparent
          );
          bottom: 20px;
          left: -20px;
          animation: hh-orb-float 8s ease-in-out infinite reverse;
        }

        @keyframes hh-orb-float {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(8px, -8px) scale(1.05);
          }
          66% {
            transform: translate(-4px, 6px) scale(0.97);
          }
        }

        /* ─── ICON RING ─── */
        .hh-icon-ring {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: linear-gradient(
            135deg,
            rgba(16, 185, 129, 0.2),
            rgba(245, 158, 11, 0.2)
          );
          border: 1px solid rgba(245, 158, 11, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* ─── LIVE INDICATOR ─── */
        .hh-live-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
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
          0%,
          100% {
            box-shadow: 0 0 4px #10b981;
            transform: scale(1);
          }
          50% {
            box-shadow:
              0 0 10px #10b981,
              0 0 20px rgba(16, 185, 129, 0.4);
            transform: scale(1.15);
          }
        }

        /* ─── PROGRESS MINI ─── */
        .hh-progress-mini {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 12px;
        }

        .hh-progress-track {
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          overflow: hidden;
        }

        .hh-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #10b981, #fbbf24);
          border-radius: 10px;
          transition: width 0.5s ease;
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
        }

        /* ─── SECTION TITLE ─── */
        .hh-section-title {
          font-size: 15px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.01em;
        }

        /* ─── CHANGE MESSAGE BUTTON ─── */
        .hh-change-message-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 6px 12px;
          font-size: 11px;
          font-weight: 600;
          color: #10b981;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .hh-change-message-btn:hover {
          background: rgba(16, 185, 129, 0.1);
          border-color: rgba(16, 185, 129, 0.3);
          transform: translateY(-1px);
        }

        /* ─── MESSAGE BUBBLE ─── */
        .hh-message-bubble {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 16px;
          padding: 16px;
          position: relative;
          animation: hh-message-pulse 2s ease-in-out infinite;
        }

        @keyframes hh-message-pulse {
          0%,
          100% {
            border-color: rgba(16, 185, 129, 0.2);
          }
          50% {
            border-color: rgba(16, 185, 129, 0.4);
            box-shadow: 0 0 20px rgba(16, 185, 129, 0.1);
          }
        }

        .hh-message-bubble::before {
          content: "";
          position: absolute;
          bottom: -8px;
          left: 20px;
          width: 16px;
          height: 16px;
          background: rgba(0, 0, 0, 0.3);
          border-right: 1px solid rgba(16, 185, 129, 0.2);
          border-bottom: 1px solid rgba(16, 185, 129, 0.2);
          transform: rotate(45deg);
          border-radius: 2px;
        }

        /* ─── LINK CONTAINER ─── */
        .hh-link-container {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          padding: 12px;
        }

        .hh-link-label {
          font-size: 11px;
          color: #10b981;
          margin-bottom: 4px;
          font-weight: 600;
        }

        .hh-link-value {
          font-family: "JetBrains Mono", monospace;
          font-size: 13px;
          color: white;
          background: rgba(255, 255, 255, 0.03);
          padding: 8px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          overflow-x: auto;
          white-space: nowrap;
        }

        /* ─── SHARE BUTTONS ─── */
        .hh-share-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          border-radius: 14px;
          font-weight: 700;
          font-size: 14px;
          transition: all 0.2s ease;
          cursor: pointer;
          border: none;
        }

        .hh-share-copy {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
        }

        .hh-share-success {
          background: #059669;
          color: white;
        }

        .hh-share-wa {
          background: linear-gradient(135deg, #25d366, #128c7e);
          color: white;
          box-shadow: 0 4px 15px rgba(37, 211, 102, 0.3);
        }

        .hh-share-btn:hover {
          transform: translateY(-2px);
          filter: brightness(1.1);
        }

        .hh-share-btn:active {
          transform: scale(0.97);
        }

        /* ─── ACTION BUTTONS ─── */
        .hh-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 16px;
          border-radius: 16px;
          font-weight: 700;
          font-size: 15px;
          transition: all 0.2s ease;
          cursor: pointer;
          border: none;
          color: white;
          animation: hh-card-appear 0.4s ease-out both;
        }

        .hh-action-btn:hover {
          transform: translateY(-2px) scale(1.02);
        }

        .hh-action-btn:active {
          transform: scale(0.98);
        }

        .hh-action-green {
          background: linear-gradient(135deg, #059669, #047857);
          box-shadow: 0 4px 20px rgba(5, 150, 105, 0.3);
        }

        .hh-action-blue {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          box-shadow: 0 4px 20px rgba(37, 99, 235, 0.3);
        }

        .hh-action-icon {
          font-size: 20px;
        }

        /* ─── STEP ITEMS ─── */
        .hh-step-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          transition: all 0.2s ease;
          animation: hh-card-appear 0.4s ease-out both;
        }

        .hh-step-item:hover {
          background: rgba(255, 255, 255, 0.06);
          transform: translateX(4px);
        }

        .hh-step-highlight {
          background: linear-gradient(
            135deg,
            rgba(245, 158, 11, 0.15),
            rgba(245, 158, 11, 0.05)
          );
          border: 2px solid rgba(245, 158, 11, 0.3);
        }

        .hh-step-icon {
          width: 28px;
          height: 28px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 14px;
        }

        .hh-step-emerald {
          background: linear-gradient(
            135deg,
            rgba(16, 185, 129, 0.2),
            rgba(16, 185, 129, 0.1)
          );
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .hh-step-green {
          background: linear-gradient(
            135deg,
            rgba(5, 150, 105, 0.2),
            rgba(5, 150, 105, 0.1)
          );
          border: 1px solid rgba(5, 150, 105, 0.3);
        }

        .hh-step-amber {
          background: linear-gradient(
            135deg,
            rgba(245, 158, 11, 0.2),
            rgba(245, 158, 11, 0.1)
          );
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .hh-step-number {
          font-size: 11px;
          font-weight: 700;
          color: #10b981;
          background: rgba(16, 185, 129, 0.1);
          padding: 2px 8px;
          border-radius: 20px;
        }

        .hh-step-badge {
          font-size: 10px;
          font-weight: 700;
          color: #fbbf24;
          background: rgba(245, 158, 11, 0.15);
          padding: 2px 8px;
          border-radius: 20px;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .hh-step-title {
          font-weight: 700;
          color: white;
          margin-top: 2px;
          font-size: 13px;
        }

        .hh-step-desc {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 2px;
        }

        /* Reduce earning amount size to keep layout neat (do not hide content) */
        .hh-fit-amount {
          display: inline-flex;
          align-items: baseline;
          gap: 6px;
          white-space: nowrap;
          font-size: 1.25rem; /* slightly reduced for a cooler look */
          letter-spacing: -0.01em;
        }

        /* ─── STAT CARDS ─── */
        .hh-stat-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.2s ease;
        }

        .hh-stat-card:hover {
          transform: translateY(-2px);
          border-color: rgba(16, 185, 129, 0.2);
        }

        .hh-stat-referrals {
          background: linear-gradient(
            135deg,
            rgba(245, 158, 11, 0.1),
            rgba(245, 158, 11, 0.02)
          );
        }

        .hh-stat-earned {
          background: linear-gradient(
            135deg,
            rgba(16, 185, 129, 0.1),
            rgba(16, 185, 129, 0.02)
          );
        }

        .hh-stat-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .hh-stat-content {
          flex: 1;
        }

        .hh-stat-value {
          font-size: 22px;
          font-weight: 800;
          line-height: 1;
          font-family: "JetBrains Mono", monospace;
        }

        .hh-stat-label {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 4px;
        }

        /* ─── PENDING CARD ─── */
        .hh-pending-card {
          background: linear-gradient(
            135deg,
            rgba(245, 158, 11, 0.1),
            rgba(245, 158, 11, 0.02)
          );
          border: 1px solid rgba(245, 158, 11, 0.2);
          border-radius: 16px;
          padding: 16px;
          margin-top: 12px;
        }

        .hh-pending-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* ─── TIP CARD ─── */
        .hh-tip-card {
          background: linear-gradient(
            135deg,
            rgba(16, 185, 129, 0.15),
            rgba(16, 185, 129, 0.05)
          );
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .hh-tip-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        /* ─── FLOATING BUTTON ─── */
        .hh-float-btn {
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 18px 24px;
          background: linear-gradient(135deg, #10b981, #059669, #047857);
          border: none;
          border-radius: 30px;
          color: white;
          font-weight: 800;
          font-size: 16px;
          box-shadow:
            0 10px 40px rgba(16, 185, 129, 0.4),
            0 0 30px rgba(16, 185, 129, 0.2);
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
          cursor: pointer;
          animation: hh-float-glow 2s ease-in-out infinite;
        }

        @keyframes hh-float-glow {
          0%,
          100% {
            box-shadow:
              0 10px 40px rgba(16, 185, 129, 0.4),
              0 0 30px rgba(16, 185, 129, 0.2);
          }
          50% {
            box-shadow:
              0 15px 50px rgba(16, 185, 129, 0.6),
              0 0 40px rgba(16, 185, 129, 0.3);
          }
        }

        .hh-float-shimmer {
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.2),
            transparent
          );
          animation: hh-shimmer-slide 2.5s ease-in-out infinite;
        }

        @keyframes hh-shimmer-slide {
          0% {
            left: -100%;
          }
          100% {
            left: 200%;
          }
        }

        .hh-float-btn:hover {
          transform: translateY(-3px) scale(1.02);
        }

        .hh-float-btn:active {
          transform: scale(0.98);
        }

        /* ─── BOTTOM NAV ─── */
        .hh-bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          max-width: 448px;
          margin: 0 auto;
          background: rgba(5, 13, 20, 0.92);
          backdrop-filter: blur(20px);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          justify-content: space-around;
          align-items: center;
          height: 64px;
          z-index: 100;
          box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.5);
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
          transition:
            color 0.2s,
            transform 0.2s;
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
          filter: drop-shadow(0 0 6px rgba(16, 185, 129, 0.6));
        }

        /* ─── ANIMATIONS ─── */
        @keyframes hh-card-appear {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .hh-entry-1 {
          animation: hh-entry 0.5s ease-out 0s both;
        }
        .hh-entry-2 {
          animation: hh-entry 0.5s ease-out 0.1s both;
        }
        .hh-entry-3 {
          animation: hh-entry 0.5s ease-out 0.2s both;
        }
        .hh-entry-4 {
          animation: hh-entry 0.5s ease-out 0.3s both;
        }
        .hh-entry-5 {
          animation: hh-entry 0.5s ease-out 0.4s both;
        }
        .hh-entry-6 {
          animation: hh-entry 0.5s ease-out 0.5s both;
        }

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
          .hh-bubble,
          .hh-orb-1,
          .hh-orb-2,
          .hh-live-dot,
          .hh-float-btn,
          .hh-float-shimmer,
          [class*="hh-entry-"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export const dynamic = "force-dynamic";

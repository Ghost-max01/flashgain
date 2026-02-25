"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ArrowLeft } from "lucide-react"

export default function UpgradeTiersPage() {
  const router = useRouter()
  const [activeTier, setActiveTier] = useState<number | null>(null)

  const tiers = [
    { name: "Tier 2", price: 15000, label: "₦15,000", icon: "🥈" },
    { name: "Tier 3", price: 20000, label: "₦20,000", icon: "🥉" },
    { name: "Tier 4", price: 30000, label: "₦30,000", icon: "🏆" },
    { name: "Tier 5", price: 50000, label: "₦50,000", icon: "👑" },
  ]

  const benefits = [
    {
      tier: "Tier 2",
      details: [
        "Earn ₦15,000 per referral",
        "Withdraw without referral",
        "Basic customer support",
        "Access to exclusive features",
        "Monthly spending limit: ₦5,000,000",
      ],
    },
    {
      tier: "Tier 3",
      details: [
        "Earn ₦20,000 per referral",
        "Withdraw without referral",
        "Priority customer support",
        "Reduced transaction fees",
        "10% bonus on all earnings",
        "Monthly spending limit: ₦10,000,000",
      ],
    },
    {
      tier: "Tier 4",
      details: [
        "Earn ₦30,000 per referral",
        "Withdraw without referral",
        "Premium customer support",
        "No transaction fees",
        "15% bonus on all earnings",
        "Exclusive investment opportunities",
        "Early access to new features",
        "Monthly spending limit: ₦20,000,000",
      ],
    },
    {
      tier: "Tier 5",
      details: [
        "Earn ₦50,000 per referral",
        "Withdraw without referral",
        "Personal account manager",
        "No transaction fees",
        "Unlimited withdrawal limits",
        "25% bonus on all earnings",
        "Exclusive offline events access",
        "Early access to new features",
        "Monthly spending limit: Unlimited",
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-600 via-purple-600 to-green-700 p-6 text-white animate-page-fade">
      <div className="flex items-center gap-4 mb-8 animate-slide-down">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="text-white/90 hover:bg-white/10 p-2 rounded-lg"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold tracking-wide">
            Upgrade Your Tier
          </h1>
          <p className="text-sm text-white/80">
            One-time lifetime upgrade to unlock premium Flash Gain features.
          </p>
        </div>
      </div>

      {/* Tier Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
        {tiers.map((tier, index) => (
          <Button
            key={index}
            onClick={() => setActiveTier(index)}
            className="relative overflow-hidden h-32 w-full text-base font-semibold 
                       bg-gradient-to-r from-green-500 via-purple-500 to-green-600
                       rounded-2xl shadow-lg text-white hover:scale-[1.04]
                       transition-all duration-500 ease-in-out flex flex-col items-center justify-center space-y-1"
          >
            <span className="text-3xl animate-pulse">{tier.icon}</span>
            <span className="font-bold">{tier.name}</span>
            <span className="text-xs opacity-90">{tier.label}</span>
            <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-10 transition-all" />
          </Button>
        ))}
      </div>

      {/* Telegram Support */}
      <div className="text-center mb-12 animate-slide-up">
        <Button
          onClick={() =>
            window.open("https://t.me/helpinghandsupport", "_self")
          }
          className="bg-white text-green-700 font-semibold hover:bg-white/80 rounded-xl px-5 py-2 shadow-md"
        >
          💬 Contact Support on Telegram
        </Button>
      </div>

      {/* Modal for Tier Benefits */}
      {activeTier !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white text-black rounded-2xl p-6 max-w-sm w-full mx-4 relative shadow-2xl animate-pop">
            <h2 className="text-lg font-extrabold text-green-700 mb-3 text-center">
              {benefits[activeTier].tier} Benefits
            </h2>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-2 mb-5 max-h-60 overflow-y-auto">
              {benefits[activeTier].details.map((detail, i) => (
                <li key={i}>{detail}</li>
              ))}
            </ul>
            <div className="flex justify-between gap-3">
              <Button
                onClick={() => setActiveTier(null)}
                className="w-1/2 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-xl font-medium"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  const amount = tiers[activeTier].price;
                  router.push(`/withdraw/bank-transfer?amount=${amount}`);
                }}
                className="w-1/2 bg-gradient-to-r from-green-600 to-purple-600 text-white font-semibold rounded-xl hover:scale-[1.03] transition-all"
              >
                Upgrade Now
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in { animation: fadeIn 0.3s ease forwards; }

        @keyframes pop {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); }
        }
        .animate-pop { animation: pop 0.4s ease-in-out; }

        @keyframes slideDown {
          from { transform: translateY(-15px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-down { animation: slideDown 0.6s ease forwards; }

        @keyframes slideUp {
          from { transform: translateY(15px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up { animation: slideUp 0.7s ease forwards; }

        @keyframes pageFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-page-fade { animation: pageFade 0.8s ease-in-out; }
      `}</style>
    </div>
  );
}

"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Logo } from "@/components/logo"

export default function AboutPage() {
  const router = useRouter()
  const [userData, setUserData] = useState<any>(null)

  useEffect(() => {
    const storedUser = localStorage.getItem("tivexx9ja-user")
    if (!storedUser) {
      router.push("/login")
      return
    }
    setUserData(JSON.parse(storedUser))
  }, [router])

  if (!userData) {
    return <div className="p-6 text-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-white text-gray-800 pb-10">
      {/* Header */}
      <div className="flex items-center p-4 border-b shadow-sm">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-green-700 hover:underline"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="font-medium">Back to Dashboard</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-8">
        <div className="flex justify-center mb-4">
          <Logo className="w-60 hover:scale-105 transition-transform duration-300" />
        </div>

        <h1 className="text-3xl font-bold text-center text-green-700">
          About FlashGain 9ja
        </h1>

        <div className="space-y-5 leading-relaxed">
          <p>
            FlashGain 9ja is a fast-rising Nigerian digital platform built to
            empower individuals through financial growth, earning opportunities,
            and access to smart online services — all in one place. Our goal is
            simple: to help Nigerians earn, grow, and live better in this tough
            economy.
          </p>

          <p>
            At FlashGain 9ja, we provide users with access to a sustainable earning
            system through referrals, simple online tasks, and digital tools
            that pay real value for your effort. Every user matters to us — and
            that’s why our team works daily to stabilize the platform, improve
            performance, and roll out better features.
          </p>

          <p>
            Users should note that our platform has gained massive attention,
            and we are actively maintaining the database to keep it fast and
            stable. Referral bonuses and referral counts take up to 15 minutes
            to display (sometimes faster). Withdrawals are processed within 5–10
            minutes. Please avoid using <strong>Opay</strong> for verification
            or transactions — every other Nigerian bank is supported.
          </p>

          <h2 className="text-xl font-semibold text-green-700">
            What You Can Do on FlashGain 9ja
          </h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Earn from daily tasks and referrals</li>
            <li>Withdraw earnings instantly anytime, any day</li>
            <li>Access exclusive bonuses through consistent referrals</li>
            <li>
              Upgrade your account for unlimited withdrawals without referrals
            </li>
            <li>Get 24/7 active support through our Telegram channel</li>
          </ul>

          <p>
            We’ve recently added a new{" "}
            <strong>“Withdraw Without Referral”</strong> toggle button that lets
            users withdraw earnings without referring anyone — simply upgrade
            your account to unlock this feature.
          </p>

          <p>
            However, those who prefer to refer can keep inviting friends — some
            users have referred over 100, 200, even 300 people. The more you
            refer, the higher your earnings and the greater your access to
            upcoming features.
          </p>

          <p className="font-medium text-green-800">
            FlashGain 9ja is not just a platform — it’s a movement built to help
            Nigerians earn online, support one another, and make digital income
            possible for everyone. The economy isn’t getting easier — but with
            FlashGain 9ja, your hustle will always pay off.
          </p>
        </div>

        {/* Contact Section */}
        <div className="pt-6 border-t">
          <h3 className="text-lg font-semibold mb-2 text-green-700">
            Contact Us
          </h3>
          <p>
            Telegram:{" "}
            <Link
              href="https://t.me/Helpinghandsupport"
              className="text-green-700 hover:underline"
            >
              @FlashGainSupport
            </Link>
            <br />
            Email:{" "}
            <a
              href="mailto:support@HelpingHands.com"
              className="text-green-700 hover:underline"
            >
              support@HelpingHands.com
            </a>
            <br />
            Address: Lagos, Nigeria
          </p>
        </div>

        <div className="text-center text-sm text-gray-500 mt-10">
          © 2025 FlashGain 9ja. All rights reserved.
        </div>
      </div>
    </div>
  );
}
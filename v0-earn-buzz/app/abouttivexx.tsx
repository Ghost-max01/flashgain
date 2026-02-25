"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Phone, Globe, Users, ShieldCheck, Gift, CreditCard, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
// If you have a Logo component, it will show. If not, it will just render nothing — harmless.
import { Logo } from "@/components/logo"

export default function AboutPage() {
  const router = useRouter()
  const [userData, setUserData] = useState<any>(null)

  useEffect(() => {
    // Preserve existing behaviour: require login
    const storedUser = localStorage.getItem("tivexx-user")
    if (!storedUser) {
      router.push("/login")
      return
    }
    setUserData(JSON.parse(storedUser))
  }, [router])

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 to-emerald-800 text-white">
        <div className="text-center p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <div>Loading Flash Gain profile…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-700 via-green-700 to-green-900 text-white">
      {/* subtle animated background elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-green-900/70 to-green-500/10" />
        <svg
          className="absolute -z-0 opacity-10"
          style={{ right: "-8%", top: "-6%", width: "70%" }}
          viewBox="0 0 600 600"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="rad2" cx="50%" cy="50%">
              <stop offset="0%" stopColor="var(--tiv-3)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--tiv-2)" stopOpacity="0.02" />
            </radialGradient>
          </defs>
          <circle cx="300" cy="300" r="250" fill="url(#rad2)" />
        </svg>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard">
            <Button
              variant="ghost"
              size="icon"
              className="text-white/90 p-2 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>

          <div className="flex-1">
            <div className="flex items-center gap-4">
              <div className="w-36">
                {/* Logo may exist in your project */}
                <Logo className="w-full" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold text-white/90">
                  Flash Gain
                </h1>
                <p className="text-sm text-white/90 mt-0.5">
                  Empowering Hustlers. Changing Lives.
                </p>
              </div>
            </div>
          </div>

          <div className="space-x-3">
            <Button
              onClick={() =>
                window.open("https://t.me/helpinghandsupport", "_self")
              }
              className="bg-white/10 hover:bg-white/20 border border-white"
            >
              <Phone className="h-4 w-4 mr-2" /> Support
            </Button>
          </div>
        </div>

        {/* Hero card */}
        <Card className="p-6 mb-6 bg-white/6 backdrop-blur-md border border-white/10 shadow-2xl rounded-2xl">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="flex-none p-4 rounded-full bg-gradient-to-br from-emerald-300 to-amber-300 text-black shadow-md animate-bounce">
              <ShieldCheck className="h-8 w-8" />
            </div>

            <div className="flex-1">
              <h2 className="text-2xl font-bold">Flash Gain</h2>
              <p className="text-white/70 mt-2 leading-relaxed">
                {" "}
                Flash Gain is a fintech rewards platform built to help Nigerians
                earn, save and access fast financial products. We combine
                referral rewards, daily earnings, and low-barrier loan options
                in one mobile-friendly experience.{" "}
              </p>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-white/5 border border-white/6">
                  <div className="text-xs text-white/70">Core Offer</div>
                  <div className="font-semibold mt-1">Earn & Withdraw</div>
                  <div className="text-sm text-white/70 mt-1">
                    Earn daily, refer friends and withdraw your balance
                    securely.
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white/5 border border-white/6">
                  <div className="text-xs text-white/70">Safety</div>
                  <div className="font-semibold mt-1">
                    CBN-aligned verification
                  </div>
                  <div className="text-sm text-white/70 mt-1">
                    Identity checks to prevent fraud and bot activity.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* What we offer */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="p-4 bg-white/6">
            <div className="flex items-start gap-3">
              <Gift className="h-6 w-6 text-emerald-300" />
              <div>
                <h3 className="font-bold">Welcome Bonus</h3>
                <p className="text-sm text-white/70 mt-1">
                  New users may qualify for bonuses and starter earnings as
                  shown on the app.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white/6">
            <div className="flex items-start gap-3">
              <Users className="h-6 w-6 text-emerald-300" />
              <div>
                <h3 className="font-bold">Refer & Earn</h3>
                <p className="text-sm text-white/70 mt-1">
                  Refer friends — minimum of <strong>5 referrals</strong>{" "}
                  unlocks withdrawals and higher bonuses. Top referrers get
                  premium access.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white/6">
            <div className="flex items-start gap-3">
              <CreditCard className="h-6 w-6 text-emerald-300" />
              <div>
                <h3 className="font-bold">Fast Withdrawals</h3>
                <p className="text-sm text-white/70 mt-1">
                  Withdraw anytime after meeting the requirements — or use the
                  new upgrade toggle to withdraw without referrals.
                </p>
              </div>
            </div>
          </Card>
        </section>

        {/* Features */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="p-5 bg-white/6">
            <h3 className="font-bold mb-3">Verification & Refundable Fee</h3>
            <p className="text-sm text-white/70 leading-relaxed">
              To comply with regulatory requirements and prevent automated
              fraud, Flash Gain requires a one-time verification fee. This fee
              is used for identity documentation checks and is{" "}
              <strong>refunded</strong> to your dashboard balance after
              successful verification.
            </p>

            <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/8">
              <div className="text-sm text-white/90">
                <strong>How it works</strong>
              </div>
              <ol className="list-decimal list-inside text-sm text-white/80 mt-2 space-y-1">
                <li>
                  Pay the one-time verification fee (displayed on the
                  verification page).
                </li>
                <li>
                  Verification completes and fee is credited back to your
                  dashboard balance.
                </li>
                <li>You can then withdraw and access premium features.</li>
              </ol>
            </div>
          </Card>

          <Card className="p-5 bg-white/6">
            <h3 className="font-bold mb-3">Withdraw Options & Upgrade</h3>
            <p className="text-sm text-white/80 leading-relaxed">
              Flash Gain offers two ways to withdraw:
            </p>
            <ul className="list-disc pl-5 mt-3 text-sm text-white/80 space-y-2">
              <li>
                <strong>Refer & Earn:</strong> Refer 5 or more friends for
                instant withdrawals.
              </li>
              <li>
                <strong>Withdraw Without Referral:</strong> Toggle the new
                button on your Withdraw Page and follow the Upgrade flow to
                enable withdrawals without referring anyone.
              </li>
            </ul>

            <div className="mt-4 text-sm text-white/80">
              <strong>Note:</strong> The upgrade is a one-time account upgrade
              enabling withdrawal without referrals. After toggling and
              confirming upgrade you’ll be redirected to the upgrade payment
              page.
            </div>
          </Card>
        </section>

        {/* Loans */}
        <section className="mb-6">
          <Card className="p-6 bg-white/6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-amber-300 text-black">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold">Business Loans</h3>
                <p className="text-sm text-white/80 mt-1 leading-relaxed">
                  Apply for business loans between <strong>₦500,000</strong> and{" "}
                  <strong>₦5,000,000</strong>. Repayment term is{" "}
                  <strong>12 months</strong>. No collateral or BVN is required.
                  A <strong>3% processing fee</strong> is charged upfront (you
                  will pay the fee and it is redirected to our payment page).
                </p>

                <div className="mt-4 flex gap-3">
                  <Button
                    onClick={() => router.push("/loan")}
                    className="bg-white/10 hover:bg-white/20"
                  >
                    Apply for Loan
                  </Button>
                  <Button
                    onClick={() => router.push("/businessloan")}
                    className="bg-amber-300 text-black"
                  >
                    Business Loans
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Roadmap / Tutorials */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="p-4 bg-white/6">
            <h4 className="font-bold">Upcoming Tutorial</h4>
            <p className="text-sm text-white/80 mt-2">
              We will release a step-by-step tutorial video showing how to
              withdraw, use the toggle upgrade, and upload payment proof. Stay
              tuned to our Telegram channel for the drop.
            </p>
            <div className="mt-4">
              <Button
                onClick={() => window.open("https://t.me/helpinghandsupport")}
                className="bg-white/10 hover:bg-white/20"
              >
                Join Support Channel
              </Button>
            </div>
          </Card>

          <Card className="p-4 bg-white/6">
            <h4 className="font-bold">Community</h4>
            <p className="text-sm text-white/80 mt-2">
              Join our Telegram community for announcements, tutorial links, and
              priority support.
            </p>
            <div className="mt-4">
              <Button
                onClick={() => window.open("https://t.me/helpinghandsnews")}
                className="bg-emerald-300 text-black"
              >
                Join Community
              </Button>
            </div>
          </Card>
        </section>

        {/* Contact & Footer */}
        <footer className="mt-8">
          <Card className="p-6 bg-white/6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h5 className="font-bold">Contact Us</h5>
                <p className="text-sm text-white/80 mt-1">
                  Phone: <strong>+44 7851 850678</strong>
                  <br />
                  Support: <strong>t.me/helpinghandsupport</strong>
                  <br />
                  Site: <strong>https://Helpinghands.money</strong>
                </p>
              </div>

              <div className="text-sm text-white/70">
                Flash Gain © {new Date().getFullYear()}. All rights reserved.
              </div>
            </div>
          </Card>
        </footer>
      </div>

      {/* Small global animations */}
      <style jsx>{`
        @keyframes particle {
          0% {
            transform: translateY(0) translateX(0);
            opacity: 0.9;
          }
          50% {
            transform: translateY(-20px) translateX(12px);
            opacity: 0.35;
          }
          100% {
            transform: translateY(0) translateX(0);
            opacity: 0.9;
          }
        }
        .animate-particle {
          animation: particle 8s linear infinite;
        }

        @keyframes bounce {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }
        .animate-bounce {
          animation: bounce 2s infinite;
        }
      `}</style>
    </div>
  );
}
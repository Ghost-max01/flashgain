"use client"

import { useEffect, useState } from "react"

// ✅ 100+ motivational and referral-only messages
const messages = [
  "💰 Refer 5 friends and unlock unlimited earnings!",
  "🎯 Every referral earns you ₦10,000 instantly!",
  "🚀 Start earning today - it's completely free!",
  "⭐ Your success story starts with one referral!",
  "💎 Turn your network into income!",
  "🔥 The more you share, the more you earn!",
  "🎁 Welcome bonus: ₦50,000 waiting for you!",
  "💪 Build your wealth one referral at a time!",
  "🌟 Join thousands earning daily on Flash Gain!",
  "📈 Watch your balance grow every minute!",
  "🎊 Claim ₦1,000 every 60 seconds!",
  "💸 Your friends will thank you for this opportunity!",
  "🏆 Top earners make over ₦500,000 monthly!",
  "✨ Financial freedom is just a few referrals away!",
  "🎯 Set your goal and start referring today!",
  "💰 Passive income made simple!",
  "🚀 No investment needed - just share and earn!",
  "⚡ Fast earnings, real rewards!",
  "🌈 Create multiple income streams!",
  "🎁 Bonus rewards for active members!",
  "💎 Fatima made ₦80,000 from referrals this month!",
  "🎊 Ibrahim just unlocked his earning level!",
  "🏆 Yusuf is our top earner with ₦600,000!",
  "✨ Chioma referred 10 friends in one day!",
  "🎯 Adebayo just hit ₦250,000 in total earnings!",
  "💰 Zainab made ₦90,000 this week!",
  "🔥 Oluwaseun earned ₦180,000 from referrals!",
  "🌟 Biodun hit ₦350,000 in 3 months!",
  "🎁 Aisha earned ₦110,000 in 5 days!",
  "💪 Chukwu made ₦400,000 last month!",
  "🚀 Halima just referred her 20th friend!",
  "💎 Segun earned ₦280,000 from his team!",
  "🎊 Funmi earned ₦150,000 this week!",
  "⭐ Musa just unlocked premium features!",
  "🔥 Nneka made ₦220,000 from referrals!",
  "🌈 Chiamaka earned ₦95,000 in 3 days!",
  "🎯 Usman referred 12 friends this week!",
  "💸 Adaeze made ₦170,000 this month!",
  "🏆 Bashir is earning ₦50,000 daily!",
  "🎁 Suleiman earned ₦140,000 last week!",
  "💪 Ifeoma made ₦260,000 from referrals!",
  "🚀 Yakubu just hit ₦100,000 bonus level!",
  "💎 Amaka earned ₦410,000 this month!",
  "🎊 Aliyu earned ₦130,000 in 4 days!",
  "⚡ Oge just referred her 25th friend!",
  "🌟 Murtala made ₦290,000 this month!",
  "🔥 Nkechi earned ₦360,000 today!",
  "💰 Abubakar made ₦105,000 this week!",
  "🎯 Chidinma just unlocked referrals bonus!",
  "💸 Uche made ₦240,000 from referrals!",
  "🏆 Hauwa is our newest top earner!",
  "🎁 Zara earned ₦160,000 this week!",
  "💪 Chinedu made ₦420,000 last month!",
  "🚀 Asmau just referred 18 friends!",
  "💎 Ebuka earned ₦270,000 this month!",
  "🎊 Khadija earned ₦125,000 in 6 days!",
  "⚡ Ifeanyi just claimed his daily bonus!",
  "🌟 Sadiq made ₦310,000 this month!",
  "🔥 Adaora earned ₦390,000 today!",
  "💰 Ready to withdraw? Refer 5 friends to unlock!",
  "🎯 Just 5 referrals away from your first payout!",
  "⚡ Fast payouts - money in your account within 24hrs!",
  "💥 Flash Gain - Where referrals pay big!",
  "💰 Earn even while you sleep!",
  "🔥 Invite your circle and watch your wallet grow!",
  "🌟 Teamwork pays – literally!",
  "💎 Your link is your goldmine!",
  "🎁 Sharing is the new side hustle!",
  "🏆 Flash Gain - Home of top earners!",
  "🚀 Referral game strong, earnings stronger!",
  "✨ Turn one click into thousands!",
  "🎯 Keep your referrals active and earn more bonuses!",
  "💪 The grind pays – join the winning team!",
  "💰 Consistency = Cashflow!",
  "🎊 Flash Gain is changing lives daily!",
  "🔥 Real people, real earnings!",
  "💎 One referral a day keeps poverty away!",
  "🚀 Start small, earn big – Flash Gain style!",
  "🏆 The next success story could be yours!",
  "✨ Believe. Refer. Earn.",
  "💸 Everyone wins on Flash Gain!",
  "🎁 Join the movement, claim your rewards!",
  "🌟 Smart work beats hard work here!",
  "💰 No limits, just referrals!",
  "⚡ Your phone = your ATM now!",
  "🔥 New earnings every minute on Flash Gain!",
  "💸 Ngozi earned ₦500,000 in 2 weeks!",
  "🏦 Minimum withdrawal: ₦200,000 - Start earning now!",
  "🌈 From zero to ₦500,000 – your turn next!",
  "🎯 You’re 5 friends away from ₦500,000!",
  "🎯 Unlock your ₦500,000 goal!",
  "🚀 It’s not luck – it’s Flash Gain!",
];

// 🔀 Shuffle helper
function shuffleArray<T>(array: T[], seed: number): T[] {
  const result = [...array]
  let m = result.length, t, i
  while (m) {
    i = Math.floor(random(seed++) * m--)
    t = result[m]
    result[m] = result[i]
    result[i] = t
  }
  return result
}

// simple pseudo-random generator
function random(seed: number) {
  const x = Math.sin(seed++) * 10000
  return x - Math.floor(x)
}

export function ScrollingText() {
  const [index, setIndex] = useState(0)
  const [shuffled, setShuffled] = useState<string[]>(messages)

  useEffect(() => {
    // unique shuffle per user (browser)
    let seed = Number(localStorage.getItem("tivexx9ja_shuffle_seed_v2"))
    if (!seed) {
      seed = Math.floor(Math.random() * 100000)
      localStorage.setItem("tivexx9ja_shuffle_seed_v2", seed.toString())
    }
    const newShuffled = shuffleArray(messages, seed)
    setShuffled(newShuffled)

    // timing logic (1 minute = 60000ms)
    const savedIndex = Number(localStorage.getItem("tivexx9ja_text_index_v2")) || 0
    const savedTime = Number(localStorage.getItem("tivexx9ja_text_time_v2")) || Date.now()
    const elapsed = Date.now() - savedTime

    let currentIndex = savedIndex
    if (elapsed > 60000) {
      currentIndex = (savedIndex + Math.floor(elapsed / 300000)) % newShuffled.length
    }
    setIndex(currentIndex)

    const interval = setInterval(() => {
      setIndex(prev => {
        const next = (prev + 1) % newShuffled.length
        localStorage.setItem("tivexx9ja_text_index_v2", next.toString())
        localStorage.setItem("tivexx9ja_text_time_v2", Date.now().toString())
        return next
      })
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  const message = shuffled[index] || ""

  return (
    <div className="bg-gradient-to-r from-green-600 to-green-700 text-white py-2 px-4 overflow-hidden">
      <div className="whitespace-nowrap animate-marquee">
        <span className="text-sm font-medium">{message}</span>
      </div>
      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          display: inline-block;
          animation: marquee 15s linear infinite;
        }
      `}</style>
    </div>
  )
}
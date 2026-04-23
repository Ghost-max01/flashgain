"use client"

import { ThumbsUp, MessageCircle, Star } from "lucide-react"

const reviews = [
  { name: "Chioma A.", text: "I earned ₦50,000 in my first week! FlashGain 9ja is 100% legit.", likes: 142, time: "2h ago" },
  { name: "Emeka O.", text: "Withdrawal came in less than 5 minutes. No cap, this platform is real.", likes: 89, time: "4h ago" },
  { name: "Blessing I.", text: "I referred 30 people and earned ₦150,000. God bless FlashGain 9ja!", likes: 234, time: "1h ago" },
  { name: "Tunde M.", text: "Best earning platform in Nigeria. I use it every single day.", likes: 67, time: "6h ago" },
  { name: "Funke B.", text: "The daily earnings button alone changed my life. ₦1,000 every minute!", likes: 312, time: "30m ago" },
  { name: "Adamu K.", text: "No hidden charges, no stress. Just pure earnings. Thank you FG9ja!", likes: 178, time: "3h ago" },
]

const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("")
const getColor = (i: number) => {
  const colors = ["bg-emerald-500", "bg-blue-500", "bg-purple-500", "bg-pink-500", "bg-orange-500", "bg-teal-500"]
  return colors[i % colors.length]
}

const ReviewCardSmall = ({ review, index }: { review: typeof reviews[0]; index: number }) => (
  <div
    onClick={() => window.open("https://flashgain.online", "_blank")}
    className="min-w-[240px] max-w-[260px] bg-gradient-to-br from-white/8 to-white/4 border border-white/10 rounded-lg p-3 flex-shrink-0 cursor-pointer hover:bg-gradient-to-br hover:from-white/12 hover:to-white/6 transition-all duration-300 hover:border-emerald-400/30"
  >
    <div className="flex gap-2.5">
      <div className={`w-8 h-8 rounded-full ${getColor(index)} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
        {getInitials(review.name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1.5">
          <h4 className="font-semibold text-xs text-white truncate">{review.name}</h4>
          <span className="text-xs text-gray-400 flex-shrink-0">{review.time}</span>
        </div>
        <div className="flex gap-0.5 my-1">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
          ))}
        </div>
        <p className="text-xs text-gray-300 leading-snug line-clamp-3">{review.text}</p>
        <div className="flex gap-2.5 mt-2 pt-2 border-t border-white/5">
          <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-emerald-400 transition-colors">
            <ThumbsUp className="w-3 h-3" />
            <span>{review.likes}</span>
          </button>
          <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-emerald-400 transition-colors">
            <MessageCircle className="w-3 h-3" />
            <span>Reply</span>
          </button>
        </div>
      </div>
    </div>
  </div>
)

export function ReferralReviews() {
  const doubled = [...reviews, ...reviews]

  return (
    <div className="referral-reviews-container">
      <div className="referral-reviews-header">
        <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Real Reviews</span>
        <h3 className="text-sm font-bold text-white">What Users Are Saying</h3>
      </div>

      <div className="referral-reviews-scroll">
        <div className="referral-reviews-track">
          {doubled.map((review, i) => (
            <ReviewCardSmall key={`review-${i}`} review={review} index={i} />
          ))}
        </div>
      </div>

      <style jsx>{`
        .referral-reviews-container {
          width: 100%;
        }

        .referral-reviews-header {
          margin-bottom: 10px;
        }

        .referral-reviews-header span {
          display: block;
          margin-bottom: 4px;
        }

        .referral-reviews-header h3 {
          margin: 0;
        }

        .referral-reviews-scroll {
          overflow: hidden;
          position: relative;
        }

        .referral-reviews-track {
          display: flex;
          gap: 12px;
          animation: scroll-left-slow 60s linear infinite;
        }

        .referral-reviews-track:hover {
          animation-play-state: paused;
        }

        @keyframes scroll-left-slow {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(-260px * 6 - 72px));
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .referral-reviews-track {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}

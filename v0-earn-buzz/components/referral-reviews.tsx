"use client"

import { ThumbsUp, MessageCircle, Star } from "lucide-react"
import { useState, useEffect } from "react"

// Generate a large array of reviews
const generateReviews = () => {
  const names = [
    "Chioma A.", "Emeka O.", "Blessing I.", "Tunde M.", "Funke B.", "Adamu K.", "Ngozi E.", "Ibrahim S.", "Adaora N.", "Chukwuemeka P.",
    "Amara J.", "Kelechi R.", "Nneka U.", "Obinna T.", "Zara Y.", "Yusuf H.", "Halima D.", "Jibril F.", "Amina W.", "Mustapha G.",
    "Fatima Z.", "Suleiman V.", "Aisha X.", "Abdul C.", "Maryam B.", "Rashid Q.", "Safiya L.", "Umar M.", "Hauwa K.", "Ishaq J.",
    "Zainab O.", "Bello I.", "Rukayya A.", "Sani E.", "Asmau N.", "Aliyu P.", "Hajiya R.", "Mallam U.", "Binta T.", "Garba Y.",
    "Amina H.", "Sadiq D.", "Khadija F.", "Abubakar W.", "Zara G.", "Yusuf V.", "Halima X.", "Jibril C.", "Adaora B.", "Mustapha Q.",
    "Fatima L.", "Suleiman M.", "Aisha K.", "Abdul J.", "Maryam O.", "Rashid I.", "Safiya A.", "Umar E.", "Hauwa N.", "Ishaq P.",
    "Zainab R.", "Bello U.", "Rukayya T.", "Sani Y.", "Asmau H.", "Aliyu D.", "Hajiya F.", "Mallam W.", "Binta G.", "Garba V.",
    "Amina X.", "Sadiq C.", "Khadija B.", "Abubakar Q.", "Zara L.", "Yusuf M.", "Halima K.", "Jibril J.", "Adaora O.", "Mustapha I.",
    "Fatima A.", "Suleiman E.", "Aisha N.", "Abdul P.", "Maryam R.", "Rashid U.", "Safiya T.", "Umar Y.", "Hauwa H.", "Ishaq D.",
    "Zainab F.", "Bello W.", "Rukayya G.", "Sani V.", "Asmau X.", "Aliyu C.", "Hajiya B.", "Mallam Q.", "Binta L.", "Garba M."
  ];

  const texts = [
    "I earned ₦50,000 in my first week! FlashGain 9ja is 100% legit.",
    "Withdrawal came in less than 5 minutes. No cap, this platform is real.",
    "I referred 30 people and earned ₦150,000. God bless FlashGain 9ja!",
    "Best earning platform in Nigeria. I use it every single day.",
    "The daily earnings button alone changed my life. ₦2,000 every minute!",
    "No hidden charges, no stress. Just pure earnings. Thank you FG9ja!",
    "I've been earning consistently for 6 months now. Highly recommend!",
    "Fast payments and great customer support. 5 stars!",
    "This app helped me pay my school fees. Forever grateful!",
    "Easy to use interface and reliable withdrawals. Love it!",
    "I started with ₦5,000 and now have ₦200,000. Amazing growth!",
    "The referral program is the best. Earn while helping others.",
    "Never had any issues with payments. Always on time.",
    "Great platform for side hustle. Highly recommended!",
    "I earn more here than my regular job. Life changing!",
    "Simple registration and instant earnings. Perfect!",
    "The support team is always helpful and responsive.",
    "I've withdrawn over ₦500,000 since joining. Legit!",
    "Best investment of my time. Worth every second!",
    "No scams, just real earnings. Thank you FlashGain!",
    "The app is smooth and the earnings are consistent.",
    "I love the daily bonuses. Keeps me motivated!",
    "Fast approval for withdrawals. No waiting around.",
    "This platform changed my financial status. Grateful!",
    "Easy to navigate and user-friendly. Great job!",
    "I've referred 50+ people and still earning. Amazing!",
    "The earnings calculator is spot on. No surprises.",
    "Reliable platform with great features. Love it!",
    "I earn ₦10,000 daily minimum. Can't complain!",
    "The community is supportive and helpful.",
    "Best earning app in Nigeria. Period!",
    "I've been here for a year and still going strong.",
    "The rewards are generous and timely.",
    "No hidden fees, everything is transparent.",
    "I started small and now earn big. Proud member!",
    "The app loads fast and works perfectly.",
    "Great for beginners and experienced users alike.",
    "I've never missed a withdrawal. Always paid!",
    "The referral links work perfectly. Easy sharing.",
    "This app is my main source of income now.",
    "Highly satisfied with the service. 10/10!",
    "The bonuses keep coming. Never boring!",
    "I love the instant notifications. Stay updated.",
    "The platform is secure and trustworthy.",
    "I've earned more than I expected. Surprised!",
    "Great customer service. Always there when needed.",
    "The earnings are real and verifiable.",
    "I recommend this to all my friends and family.",
    "The app is addictive in a good way. Keep earning!",
    "No downtime, always available. Perfect!",
    "The withdrawal limits are fair and reasonable.",
    "I've upgraded my lifestyle thanks to this app.",
    "The support is 24/7. Always helpful!",
    "This is the future of earning in Nigeria.",
    "I've never been scammed. Legit platform!",
    "The rewards are worth the effort. Totally!",
    "Great for students and working professionals.",
    "I earn while sleeping. Passive income!",
    "The app is intuitive and easy to use.",
    "I've withdrawn to different banks. All successful!",
    "The community reviews are genuine. No bots!",
    "This platform is built to last. Solid!",
    "I love the daily challenges. Fun and rewarding!",
    "The earnings are consistent and reliable.",
    "No complaints whatsoever. Perfect app!",
    "I've referred hundreds and still earning.",
    "The bonuses are the cherry on top.",
    "Great platform for financial freedom.",
    "I started yesterday and already earned ₦5,000!",
    "The app is fast and responsive. No lags!",
    "Highly recommend for extra income.",
    "The withdrawal process is seamless.",
    "I've been paid every single time. Trustworthy!",
    "The app keeps getting better. Updates are great!",
    "I earn more here than anywhere else.",
    "The support team is knowledgeable and friendly.",
    "This app is my secret to financial success.",
    "No issues with account security. Safe!",
    "The earnings are life-changing. Thank you!",
    "I love the variety in earning methods.",
    "The platform is user-centric. Great design!",
    "I've never had a failed withdrawal. Impressive!",
    "The bonuses motivate me to earn more.",
    "Great for building savings. Highly useful!",
    "The app is available on all devices. Convenient!",
    "I earn ₦20,000+ weekly. Can't stop!",
    "The referral program is generous.",
    "This platform is the real deal. No doubts!",
    "I've been earning for months without issues.",
    "The customer support is top-notch.",
    "The app is reliable and consistent.",
    "I love the instant earnings feature.",
    "The platform is transparent and honest.",
    "I've upgraded my phone thanks to this app.",
    "The earnings are worth every minute.",
    "Great platform for financial growth.",
    "I recommend this app to everyone I know.",
    "The withdrawal speed is unmatched.",
    "The app is secure and protected.",
    "I've earned thousands since joining.",
    "The bonuses are frequent and generous.",
    "This is the best earning app ever!",
    "The platform is easy to understand.",
    "I earn daily without fail. Reliable!",
    "The support is always available.",
    "The app is fun and engaging.",
    "I've never been disappointed. Always paid!",
    "The earnings are substantial and real.",
    "Great for all ages and backgrounds.",
    "The platform is innovative and modern.",
    "I love the daily rewards system.",
    "The app is my go-to for earnings."
  ];

  const times = ["1m ago", "2m ago", "5m ago", "10m ago", "15m ago", "30m ago", "1h ago", "2h ago", "3h ago", "4h ago", "5h ago", "6h ago", "12h ago", "1d ago", "2d ago", "3d ago", "1w ago"];

  const reviews = [];
  for (let i = 0; i < 100; i++) {
    const name = names[Math.floor(Math.random() * names.length)];
    const text = texts[Math.floor(Math.random() * texts.length)];
    const likes = Math.floor(Math.random() * 400) + 50; // 50-450 likes
    const time = times[Math.floor(Math.random() * times.length)];
    reviews.push({ name, text, likes, time });
  }
  return reviews;
};

const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("")
const getColor = (i: number) => {
  const colors = ["bg-emerald-500", "bg-blue-500", "bg-purple-500", "bg-pink-500", "bg-orange-500", "bg-teal-500"]
  return colors[i % colors.length]
}

const ReviewCardSmall = ({
  review,
  index,
}: {
  review: { name: string; text: string; likes: number; time: string };
  index: number;
}) => (
  <div
    onClick={() =>
      window.open("https://flashgain-nigeria-hub-gpsz.vercel.app", "_blank")
    }
    className="min-w-[240px] max-w-[260px] bg-gradient-to-br from-white/8 to-white/4 border border-white/10 rounded-lg p-3 flex-shrink-0 cursor-pointer hover:bg-gradient-to-br hover:from-white/12 hover:to-white/6 transition-all duration-300 hover:border-emerald-400/30"
  >
    <div className="flex gap-2.5">
      <div
        className={`w-8 h-8 rounded-full ${getColor(index)} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}
      >
        {getInitials(review.name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1.5">
          <h4 className="font-semibold text-xs text-white truncate">
            {review.name}
          </h4>
          <span className="text-xs text-gray-400 flex-shrink-0">
            {review.time}
          </span>
        </div>
        <div className="flex gap-0.5 my-1">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className="w-2.5 h-2.5 fill-amber-400 text-amber-400"
            />
          ))}
        </div>
        <p className="text-xs text-gray-300 leading-snug line-clamp-3">
          {review.text}
        </p>
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
);

export function ReferralReviews() {
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    const shuffledReviews = generateReviews().sort(() => Math.random() - 0.5);
    setReviews(shuffledReviews);
  }, []);

  return (
    <div className="referral-reviews-container">
      <div className="referral-reviews-header">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Flashgain9ja Review</span>
        <h3 className="text-sm font-bold text-white">What Users Are Saying</h3>
      </div>

      <div className="referral-reviews-scroll">
        <div className="referral-reviews-track">
          {reviews.map((review, i) => (
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
          animation: scroll-left-slow 120s linear infinite;
        }

        .referral-reviews-track:hover {
          animation-play-state: paused;
        }

        @keyframes scroll-left-slow {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(-260px * 100 - 12px * 99));
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

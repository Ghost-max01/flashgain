"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

// Prize images - using public directory paths
const imgIphone15 = "/assets/prizes/iphone15pro.png";
const imgFridge = "/assets/prizes/smart-fridge.png";
const imgIphone17 = "/assets/prizes/iphone17.png";
const imgOledTv = "/assets/prizes/oled-tv.png";
const imgPs5 = "/assets/prizes/ps5.png";
const imgMacbook = "/assets/prizes/macbook-air.png";
const imgIphone16 = "/assets/prizes/iphone16.png";
const imgGiftCard = "/assets/prizes/gift-card.png";
const imgHeadset = "/assets/prizes/gaming-headset.png";
const imgProjector = "/assets/prizes/projector.png";

/* ──────────────────────────── DATA ──────────────────────────── */

interface Prize {
  name: string;
  emoji: string;
  color: string;
  value: string;
  isWin: boolean;
  description: string;
  image?: string;
}

const PRIZES: Prize[] = [
  { name: "iPhone 16 Pro", emoji: "📱", color: "#E53E3E", value: "₦950,000", isWin: true, description: "The latest iPhone with Pro chip, titanium design, and pro camera system.", image: imgIphone15 },
  { name: "Smart Refrigerator", emoji: "❄️", color: "#2D9CDB", value: "₦650,000", isWin: true, description: "Samsung Family Hub smart fridge with touchscreen and AI-powered features.", image: imgFridge },
  { name: "iPhone 17", emoji: "🤩", color: "#9B51E0", value: "₦1,900,000", isWin: true, description: "Next-gen iPhone 17 with revolutionary design and cutting-edge performance.", image: imgIphone17 },
  { name: "55\" OLED Smart TV", emoji: "📺", color: "#219653", value: "₦500,000", isWin: true, description: "LG 55-inch OLED TV with Dolby Vision, Atmos, and smart webOS platform.", image: imgOledTv },
  { name: "PlayStation 5", emoji: "🎮", color: "#2F80ED", value: "₦900,000", isWin: true, description: "Sony PS5 console with DualSense controller and 825GB SSD storage.", image: imgPs5 },
  { name: "Better Luck Next Time!", emoji: "😅", color: "#4A5568", value: "", isWin: false, description: "" },
  { name: "MacBook Air M3", emoji: "💻", color: "#F2994A", value: "₦850,000", isWin: true, description: "Apple MacBook Air with M3 chip, 15-hour battery, and Liquid Retina display.", image: imgMacbook },
  { name: "iPhone 16", emoji: "📲", color: "#EB5757", value: "₦800,000", isWin: true, description: "iPhone 16 with Action button, A18 chip, and advanced camera features.", image: imgIphone16 },
  { name: "₦50,000 Gift Card", emoji: "🎁", color: "#27AE60", value: "$1,000", isWin: true, description: "₦50,000 shopping gift card redeemable at any partner store nationwide.", image: imgGiftCard },
  { name: "Streamer Headset", emoji: "🎧", color: "#8B5CF6", value: "₦200,000", isWin: true, description: "Premium wireless gaming headset with noise cancellation and surround sound.", image: imgHeadset },
  { name: "Portable Projector", emoji: "🎬", color: "#F59E0B", value: "₦180,000", isWin: true, description: "4K portable smart projector with built-in speakers and streaming apps.", image: imgProjector },
  { name: "Spin Again!", emoji: "🔄", color: "#718096", value: "", isWin: false, description: "" },
];

const WINNERS = [
  { name: "Adebayo O.", prize: "iPhone 16 Pro", date: "Feb 4, 2026", location: "Lagos" },
  { name: "Chioma N.", prize: "PlayStation 5", date: "Feb 3, 2026", location: "Abuja" },
  { name: "Emeka K.", prize: "MacBook Air M3", date: "Feb 2, 2026", location: "Port Harcourt" },
  { name: "Fatima B.", prize: "$1,000 Gift Card", date: "Feb 1, 2026", location: "Kano" },
  { name: "Grace A.", prize: "Gaming Headset", date: "Jan 31, 2026", location: "Ibadan" },
  { name: "Ibrahim M.", prize: "55\" OLED Smart TV", date: "Jan 30, 2026", location: "Enugu" },
  { name: "Jennifer U.", prize: "iPhone 16", date: "Jan 29, 2026", location: "Benin City" },
  { name: "Kelechi D.", prize: "Portable Projector", date: "Jan 28, 2026", location: "Calabar" },
];

const FAQS = [
  {
    q: "Is this promotion real?",
    a: "Absolutely! Flash Gains is an officially registered earning platform . All prizes are genuine and verifiable. Winners are contacted directly to arrange delivery.",
  },
  {
    q: "How many times can I spin?",
    a: "You can spin as many times as you like! Each spin is completely independent, so your chances are fresh every time.",
  },
  {
    q: "How do I claim my prize?",
    a: "When you win, a congratulations screen will appear with instructions. You'll be asked to provide delivery details and our team will process your prize within 3-5 business days.",
  },
  {
    q: "Is there a cost to participate?",
    a: "No! Spinning the wheel is 100% free. There are no hidden charges, subscriptions, or fees of any kind.",
  },
  {
    q: "What are the odds of winning?",
    a: "Each segment of the wheel has an equal probability of being selected. With 12 segments, 10 of which are prizes, you have great odds!",
  },
  {
    q: "Can I win more than once?",
    a: "Yes! There's no limit to the number of prizes you can win. Keep spinning and keep winning!",
  },
];

/* ──────────────────────────── COMPONENTS ──────────────────────────── */

const Navbar = ({ activeSection }: { activeSection: string }) => {
  const [open, setOpen] = useState(false);
  const links = [
    { id: "hero", label: "Home" },
    { id: "prizes", label: "Prizes" },
    { id: "how", label: "How It Works" },
    { id: "winners", label: "Winners" },
    { id: "about", label: "About" },
    { id: "faq", label: "FAQ" },
    { id: "contact", label: "Contact" },
  ];

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-green-900/90 via-green-900/85 to-black/90 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button onClick={() => scrollTo("hero")} className="flex items-center gap-2">
            <span className="text-2xl">🎰</span>
            <span className="font-display font-bold text-lg bg-gradient-to-r from-amber-300 to-emerald-300 bg-clip-text text-transparent">Flash Gains</span>
          </button>

          <div className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <button
                key={l.id}
                onClick={() => scrollTo(l.id)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeSection === l.id
                    ? "text-amber-300 bg-white/10"
                    : "text-white/80 hover:text-white hover:bg-white/5"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded-md text-white"
            aria-label="Toggle menu"
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
              {open ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-gradient-to-b from-green-900/95 to-black/95 backdrop-blur-xl border-b border-white/10">
          <div className="px-4 py-3 space-y-1">
            {links.map((l) => (
              <button
                key={l.id}
                onClick={() => scrollTo(l.id)}
                className="block w-full text-left px-3 py-2 rounded-md text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

/* ── Canvas-based Spin Wheel with Images ── */

const WHEEL_SIZE = 420;
const CENTER = WHEEL_SIZE / 2;
const RADIUS = WHEEL_SIZE / 2;
const SEG_ANGLE = (2 * Math.PI) / PRIZES.length;

interface SpinWheelProps {
  canSpin: boolean;
  onSpinStart: () => void;
  remainingSpins: number;
}

const SpinWheel = ({ canSpin, onSpinStart, remainingSpins }: SpinWheelProps) => {
  const router = useRouter();
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<Prize | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<(HTMLImageElement | null)[]>([]);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const segmentAngle = 360 / PRIZES.length;

  // Preload images
  useEffect(() => {
    let loaded = 0;
    const total = PRIZES.filter((p) => p.image).length;
    const imgs: (HTMLImageElement | null)[] = PRIZES.map((p) => {
      if (!p.image) return null;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = p.image;
      img.onload = () => {
        loaded++;
        if (loaded >= total) setImagesLoaded(true);
      };
      img.onerror = () => {
        loaded++;
        if (loaded >= total) setImagesLoaded(true);
      };
      return img;
    });
    imagesRef.current = imgs;
  }, []);

  // Draw wheel on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = WHEEL_SIZE * dpr;
    canvas.height = WHEEL_SIZE * dpr;
    ctx.scale(dpr, dpr);

    PRIZES.forEach((prize, i) => {
      const startAngle = i * SEG_ANGLE - Math.PI / 2;
      const endAngle = startAngle + SEG_ANGLE;

      // Draw colored segment
      ctx.beginPath();
      ctx.moveTo(CENTER, CENTER);
      ctx.arc(CENTER, CENTER, RADIUS, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = prize.color;
      ctx.fill();

      // Draw image if available
      const img = imagesRef.current[i];
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        // Clip to segment
        ctx.beginPath();
        ctx.moveTo(CENTER, CENTER);
        ctx.arc(CENTER, CENTER, RADIUS, startAngle, endAngle);
        ctx.closePath();
        ctx.clip();

        // Draw semi-transparent overlay of segment color first
        ctx.fillStyle = prize.color;
        ctx.globalAlpha = 0.35;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Calculate image position in the middle-outer area of the segment
        const midAngle = startAngle + SEG_ANGLE / 2;
        const imgDist = RADIUS * 0.52;
        const imgCenterX = CENTER + Math.cos(midAngle) * imgDist;
        const imgCenterY = CENTER + Math.sin(midAngle) * imgDist;
        const imgSize = RADIUS * 0.42;

        // Draw circular image area with slight dark backdrop
        ctx.beginPath();
        ctx.arc(imgCenterX, imgCenterY, imgSize / 2 + 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fill();

        // Clip to circle for the image
        ctx.beginPath();
        ctx.arc(imgCenterX, imgCenterY, imgSize / 2, 0, Math.PI * 2);
        ctx.clip();

        ctx.drawImage(
          img,
          imgCenterX - imgSize / 2,
          imgCenterY - imgSize / 2,
          imgSize,
          imgSize
        );

        ctx.restore();
      }

      // Draw segment border
      ctx.beginPath();
      ctx.moveTo(CENTER, CENTER);
      ctx.arc(CENTER, CENTER, RADIUS, startAngle, endAngle);
      ctx.closePath();
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Glossy highlight
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(CENTER, CENTER);
      ctx.arc(CENTER, CENTER, RADIUS, startAngle, endAngle);
      ctx.closePath();
      ctx.clip();
      const grad = ctx.createRadialGradient(CENTER, CENTER * 0.5, 0, CENTER, CENTER, RADIUS);
      grad.addColorStop(0, "rgba(255,255,255,0.2)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();

      // Draw text along the outer edge
      ctx.save();
      const textAngle = startAngle + SEG_ANGLE / 2;
      const textR = RADIUS * 0.87;
      ctx.translate(CENTER, CENTER);
      ctx.rotate(textAngle);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Text shadow/outline
      ctx.font = "bold 10px Poppins, sans-serif";
      ctx.strokeStyle = "rgba(0,0,0,0.8)";
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      ctx.strokeText(prize.name.length > 14 ? prize.name.slice(0, 13) + "…" : prize.name, textR, 0);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(prize.name.length > 14 ? prize.name.slice(0, 13) + "…" : prize.name, textR, 0);

      // Emoji near center
      ctx.font = "18px serif";
      ctx.fillText(prize.emoji, RADIUS * 0.22, 0);

      ctx.restore();
    });

    // Center circle decoration
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, 18, 0, Math.PI * 2);
    ctx.fillStyle = "hsl(220, 20%, 10%)";
    ctx.fill();
    ctx.strokeStyle = "hsl(43, 96%, 56%)";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Outer ring
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, RADIUS - 1, 0, Math.PI * 2);
    ctx.strokeStyle = "hsl(43, 96%, 56%)";
    ctx.lineWidth = 3;
    ctx.stroke();
  }, [imagesLoaded]);

  const spinWheel = useCallback(() => {
    if (spinning) return;
    if (!canSpin) {
      return;
    }

    onSpinStart();
    setSpinning(true);
    setResult(null);

    const extraSpins = 5 + Math.random() * 5;
    const randomAngle = Math.random() * 360;
    const totalRotation = rotation + extraSpins * 360 + randomAngle;
    setRotation(totalRotation);

    const normalizedAngle = (360 - (totalRotation % 360)) % 360;
    const winIndex = Math.floor(normalizedAngle / segmentAngle);
    const prize = PRIZES[winIndex];

    setTimeout(() => {
      setSpinning(false);
      setResult(prize);
      setShowModal(true);

      if (prize.isWin) {
        setCountdown(30);
      }
    }, 5500);
  }, [spinning, rotation, segmentAngle, canSpin, onSpinStart]);

  // Countdown effect for 30s prize window
  useEffect(() => {
    if (countdown === null) return;

    if (countdown <= 0) {
      setShowModal(false);
      setResult(null);
      setCountdown(null);
      return;
    }

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [countdown]);

  // Cleanup countdown on modal close
  const handleModalClose = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    setShowModal(false);
    setCountdown(null);
  };

  return (
    <>
      <div className="relative flex flex-col items-center">
        {/* Pointer */}
        <div className="relative z-10 -mb-3">
          <div
            className="w-0 h-0"
            style={{
              borderLeft: "16px solid transparent",
              borderRight: "16px solid transparent",
              borderTop: "28px solid #fbbf24",
              filter: "drop-shadow(0 2px 8px rgba(251,191,36,0.6))",
            }}
          />
        </div>

        {/* Wheel outer gold ring */}
        <div
          className="relative rounded-full p-2"
          style={{ 
            background: "linear-gradient(135deg, #fbbf24, #d97706)",
            boxShadow: "0 0 20px rgba(251,191,36,0.4)"
          }}
        >
          <div className="rounded-full p-1 bg-gradient-to-br from-green-800 via-green-900 to-black">
            <div
              className="relative rounded-full overflow-hidden"
              style={{
                width: "min(85vw, 420px)",
                height: "min(85vw, 420px)",
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? "transform 5.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
              }}
            >
              <canvas
                ref={canvasRef}
                className="w-full h-full"
                style={{ width: "100%", height: "100%" }}
              />
            </div>
          </div>
        </div>

        {/* Spin button */}
        <button
          onClick={spinWheel}
          disabled={spinning || !canSpin}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 rounded-full w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center font-display font-bold text-sm sm:text-base transition-transform hover:scale-110 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: spinning || !canSpin ? "#888888" : "linear-gradient(135deg, #fbbf24, #d97706)",
            color: "hsl(220, 20%, 10%)",
            boxShadow: "0 4px 20px rgba(251,191,36,0.5), inset 0 2px 4px rgba(255,255,255,0.3)",
          }}
          aria-label="Spin the wheel"
          title={!canSpin ? "Daily limit reached. Try again tomorrow!" : ""}
        >
          {spinning ? "⏳" : !canSpin ? "LIMIT" : "SPIN!"}
        </button>
      </div>

      {/* Result Modal */}
      {showModal && result && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative max-w-md w-full rounded-2xl p-8 text-center animate-bounce-in"
            style={{
              background: result.isWin
                ? "linear-gradient(145deg, #fbbf24, #d97706)"
                : "linear-gradient(145deg, #064e3b, #022c22)",
              border: result.isWin ? "3px solid #f59e0b" : "2px solid #047857",
              boxShadow: result.isWin
                ? "0 0 80px rgba(251,191,36,0.6), 0 0 40px rgba(245,158,11,0.4)"
                : "0 8px 32px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {result.isWin ? (
              <>
                {result.image ? (
                  <div className="w-32 h-32 mx-auto mb-4 rounded-2xl overflow-hidden bg-white/10 flex items-center justify-center animate-float border-4" style={{ borderColor: "#f59e0b" }}>
                    <img
                      src={result.image}
                      alt={result.name}
                      className="w-full h-full object-contain p-2"
                    />
                  </div>
                ) : (
                  <div className="text-6xl mb-4 animate-float">{result.emoji}</div>
                )}
                <h3 className="font-display text-3xl font-black mb-2" style={{ color: "#1a1a1a", textShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                  🎉 CONGRATULATIONS! 🎉
                </h3>
                <p className="text-black text-lg font-bold mb-1">You won:</p>
                <p className="text-3xl font-black mb-2" style={{ color: "#dc2626" }}>{result.name}</p>
                {result.value && (
                  <p className="text-black font-semibold mb-4">Worth {result.value}</p>
                )}
                <p className="text-gray-800 text-sm mb-6">{result.description}</p>
                <div className="flex flex-col items-center gap-4 justify-center">
                  {countdown !== null && (
                    <div className="text-base font-bold text-black">
                      ⏱️ Claim within <span style={{ color: countdown <= 10 ? "#dc2626" : "#1a1a1a", fontSize: "1.25rem" }}>{countdown}s</span>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        handleModalClose();
                        setShowUpgradeModal(true);
                      }}
                      className="px-6 py-3 rounded-lg font-semibold text-sm transition-all hover:scale-105 text-white"
                      style={{
                        background: "linear-gradient(135deg, #dc2626, #b91c1c)",
                        boxShadow: "0 4px 12px rgba(220, 38, 38, 0.3)",
                      }}
                    >
                      Claim Prize
                    </button>
                    <button
                      onClick={() => {
                        handleModalClose();
                      }}
                      className="px-6 py-3 rounded-lg font-semibold text-sm transition-all hover:scale-105"
                      style={{
                        background: "#1a1a1a",
                        color: "#fbbf24",
                        border: "2px solid #fbbf24",
                      }}
                    >
                      Spin Again
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">{result.emoji}</div>
                <h3 className="font-display text-2xl font-bold text-white mb-3">
                  {result.name}
                </h3>
                <p className="text-white/80 mb-6">
                  Don't give up! Every spin is a new chance to win amazing prizes.
                </p>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-8 py-3 rounded-lg font-semibold text-sm transition-all hover:scale-105"
                  style={{
                    background: "linear-gradient(135deg, #dc2626, #b91c1c)",
                    color: "white",
                  }}
                >
                  Try Again!
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Upgrade Account Modal */}
      {showUpgradeModal && result && (
        <div
          className="fixed inset-0 z-[101] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(10px)" }}
          onClick={() => setShowUpgradeModal(false)}
        >
          <div
            className="relative max-w-md w-full rounded-3xl p-8 text-center animate-bounce-in"
            style={{
              background: "linear-gradient(145deg, #fbbf24, #d97706)",
              border: "3px solid #f59e0b",
              boxShadow: "0 0 80px rgba(251,191,36,0.6), 0 0 40px rgba(245,158,11,0.4), 0 20px 40px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-5xl mb-6 animate-float">✨</div>
            
            <h2 className="font-display text-2xl font-bold mb-2" style={{ color: "#1a1a1a", textShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
              Unlock Your Prize
            </h2>
            
            <p className="text-sm mb-6" style={{ color: "#333333" }}>
              To claim your <span className="font-semibold" style={{ color: "#dc2626" }}>{result.name}</span> worth <span className="font-bold" style={{ color: "#dc2626" }}>{result.value}</span>, you need to upgrade your account to premium status.
            </p>

            <div className="rounded-xl p-4 mb-6" style={{ background: "rgba(0,0,0,0.1)", border: "2px solid rgba(0,0,0,0.2)" }}>
              <div className="flex items-start gap-3 text-left">
                <span className="text-lg mt-0.5">🔒</span>
                <div>
                  <p className="font-semibold text-sm mb-1" style={{ color: "#1a1a1a" }}>Why upgrade?</p>
                  <p className="text-xs" style={{ color: "#333333" }}>Premium accounts enjoy verified identity benefits, priority support, and exclusive prize access.</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3 text-left">
                <span className="text-lg" style={{ color: "#1a1a1a" }}>✓</span>
                <span className="text-sm" style={{ color: "#333333" }}>Instant prize verification</span>
              </div>
              <div className="flex items-center gap-3 text-left">
                <span className="text-lg" style={{ color: "#1a1a1a" }}>✓</span>
                <span className="text-sm" style={{ color: "#333333" }}>Fast delivery within 3-5 days</span>
              </div>
              <div className="flex items-center gap-3 text-left">
                <span className="text-lg" style={{ color: "#1a1a1a" }}>✓</span>
                <span className="text-sm" style={{ color: "#333333" }}>24/7 customer support</span>
              </div>
              <div className="flex items-center gap-3 text-left">
                <span className="text-lg" style={{ color: "#1a1a1a" }}>✓</span>
                <span className="text-sm" style={{ color: "#333333" }}>Lifetime premium benefits</span>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="px-6 py-3 rounded-lg font-semibold text-sm transition-all hover:scale-105"
                style={{
                  background: "#1a1a1a",
                  color: "#fbbf24",
                  border: "2px solid #fbbf24",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowUpgradeModal(false);
                  router.push("/toggle");
                }}
                className="px-6 py-3 rounded-lg font-semibold text-sm transition-all hover:scale-105 text-white"
                style={{
                  background: "linear-gradient(135deg, #dc2626, #b91c1c)",
                  boxShadow: "0 4px 12px rgba(220, 38, 38, 0.3)",
                }}
              >
                Upgrade Account
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/* ── Section Wrapper ── */

const Section = ({
  id,
  children,
  className = "",
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <section id={id} className={`py-16 sm:py-24 px-4 sm:px-6 lg:px-8 ${className}`}>
    <div className="max-w-7xl mx-auto">{children}</div>
  </section>
);

const SectionTitle = ({ children, sub }: { children: React.ReactNode; sub?: string }) => (
  <div className="text-center mb-12 sm:mb-16">
    <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-amber-300 to-emerald-300 bg-clip-text text-transparent mb-4">
      {children}
    </h2>
    {sub && <p className="text-white/80 text-lg max-w-2xl mx-auto">{sub}</p>}
  </div>
);

/* ──────────────────────────── MAIN PAGE ──────────────────────────── */

const Index = () => {
  const [activeSection, setActiveSection] = useState("hero");
  const [spinTimestamps, setSpinTimestamps] = useState<number[]>([]);
  const [remainingSpins, setRemainingSpins] = useState(3);
  const [canSpin, setCanSpin] = useState(true);

  // Load and calculate remaining spins on mount
  useEffect(() => {
    const loadSpinData = () => {
      const stored = localStorage.getItem("spinTimestamps");
      const timestamps: number[] = stored ? JSON.parse(stored) : [];
      
      // Filter timestamps from last 24 hours
      const now = Date.now();
      const dayInMs = 24 * 60 * 60 * 1000;
      const recentTimestamps = timestamps.filter((ts) => now - ts < dayInMs);
      
      setSpinTimestamps(recentTimestamps);
      const remaining = Math.max(0, 3 - recentTimestamps.length);
      setRemainingSpins(remaining);
      setCanSpin(remaining > 0);
      
      // Update stored timestamps
      localStorage.setItem("spinTimestamps", JSON.stringify(recentTimestamps));
    };

    loadSpinData();
  }, []);

  const handleSpinStart = () => {
    const now = Date.now();
    const updated = [...spinTimestamps, now];
    setSpinTimestamps(updated);
    
    const remaining = Math.max(0, 3 - updated.length);
    setRemainingSpins(remaining);
    setCanSpin(remaining > 0);
    
    localStorage.setItem("spinTimestamps", JSON.stringify(updated));
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.3 }
    );

    const sections = document.querySelectorAll("section[id]");
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-700 via-green-900 to-black text-white overflow-x-hidden">
      <style jsx global>{`
        @keyframes bounce-in {
          0% {
            opacity: 0;
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse-glow {
          0%,
          100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
            box-shadow: 0 0 10px currentColor;
          }
        }
        .animate-bounce-in {
          animation: bounce-in 0.4s ease;
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-slide-up {
          animation: slide-up 0.6s ease;
        }
        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }

        /* Custom card styles */
        .card-premium {
          background: rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        .bg-hero {
          background: linear-gradient(145deg, #065f46, #022c22, #000000);
        }
      `}</style>

      <Navbar activeSection={activeSection} />

      {/* ── HERO ── */}
      <section
        id="hero"
        className="relative min-h-screen flex flex-col items-center justify-center pt-20 pb-10 px-4 overflow-hidden"
      >
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-emerald-300/10 blur-[100px]" />
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-amber-300/10 blur-[120px]" />

        <div className="relative z-10 text-center mb-8 sm:mb-10 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-300/30 bg-amber-300/10 text-amber-300 text-sm font-medium mb-6">
            <span className="animate-pulse-glow inline-block w-2 h-2 rounded-full bg-amber-300" />
            Live Promotion — Spin Now!
          </div>
          <div className="flex justify-center gap-4 mb-4 sm:mb-6">
            <div className="px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-bold">
              🎡 {remainingSpins}/3 Spins Remaining
            </div>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-black tracking-tight mb-4">
            <span className="text-white">SPIN TO</span>{" "}
            <span className="bg-gradient-to-r from-amber-300 to-emerald-300 bg-clip-text text-transparent">
              WIN
            </span>
          </h1>
          <p className="text-white/80 text-base sm:text-lg max-w-lg mx-auto">
            Win iPhones, MacBooks, Smart TVs and more — 100% free, no sign-up
            required!
          </p>
        </div>

        <SpinWheel
          canSpin={canSpin}
          onSpinStart={handleSpinStart}
          remainingSpins={remainingSpins}
        />

        <div className="mt-8 sm:mt-10 flex flex-wrap justify-center gap-6 text-center text-sm text-white/80">
          <div>
            <span className="block text-2xl font-bold text-white">12</span>
            Amazing Prizes
          </div>
          <div>
            <span className="block text-2xl font-bold text-amber-300">
              500+
            </span>
            Winners So Far
          </div>
          <div>
            <span className="block text-2xl font-bold text-white">₦5M+</span>
            Given Away
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce text-white/80">
          <svg
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </div>
      </section>

      {/* ── PRIZES GALLERY ── */}
      <Section id="prizes">
        <SectionTitle sub="Every segment is a chance to take home something incredible. Here's what's up for grabs.">
          Prize Gallery
        </SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {PRIZES.filter((p) => p.isWin).map((prize, i) => (
            <div
              key={i}
              className="card-premium rounded-xl p-5 flex flex-col items-center text-center transition-all hover:-translate-y-1 hover:border-amber-300/40 group"
            >
              {prize.image ? (
                <div className="w-28 h-28 rounded-xl overflow-hidden mb-4 bg-white/5 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <img
                    src={prize.image}
                    alt={prize.name}
                    className="w-full h-full object-contain p-2"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl mb-4"
                  style={{ background: `${prize.color}22` }}
                >
                  {prize.emoji}
                </div>
              )}
              <h3 className="font-display text-sm font-bold text-white mb-1">
                {prize.name}
              </h3>
              <p className="text-amber-300 font-semibold text-sm mb-2">
                {prize.value}
              </p>
              <p className="text-white/80 text-xs leading-relaxed">
                {prize.description}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── HOW IT WORKS ── */}
      <Section id="how" className="bg-white/5">
        <SectionTitle sub="It's as easy as 1-2-3. No catches, no hidden fees.">
          How It Works
        </SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            {
              step: "01",
              icon: "🖱️",
              title: "Hit Spin",
              desc: "Click the golden SPIN button on the wheel. It's completely free — no sign-up required.",
            },
            {
              step: "02",
              icon: "🎯",
              title: "Land on a Prize",
              desc: "Watch the wheel spin and land on one of 12 exciting segments. Each spin is random and fair.",
            },
            {
              step: "03",
              icon: "🎁",
              title: "Claim Your Prize",
              desc: "If you win, a congratulations screen pops up. Follow the steps to claim your amazing prize!",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="card-premium rounded-xl p-8 text-center relative overflow-hidden group hover:border-amber-300/40 transition-all"
            >
              <div className="absolute top-3 right-4 font-display text-5xl font-black text-white/5 group-hover:text-amber-300/10 transition-colors">
                {item.step}
              </div>
              <div className="text-4xl mb-4">{item.icon}</div>
              <h3 className="font-display text-lg font-bold text-white mb-2">
                {item.title}
              </h3>
              <p className="text-white/80 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 max-w-2xl mx-auto card-premium rounded-xl p-6">
          <h4 className="font-display text-sm font-bold text-amber-300 mb-3">
            📜 Rules & Terms
          </h4>
          <ul className="text-white/80 text-xs space-y-2 list-disc list-inside">
            <li>
              This is a promotional demo — prizes shown are for demonstration
              purposes.
            </li>
            <li>
              Each spin result is randomly generated and independent of previous
              spins.
            </li>
            <li>
              Prize fulfilment is subject to verification and availability.
            </li>
            <li>Participants must be 18 years or older.</li>
            <li>
              Flash Gains Hub reserves the right to modify or end the promotion
              at any time.
            </li>
          </ul>
        </div>
      </Section>

      {/* ── WINNERS ── */}
      <Section id="winners">
        <SectionTitle sub="Real people winning real prizes. You could be next!">
          Recent Winners
        </SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
          {WINNERS.map((w, i) => (
            <div
              key={i}
              className="card-premium rounded-xl p-5 flex items-center gap-4 hover:border-amber-300/40 transition-all"
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold bg-emerald-300/20 text-emerald-300 shrink-0">
                {w.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-white text-sm truncate">
                  {w.name}
                </p>
                <p className="text-amber-300 text-xs font-medium truncate">
                  Won: {w.prize}
                </p>
                <p className="text-white/80 text-xs">
                  {w.date} · {w.location}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── ABOUT ── */}
      <Section id="about" className="bg-white/5">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold bg-gradient-to-r from-amber-300 to-emerald-300 bg-clip-text text-transparent mb-6">
              About Flash Gain
            </h2>
            <p className="text-white/80 mb-4 leading-relaxed">
              Flash Gain is a premier promotional platform dedicated to giving
              back to our community. We partner with leading tech brands to
              bring you the most exciting giveaway campaigns.
            </p>
            <p className="text-white/80 mb-6 leading-relaxed">
              Since launching, we've given away over ₦5 million in prizes to
              500+ lucky winners across Nigeria. Our mission is simple: reward
              loyalty, spread joy, and put premium tech in everyone's hands.
            </p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { val: "500+", label: "Winners" },
                { val: "₦5M+", label: "Prize Value" },
                { val: "4.9★", label: "Rating" },
              ].map((s, i) => (
                <div
                  key={i}
                  className="card-premium rounded-lg p-3 text-center"
                >
                  <div className="font-display text-xl font-bold text-amber-300">
                    {s.val}
                  </div>
                  <div className="text-white/80 text-xs">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="card-premium rounded-2xl p-8 flex flex-col items-center justify-center text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="font-display text-xl font-bold text-white mb-3">
              Our Promise
            </h3>
            <p className="text-white/80 text-sm leading-relaxed">
              Every spin is fair, every prize is real, and every winner is
              celebrated. We believe everyone deserves a shot at something
              extraordinary.
            </p>
          </div>
        </div>
      </Section>

      {/* ── FAQ ── */}
      <Section id="faq">
        <SectionTitle sub="Got questions? We've got answers.">FAQ</SectionTitle>
        <div className="max-w-3xl mx-auto space-y-4">
          {FAQS.map((faq, i) => (
            <FaqItem key={i} q={faq.q} a={faq.a} />
          ))}
        </div>
      </Section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/10 bg-gradient-to-r from-green-900 via-green-900 to-black py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎰</span>
            <span className="font-display font-bold bg-gradient-to-r from-amber-300 to-emerald-300 bg-clip-text text-transparent">
              Flash Gain
            </span>
          </div>
          <div className="flex gap-4">
            {["Twitter", "Instagram", "Facebook", "TikTok"].map((s) => (
              <a
                key={s}
                href="#"
                className="text-white/80 hover:text-amber-300 transition-colors text-sm"
              >
                {s}
              </a>
            ))}
          </div>
          <p className="text-white/60 text-xs">
            © 2026 FlashGain. All rights reserved. |{" "}
            <a href="#" className="hover:text-amber-300 transition-colors">
              Privacy Policy
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

/* ── FAQ Accordion Item ── */

const FaqItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="card-premium rounded-xl overflow-hidden transition-all hover:border-amber-300/40">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left"
        aria-expanded={open}
      >
        <span className="font-semibold text-white text-sm pr-4">{q}</span>
        <svg
          className={`w-5 h-5 text-amber-300 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-5">
          <p className="text-white/80 text-sm leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
};

export default Index;
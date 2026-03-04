"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  Shield,
  Award,
  Users,
  ChevronRight,
  Phone,
  Mail,
  MessageCircle,
  Menu,
  X,
  Globe,
  ArrowUpRight,
  CheckCircle,
  Clock,
  BarChart3,
  DollarSign,
  LineChart,
  PieChart,
  Target,
  Lock,
  Gem,
  Bitcoin,
  Wallet,
  Calendar,
  Percent,
  TrendingDown,
  Briefcase,
  BarChart2,
  FileText,
  UserCheck,
  Building,
  Sparkles,
  Zap,
  Activity,
  Home,
  Gamepad2,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function InvestmentPlatformPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [investmentAmount, setInvestmentAmount] = useState("50000");
  const [selectedDuration, setSelectedDuration] = useState("1");
  const [activeTab, setActiveTab] = useState("overview");
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);
  const router = useRouter();

  // Handle scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Growth simulation data with animation
  const [growthData, setGrowthData] = useState([
    { month: "Month 1", value: 10000 },
    { month: "Month 2", value: 10250 },
    { month: "Month 3", value: 10550 },
    { month: "Month 4", value: 10900 },
    { month: "Month 5", value: 11300 },
    { month: "Month 6", value: 11750 },
    { month: "Month 7", value: 12250 },
    { month: "Month 8", value: 12800 },
    { month: "Month 9", value: 13400 },
    { month: "Month 10", value: 14050 },
    { month: "Month 11", value: 14750 },
    { month: "Month 12", value: 15500 },
  ]);

  // Animate growth data
  useEffect(() => {
    const interval = setInterval(() => {
      setGrowthData((prev) =>
        prev.map((item) => ({
          ...item,
          value: item.value + (Math.random() - 0.5) * 100,
        })),
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const investmentPlans = [
    {
      id: "starter",
      name: "Starter Portfolio",
      risk: "Conservative",
      riskLevel: "Low",
      minDeposit: "₦50,000",
      maxDeposit: "₦50,000",
      duration: "12 hrs",
      projectedReturn: "400%",
      annualizedReturn: "~2800% weekly",
      color: "emerald",
      gradient: "from-emerald-500 to-emerald-600",
      lightGradient: "from-emerald-500/20 to-emerald-600/10",
      badge: "Ideal for beginners",
      allocation: {
        gold: "40%",
        crypto: "20%",
        bonds: "25%",
        cash: "15%",
      },
      features: [
        "Capital preservation focus",
        "Monthly dividend payouts",
        "Quarterly rebalancing",
        "Basic portfolio reports",
      ],
    },
    {
      id: "growth",
      name: "Growth Portfolio",
      risk: "Moderate",
      riskLevel: "Medium",
      minDeposit: "₦100,000",
      maxDeposit: "₦250,000",
      duration: "12 hrs",
      projectedReturn: "400%",
      annualizedReturn: "~2800% weekly",
      color: "blue",
      gradient: "from-blue-500 to-blue-600",
      lightGradient: "from-blue-500/20 to-blue-600/10",
      badge: "Most Popular",
      popular: true,
      allocation: {
        gold: "30%",
        crypto: "35%",
        stocks: "25%",
        realEstate: "10%",
      },
      features: [
        "Balanced growth strategy",
        "Weekly performance updates",
        "Tax-efficient harvesting",
        "Priority support access",
        "Quarterly strategy calls",
      ],
    },
    {
      id: "premium",
      name: "Premium Portfolio",
      risk: "Aggressive",
      riskLevel: "High",
      minDeposit: "₦150,000",
      maxDeposit: "₦1,000,000+",
      duration: "12 hrs",
      projectedReturn: "400%",
      annualizedReturn: "~2800% weekly",
      color: "amber",
      gradient: "from-amber-500 to-amber-600",
      lightGradient: "from-amber-500/20 to-amber-600/10",
      badge: "For High Net Worth",
      allocation: {
        gold: "25%",
        crypto: "40%",
        privateEquity: "20%",
        ventureCapital: "15%",
      },
      features: [
        "High-growth opportunities",
        "Dedicated account manager",
        "Custom portfolio optimization",
        "Monthly strategy sessions",
        "Early access to new funds",
        "Exclusive investment opportunities",
      ],
    },
  ];

  // helpers used by both the card list and the calculator
  const parseCurrency = (str: string) =>
    parseFloat(str.replace(/[^0-9.-]+/g, "")) || 0;
  const formatCurrency = (n: number) => `₦${n.toLocaleString()}`;

  const calculateProjectedValue = () => {
    const amount = parseFloat(investmentAmount) || 50000;
    // 4x return in 12 hours (profit = 3x) and two periods per day
    const twelveHourGrowthRate = 3; // growth factor (profit multiplier)
    const weeklyGrowthRate = twelveHourGrowthRate * 14; // 14 half‑days
    const growth = amount * twelveHourGrowthRate;
    return {
      invested: amount,
      growth: Math.round(growth),
      total: Math.round(amount * (1 + twelveHourGrowthRate)),
      weeklyTotal: Math.round(amount * (1 + weeklyGrowthRate)),
      weeklyGrowth: Math.round(amount * weeklyGrowthRate),
    };
  };

  const projected = calculateProjectedValue();

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

      {/* Navigation */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-500 ${
          scrolled ? "hh-header py-2" : "bg-transparent py-4"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 group">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-all duration-300 group-hover:rotate-3">
                <Building className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold text-white block leading-tight">
                  FlashGain 9ja Investment.
                </span>
                <span className="text-xs text-emerald-300/70">
                  Est. 2018 • Regulated
                </span>
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              {["About", "Plans", "Portfolio", "Why Us"].map((item) => (
                <Link
                  key={item}
                  href={`#${item.toLowerCase().replace(" ", "-")}`}
                  className="text-white/70 hover:text-emerald-400 transition-all duration-300 text-sm font-medium relative group"
                >
                  {item}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-emerald-400 group-hover:w-full transition-all duration-300"></span>
                </Link>
              ))}
              <button className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 text-sm">
                Client Portal
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden text-white/70 hover:text-emerald-400 transition-transform duration-300 hover:scale-110"
            >
              {isMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden bg-gradient-to-b from-[#0d1f2d] to-[#0a1628] border-t border-emerald-500/20 overflow-hidden transition-all duration-500 ${
            isMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="px-4 py-4 space-y-3">
            {["About", "Plans", "Portfolio", "Why Us"].map((item, index) => (
              <Link
                key={item}
                href={`#${item.toLowerCase().replace(" ", "-")}`}
                className="block text-white/70 hover:text-emerald-400 py-2 text-sm transition-all duration-300 hover:translate-x-2"
                style={{ transitionDelay: `${index * 50}ms` }}
                onClick={() => setIsMenuOpen(false)}
              >
                {item}
              </Link>
            ))}
            <button className="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105">
              Client Portal
            </button>
          </div>
        </div>
      </nav>

      {/* About Section: trimmed */}
      <section
        id="about"
        className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-6 hh-entry-3">
              <div className="inline-block">
                <h2 className="text-3xl font-bold text-white relative">
                  Diversified Investment Approach
                  <span className="absolute -bottom-2 left-0 w-20 h-1 bg-emerald-500 rounded-full animate-width-slow"></span>
                </h2>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Investment Plans */}
      <section
        id="plans"
        className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/5 via-transparent to-transparent"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-12 hh-entry-5">
            <h2 className="text-3xl font-bold text-white mb-4 relative inline-block">
              Investment Plans
              <span className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-emerald-500 rounded-full animate-width-slow"></span>
            </h2>
            <p className="text-xl text-white/70">
              Choose the strategy that aligns with your financial goals
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {investmentPlans.map((plan, i) => (
              <div
                key={i}
                className={`hh-card transition-all duration-500 hover:shadow-2xl ${
                  plan.popular
                    ? "border-emerald-500/50 shadow-xl scale-105 hover:scale-110 z-10"
                    : "hover:border-emerald-500/30 hover:scale-105"
                }`}
                onMouseEnter={() => setHoveredPlan(plan.id)}
                onMouseLeave={() => setHoveredPlan(null)}
                style={{ animationDelay: `${i * 150}ms` }}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-emerald-500 text-white text-sm rounded-full font-medium animate-pulse shadow-lg">
                    Most Popular
                  </div>
                )}

                <div className="p-8">
                  <div
                    className={`mb-6 bg-gradient-to-br ${plan.lightGradient} rounded-xl p-4 transform transition-all duration-300 hover:scale-105`}
                  >
                    <h3 className="text-xl font-bold text-white mb-1">
                      {plan.name}
                    </h3>
                    <p className="text-sm text-white/50">{plan.risk}</p>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between text-sm group hover:translate-x-1 transition-transform">
                      <span className="text-white/50">Risk Level</span>
                      <span
                        className={`font-medium ${
                          plan.riskLevel === "Low"
                            ? "text-emerald-400"
                            : plan.riskLevel === "Medium"
                              ? "text-amber-400"
                              : "text-red-400"
                        }`}
                      >
                        {plan.riskLevel}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm group hover:translate-x-1 transition-transform">
                      <span className="text-white/50">Minimum Deposit</span>
                      <span className="font-bold text-white">
                        {plan.minDeposit}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm group hover:translate-x-1 transition-transform">
                      <span className="text-white/50">Returns (12 hrs)</span>
                      <span className="font-bold text-emerald-400">
                        {formatCurrency(parseCurrency(plan.minDeposit) * 4)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm group hover:translate-x-1 transition-transform">
                      <span className="text-white/50">Duration</span>
                      <span className="font-bold text-white">
                        {plan.duration}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm group hover:translate-x-1 transition-transform">
                      <span className="text-white/50">Projected Return</span>
                      <span className="font-bold text-emerald-400 animate-pulse-subtle">
                        {plan.projectedReturn}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm group hover:translate-x-1 transition-transform">
                      <span className="text-white/50">Weekly Return</span>
                      <span className="font-bold text-emerald-400">
                        {plan.annualizedReturn}
                      </span>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-sm font-bold text-white mb-3">
                      Portfolio Allocation
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(plan.allocation).map(
                        ([asset, percentage], j) => (
                          <div
                            key={asset}
                            className="flex justify-between text-xs group hover:translate-x-1 transition-transform"
                            style={{ transitionDelay: `${j * 50}ms` }}
                          >
                            <span className="text-white/50 capitalize">
                              {asset}
                            </span>
                            <span className="font-medium text-white">
                              {percentage}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 mb-6">
                    {plan.features.map((feature, j) => (
                      <div
                        key={j}
                        className="flex items-center gap-2 text-sm text-white/60 group hover:translate-x-1 transition-transform"
                        style={{ transitionDelay: `${j * 30}ms` }}
                      >
                        <CheckCircle className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                        {feature}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const amountNumeric =
                        (plan.minDeposit || "")
                          .toString()
                          .replace(/[^\d]/g, "") || investmentAmount;
                      router.push(
                        `/investment/payment?amount=${amountNumeric}&plan=${encodeURIComponent(plan.id)}`,
                      );
                    }}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-xl relative overflow-hidden group"
                  >
                    <span className="relative z-10">Select Plan</span>
                    <span className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                  </button>

                  <p className="text-xs text-white/40 text-center mt-4 animate-pulse-subtle">
                    *Past performance does not guarantee future returns
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Share Investment Section */}
      <section
        id="shares"
        className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-blue-500/5"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-12 hh-entry-5">
            <h2 className="text-3xl font-bold text-white mb-4 relative inline-block">
              Stock Market Investments
              <span className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-purple-500 rounded-full animate-width-slow"></span>
            </h2>
            <p className="text-xl text-white/70">
              Own shares in world-leading companies at ₦50,000 per share
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Tesla Share Card */}
            <div className="hh-card hover:border-purple-500/30 transition-all duration-500 hover:scale-105">
              <div className="mb-6 bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-xl p-6 flex items-center justify-center h-40">
                <img
                  src="/assets/logos/tesla logo.png"
                  alt="Tesla"
                  className="h-32 w-32 object-contain drop-shadow-lg"
                />
              </div>

              <h3 className="text-2xl font-bold text-white mb-1">Tesla Inc.</h3>
              <p className="text-sm text-white/50 mb-4">
                TSLA - Electric Vehicles & Energy
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm group hover:translate-x-1 transition-transform">
                  <span className="text-white/50">Share Price</span>
                  <span className="font-bold text-purple-400">₦50,000</span>
                </div>
                <div className="flex justify-between text-sm group hover:translate-x-1 transition-transform">
                  <span className="text-white/50">Dividend Yield</span>
                  <span className="font-bold text-purple-400">
                    ~0.5% annual
                  </span>
                </div>
                <div className="flex justify-between text-sm group hover:translate-x-1 transition-transform">
                  <span className="text-white/50">Market Cap</span>
                  <span className="font-bold text-white">$900B+</span>
                </div>
                <div className="flex justify-between text-sm group hover:translate-x-1 transition-transform">
                  <span className="text-white/50">Risk Level</span>
                  <span className="font-bold text-amber-400">Medium-High</span>
                </div>
              </div>

              <button
                onClick={() =>
                  router.push(`/investment/payment?amount=50000&plan=tesla`)
                }
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                Buy Tesla Share
              </button>
            </div>

            {/* Dangote Refinery Share Card */}
            <div className="hh-card hover:border-red-500/30 transition-all duration-500 hover:scale-105">
              <div className="mb-6 bg-gradient-to-br from-red-500/20 to-red-600/10 rounded-xl p-6 flex items-center justify-center h-40">
                <img
                  src="/assets/logos/dangote logo.png"
                  alt="Dangote"
                  className="h-32 w-32 object-contain drop-shadow-lg"
                />
              </div>

              <h3 className="text-2xl font-bold text-white mb-1">
                Dangote Refinery
              </h3>
              <p className="text-sm text-white/50 mb-4">
                DANGOTE - Oil & Petrochemicals
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm group hover:translate-x-1 transition-transform">
                  <span className="text-white/50">Share Price</span>
                  <span className="font-bold text-red-400">₦50,000</span>
                </div>
                <div className="flex justify-between text-sm group hover:translate-x-1 transition-transform">
                  <span className="text-white/50">Dividend Yield</span>
                  <span className="font-bold text-red-400">~3.2% annual</span>
                </div>
                <div className="flex justify-between text-sm group hover:translate-x-1 transition-transform">
                  <span className="text-white/50">Market Cap</span>
                  <span className="font-bold text-white">$20B+</span>
                </div>
                <div className="flex justify-between text-sm group hover:translate-x-1 transition-transform">
                  <span className="text-white/50">Risk Level</span>
                  <span className="font-bold text-amber-400">Medium</span>
                </div>
              </div>

              <button
                onClick={() =>
                  router.push(`/investment/payment?amount=100000&plan=dangote`)
                }
                className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                Buy Dangote Share
              </button>
            </div>

            {/* Apple Share Card */}
            <div className="hh-card hover:border-gray-400/30 transition-all duration-500 hover:scale-105">
              <div className="mb-6 bg-gradient-to-br from-gray-500/20 to-gray-600/10 rounded-xl p-6 flex items-center justify-center h-40">
                <img
                  src="/assets/logos/apple logo.png"
                  alt="Apple"
                  className="h-32 w-32 object-contain drop-shadow-lg"
                />
              </div>

              <h3 className="text-2xl font-bold text-white mb-1">Apple Inc.</h3>
              <p className="text-sm text-white/50 mb-4">
                AAPL - Technology & Consumer
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm group hover:translate-x-1 transition-transform">
                  <span className="text-white/50">Share Price</span>
                  <span className="font-bold text-gray-300">₦50,000</span>
                </div>
                <div className="flex justify-between text-sm group hover:translate-x-1 transition-transform">
                  <span className="text-white/50">Dividend Yield</span>
                  <span className="font-bold text-gray-300">~0.4% annual</span>
                </div>
                <div className="flex justify-between text-sm group hover:translate-x-1 transition-transform">
                  <span className="text-white/50">Market Cap</span>
                  <span className="font-bold text-white">$3T+</span>
                </div>
                <div className="flex justify-between text-sm group hover:translate-x-1 transition-transform">
                  <span className="text-white/50">Risk Level</span>
                  <span className="font-bold text-emerald-400">Low-Medium</span>
                </div>
              </div>

              <button
                onClick={() =>
                  router.push(`/investment/payment?amount=150000&plan=apple`)
                }
                className="w-full py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                Buy Apple Share
              </button>
            </div>
          </div>

          {/* Share Benefits */}
          <div className="mt-16 grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6 hh-entry-3">
              <h3 className="text-2xl font-bold text-white">
                Why Invest in Shares?
              </h3>
              <div className="space-y-4">
                {[
                  {
                    icon: "📈",
                    title: "Capital Growth",
                    desc: "Potential for long-term appreciation as companies expand",
                  },
                  {
                    icon: "💰",
                    title: "Dividend Income",
                    desc: "Regular passive income from company profits",
                  },
                  {
                    icon: "🌍",
                    title: "Global Exposure",
                    desc: "Invest in world-leading companies from Nigeria",
                  },
                  {
                    icon: "📊",
                    title: "Market Transparency",
                    desc: "Real-time pricing and trading information",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 group hover:translate-x-1 transition-transform"
                  >
                    <span className="text-2xl flex-shrink-0">{item.icon}</span>
                    <div>
                      <h4 className="font-bold text-white group-hover:text-emerald-400 transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-sm text-white/60">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-linear-gradient(135deg, rgba(139,92,246,0.15), rgba(248,113,113,0.1)) border border-white/10 rounded-2xl p-8">
              <h4 className="font-bold text-white mb-4 text-lg">
                Investment Tips
              </h4>
              <ul className="space-y-3 text-sm text-white/80">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>
                    Start small with as few as 1 share and build your portfolio
                    over time
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>
                    Diversify across different industries and market caps for
                    lower risk
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>
                    Consider your investment horizon - stocks are best for
                    long-term goals
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>
                    Reinvest dividends to compound your returns over time
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>
                    Review your portfolio quarterly and rebalance as needed
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Portfolio Dashboard */}
      <section
        id="portfolio"
        className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 via-transparent to-emerald-500/5"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <h2 className="text-3xl font-bold text-white mb-12 text-center hh-entry-6">
            Your Portfolio Dashboard
          </h2>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Calculator with animations */}
            <div className="lg:col-span-1 hh-card hover:border-emerald-500/30 transition-all duration-500 hover:scale-105 animate-float">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-400" />
                Investment Calculator
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-white/50 mb-2 block">
                    Investment Amount (₦)
                  </label>
                  <input
                    type="range"
                    min="5000"
                    max="1000000"
                    step="1000"
                    value={investmentAmount}
                    onChange={(e) => setInvestmentAmount(e.target.value)}
                    className="w-full accent-emerald-500"
                  />
                  <div className="text-right font-bold text-white mt-2 animate-pulse-subtle">
                    ₦{parseInt(investmentAmount).toLocaleString()}
                  </div>
                </div>

                <div>
                  <label className="text-sm text-white/50 mb-2 block">
                    Investment Period
                  </label>
                  <select
                    value={selectedDuration}
                    onChange={(e) => setSelectedDuration(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-300"
                  >
                    <option value="1">One Week</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-white/10 space-y-4">
                  <div>
                    <p className="text-xs text-white/50 uppercase tracking-wider mb-3 font-semibold">
                      Initial Investment
                    </p>
                    <p className="text-2xl font-bold text-white">
                      ₦{parseInt(investmentAmount).toLocaleString("en-NG")}
                    </p>
                  </div>

                  {/* Weekly Returns */}
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white/70">
                        Weekly Return (184.6%)
                      </span>
                      <span className="text-xs text-emerald-300">7 days</span>
                    </div>
                    <p className="text-xl font-bold text-emerald-400">
                      ₦
                      {Math.round(
                        parseInt(investmentAmount) * (1 + 1.846),
                      ).toLocaleString("en-NG")}
                    </p>
                    <p className="text-xs text-white/50 mt-1">
                      +₦
                      {Math.round(
                        parseInt(investmentAmount) * 1.846,
                      ).toLocaleString("en-NG")}{" "}
                      profit
                    </p>
                  </div>

                  {/* 12‑hour Returns */}
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white/70">
                        12‑Hour Return (4×)
                      </span>
                      <span className="text-xs text-blue-300">12 hrs</span>
                    </div>
                    <p className="text-xl font-bold text-blue-400">
                      ₦{projected.total.toLocaleString("en-NG")}
                    </p>
                    <p className="text-xs text-white/50 mt-1">
                      +₦
                      {projected.growth.toLocaleString("en-NG")} profit
                    </p>
                  </div>

                  {/* Yearly Returns */}
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white/70">
                        Weekly Return
                      </span>
                      <span className="text-xs text-amber-300">7 days</span>
                    </div>
                    <p className="text-xl font-bold text-amber-400">
                      ₦
                      {Math.round(projected.weeklyTotal).toLocaleString(
                        "en-NG",
                      )}
                    </p>
                    <p className="text-xs text-white/50 mt-1">
                      +₦
                      {Math.round(projected.weeklyGrowth).toLocaleString(
                        "en-NG",
                      )}{" "}
                      profit
                    </p>
                  </div>

                  <div className="pt-6">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/investment/payment?amount=${parseInt(investmentAmount)}&plan=custom`,
                        )
                      }
                      className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-xl"
                    >
                      Invest ₦
                      {parseInt(investmentAmount).toLocaleString("en-NG")}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Growth Chart with animations */}
            <div className="lg:col-span-2 hh-card hover:border-emerald-500/30 transition-all duration-500 hover:scale-105">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  Growth Projection
                </h3>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-white/50">Projected</span>
                  </div>
                </div>
              </div>

              <div className="h-64 relative">
                <div className="absolute inset-0 flex items-end justify-between">
                  {growthData.map((data, i) => {
                    const height = (data.value / 16000) * 100;
                    return (
                      <div key={i} className="relative w-8 group">
                        <div
                          className="absolute bottom-0 w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-lg transition-all duration-300 group-hover:from-emerald-600 group-hover:scale-110 group-hover:z-10"
                          style={{
                            height: `${height}%`,
                            animationDelay: `${i * 50}ms`,
                          }}
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-[#0d1f2d] text-white text-xs rounded px-2 py-1 whitespace-nowrap transition-all duration-300 border border-emerald-500/30">
                            ${Math.round(data.value).toLocaleString()}
                          </div>
                        </div>
                        {i % 2 === 0 && (
                          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-white/40">
                            {data.month.split(" ")[1]}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between mt-8 pt-4 border-t border-white/10">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 group hover:translate-x-1 transition-transform">
                    <Calendar className="w-4 h-4 text-white/40" />
                    <span className="text-sm text-white/60">
                      Duration: One Week
                    </span>
                  </div>
                  <div className="flex items-center gap-2 group hover:translate-x-1 transition-transform">
                    <Target className="w-4 h-4 text-white/40" />
                    <span className="text-sm text-white/60">
                      Target: 9600% annual
                    </span>
                  </div>
                </div>
                <div className="text-xs text-white/40 animate-pulse-subtle">
                  *Hypothetical growth
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section
        id="why-us"
        className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-bl from-emerald-500/5 via-transparent to-blue-500/5"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-12 hh-entry-1">
            <h2 className="text-3xl font-bold text-white mb-4 relative inline-block">
              Why Choose FlashGain 9ja
              <span className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-emerald-500 rounded-full animate-width-slow"></span>
            </h2>
            <p className="text-xl text-white/70">
              Professional fund management with institutional-grade security
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                icon: PieChart,
                title: "Diversified Portfolio",
                desc: "Multi-asset allocation across gold, crypto, and traditional investments",
                delay: 0,
              },
              {
                icon: Briefcase,
                title: "Professional Management",
                desc: "Experienced fund managers with 20+ years of market expertise",
                delay: 150,
              },
              {
                icon: Shield,
                title: "Risk Management",
                desc: "Advanced risk controls and regular portfolio rebalancing",
                delay: 300,
              },
              {
                icon: FileText,
                title: "Transparent Reporting",
                desc: "Monthly performance reports and quarterly investor updates",
                delay: 450,
              },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={i}
                  className="hh-card hover:border-emerald-500/30 transition-all duration-500 hover:scale-105 hover:shadow-2xl group"
                  style={{ animationDelay: `${item.delay}ms` }}
                >
                  <div className="w-14 h-14 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <Icon className="w-7 h-7 text-emerald-400" />
                  </div>
                  <h3 className="font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-white/50">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Risk Assurance */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-[#0d1f2d] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-blue-500/10"></div>
        <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow animation-delay-2000"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-white relative inline-block">
                Risk-Assured Investment Protection
                <span className="absolute -bottom-2 left-0 w-20 h-1 bg-emerald-500 rounded-full animate-width-slow"></span>
              </h2>
              <p className="text-lg text-white/70 leading-relaxed">
                Your principal investment is protected through our diversified
                risk management strategy and institutional-grade safeguards.
              </p>
              <div className="flex items-center gap-4">
                {[
                  { text: "Capital preservation focus", delay: 0 },
                  { text: "Insured custody", delay: 150 },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 group hover:translate-x-1 transition-all duration-300"
                    style={{ transitionDelay: `${item.delay}ms` }}
                  >
                    <CheckCircle className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span className="text-white/70">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white/5 rounded-2xl p-8 border border-white/10 hover:border-emerald-500/30 transition-all duration-500 hover:scale-105">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: "₦2.4B+", label: "Assets Protected", delay: 0 },
                  { value: "0.2%", label: "Management Fee", delay: 150 },
                  { value: "24/7", label: "Account Access", delay: 300 },
                  { value: "100%", label: "Transparent", delay: 450 },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="text-center group hover:scale-110 transition-transform"
                    style={{ transitionDelay: `${item.delay}ms` }}
                  >
                    <div className="text-3xl font-bold text-emerald-400 group-hover:text-emerald-300 transition-colors">
                      {item.value}
                    </div>
                    <div className="text-sm text-white/50">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact section removed per request */}

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/5 to-transparent"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4 group">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Building className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold text-white">
                  FlashGain 9ja
                </span>
              </div>
              <p className="text-sm text-white/50">
                SEC-registered investment advisor providing diversified
                long-term investment solutions.
              </p>
            </div>

            {/* Company / Legal / Regulatory links removed per request (FINRA omitted) */}
          </div>

          <div className="mt-12 pt-8 border-t border-white/10 text-center text-sm text-white/40">
            <p>
              © {new Date().getFullYear()} FlashGain 9ja Capital Management. All
              rights reserved.
            </p>
            <p className="mt-2 animate-pulse-subtle">
              Investing involves risk, including the possible loss of principal.
              Past performance does not guarantee future results.
            </p>
          </div>
        </div>
      </footer>

      {/* Bottom Navigation - Matching Dashboard */}
      <div className="hh-bottom-nav">
        <Link href="/dashboard" className="hh-nav-item">
          <Home className="h-5 w-5" />
          <span>Home</span>
        </Link>
        <Link href="/about" className="hh-nav-item hh-nav-active">
          <Gamepad2 className="h-5 w-5" />
          <span>About</span>
        </Link>
        <Link href="/refer" className="hh-nav-item">
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

        /* ─── STAGGERED ENTRY ANIMATIONS ─── */
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

        /* ─── ANIMATIONS ─── */
        @keyframes float-particle {
          0% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 0.5;
          }
          90% {
            opacity: 0.5;
          }
          100% {
            transform: translateY(-100vh) translateX(20px);
            opacity: 0;
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
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

        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 0.5;
          }
          50% {
            opacity: 0.8;
          }
        }

        @keyframes pulse-subtle {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        @keyframes width {
          from {
            width: 0;
          }
          to {
            width: 100%;
          }
        }

        @keyframes width-slow {
          from {
            width: 0;
          }
          to {
            width: 5rem;
          }
        }

        @keyframes bounce-subtle {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }

        .animate-float-particle {
          animation: float-particle linear infinite;
        }

        .animate-fade-in-up {
          animation: fade-in-up 1s ease-out forwards;
        }

        .animate-fade-in {
          animation: fade-in 1s ease-out forwards;
          opacity: 0;
        }

        .animate-slide-in {
          animation: slide-in 1s ease-out forwards;
          opacity: 0;
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }

        .animate-pulse-subtle {
          animation: pulse-subtle 3s ease-in-out infinite;
        }

        .animate-width {
          animation: width 1.5s ease-out forwards;
        }

        .animate-width-slow {
          animation: width-slow 2s ease-out forwards;
        }

        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        @media (prefers-reduced-motion: reduce) {
          .hh-bubble,
          [class*="hh-entry-"],
          .animate-float-particle,
          .animate-fade-in-up,
          .animate-fade-in,
          .animate-slide-in,
          .animate-float,
          .animate-pulse-slow,
          .animate-pulse-subtle,
          .animate-width,
          .animate-width-slow,
          .animate-bounce-subtle {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

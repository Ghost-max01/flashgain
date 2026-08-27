"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Shield, CreditCard, LifeBuoy, ArrowLeft, FileText } from "lucide-react";

type Tab = "support" | "payment" | "privacy";

const tabTitles: Record<Tab, string> = {
  support: "Support Policy",
  payment: "Payment Policy",
  privacy: "Privacy Policy",
};

const tabIcons: Record<Tab, any> = {
  support: LifeBuoy,
  payment: CreditCard,
  privacy: Shield,
};

function PoliciesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initial = (searchParams.get("tab") || searchParams.get("policy") || "privacy").toLowerCase() as Tab;
  const validTabs: Tab[] = ["support", "payment", "privacy"];
  const initTab: Tab = validTabs.includes(initial) ? initial as Tab : "privacy";
  const [active, setActive] = useState<Tab>(initTab);

  useEffect(() => {
    const t = (searchParams.get("tab") || searchParams.get("policy") || "").toLowerCase() as Tab;
    if (validTabs.includes(t) && t !== active) setActive(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const switchTab = (tab: Tab) => {
    setActive(tab);
    router.replace(`/policies?tab=${tab}`, { scroll: false });
  };

  return (
    <div className="hh-root min-h-screen relative overflow-hidden">
      <div className="hh-bubbles-container" aria-hidden="true">
        {[...Array(12)].map((_, i) => (
          <div key={i} className={`hh-bubble hh-bubble-${i + 1}`}></div>
        ))}
      </div>
      <div className="hh-mesh-overlay" aria-hidden="true"></div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-8 md:py-12">
        {/* back */}
        <Link href="/register" className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Sign Up
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/10 text-xs text-emerald-300 mb-4">
            <FileText className="h-3.5 w-3.5" /> FlashGain 9ja Legal
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2">{tabTitles[active]}</h1>
          <p className="text-sm text-white/50">Last updated: August 27, 2026 &middot; Effective immediately</p>
          <p className="text-sm text-white/60 mt-3 max-w-xl mx-auto">
            By creating an account or using FlashGain 9ja, you agree to the terms below. Please read them carefully.
          </p>
        </div>

        {/* Tabs / Radio */}
        <div className="hh-card p-2 mb-6 flex gap-2">
          {(["support", "payment", "privacy"] as Tab[]).map((t) => {
            const Icon = tabIcons[t];
            const isActive = active === t;
            return (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-900/30"
                    : "bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08] border border-transparent"
                }`}
                aria-pressed={isActive}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tabTitles[t]}</span>
                <span className="sm:hidden capitalize">{t}</span>
              </button>
            );
          })}
        </div>

        {/* Content Card */}
        <div className="hh-card !p-0 overflow-hidden">
          <div className="p-6 md:p-8 prose prose-invert max-w-none">
            {active === "privacy" && <PrivacyContent />}
            {active === "payment" && <PaymentContent />}
            {active === "support" && <SupportContent />}
          </div>

          <div className="px-6 md:px-8 py-4 bg-white/[0.03] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-white/40">Have questions? Contact support via your dashboard live chat.</p>
            <Link href="/register" className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">
              I understand & continue →
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-white/30 mt-6">
          FlashGain 9ja &middot; Nigeria&apos;s trusted earning platform &middot; All rights reserved.
        </p>
      </div>

      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap");
        .hh-root { font-family: "Syne", sans-serif; background:#050d14; color:white; }
        .hh-bubbles-container{position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden}
        .hh-bubble{position:absolute;border-radius:50%;opacity:0;animation:hh-bubble-rise linear infinite}
        .hh-bubble-1{width:8px;height:8px;left:10%;background:radial-gradient(circle,rgba(16,185,129,0.6),transparent);animation-duration:8s}
        .hh-bubble-2{width:14px;height:14px;left:25%;background:radial-gradient(circle,rgba(59,130,246,0.5),transparent);animation-duration:11s;animation-delay:1.5s}
        .hh-bubble-3{width:6px;height:6px;left:40%;background:radial-gradient(circle,rgba(16,185,129,0.7),transparent);animation-duration:9s;animation-delay:3s}
        .hh-bubble-4{width:18px;height:18px;left:55%;background:radial-gradient(circle,rgba(139,92,246,0.4),transparent);animation-duration:13s;animation-delay:.5s}
        .hh-bubble-5{width:10px;height:10px;left:70%;background:radial-gradient(circle,rgba(16,185,129,0.5),transparent);animation-duration:10s;animation-delay:2s}
        .hh-bubble-6{width:5px;height:5px;left:82%;background:radial-gradient(circle,rgba(52,211,153,0.8),transparent);animation-duration:7s;animation-delay:4s}
        .hh-bubble-7{width:12px;height:12px;left:15%;background:radial-gradient(circle,rgba(59,130,246,0.4),transparent);animation-duration:12s;animation-delay:5s}
        .hh-bubble-8{width:7px;height:7px;left:35%;background:radial-gradient(circle,rgba(16,185,129,0.6),transparent);animation-duration:9.5s;animation-delay:2.5s}
        .hh-bubble-9{width:20px;height:20px;left:60%;background:radial-gradient(circle,rgba(16,185,129,0.2),transparent);animation-duration:15s;animation-delay:1s}
        .hh-bubble-10{width:9px;height:9px;left:88%;background:radial-gradient(circle,rgba(139,92,246,0.5),transparent);animation-duration:10.5s;animation-delay:6s}
        .hh-bubble-11{width:4px;height:4px;left:5%;background:radial-gradient(circle,rgba(52,211,153,0.9),transparent);animation-duration:6.5s;animation-delay:3.5s}
        .hh-bubble-12{width:16px;height:16px;left:48%;background:radial-gradient(circle,rgba(59,130,246,0.3),transparent);animation-duration:14s;animation-delay:7s}
        @keyframes hh-bubble-rise{0%{transform:translateY(100vh) scale(0.5);opacity:0}10%{opacity:1}90%{opacity:0.6}100%{transform:translateY(-10vh) scale(1.2);opacity:0}}
        .hh-mesh-overlay{position:fixed;inset:0;background:radial-gradient(ellipse 60% 40% at 20% 80%,rgba(16,185,129,0.07) 0%,transparent 60%),radial-gradient(ellipse 50% 50% at 80% 20%,rgba(59,130,246,0.06) 0%,transparent 60%),radial-gradient(ellipse 40% 30% at 50% 50%,rgba(139,92,246,0.04) 0%,transparent 60%);pointer-events:none;z-index:0}
        .hh-card{background:linear-gradient(135deg,rgba(255,255,255,0.06) 0%,rgba(255,255,255,0.02) 100%);border:1px solid rgba(255,255,255,0.08);border-radius:24px;padding:24px;backdrop-filter:blur(12px);position:relative;overflow:hidden}
        .hh-card::before{content:"";position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)}
        .prose-invert h3{color:white;font-weight:800;margin-top:1.5rem;margin-bottom:0.6rem;font-size:1.05rem}
        .prose-invert p{color:rgba(255,255,255,0.75);font-size:0.92rem;line-height:1.7}
        .prose-invert ul{list-style:disc;padding-left:1.2rem;color:rgba(255,255,255,0.75)}
        .prose-invert li{margin:0.35rem 0;font-size:0.92rem;line-height:1.6}
        .prose-invert strong{color:white}
        .prose-invert a{color:#6ee7b7}
      `}</style>
    </div>
  );
}

function PrivacyContent() {
  return (
    <div>
      <h3>1. Introduction</h3>
      <p>
        At FlashGain 9ja (&ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;our&rdquo;), your privacy matters. This Privacy Policy explains what data we collect,
        how we use it, how we keep it safe, and your rights. By using FlashGain 9ja you agree to this policy.
      </p>

      <h3>2. Information We Collect</h3>
      <p>We only collect what we need to run your account and improve your experience:</p>
      <ul>
        <li><strong>Account details</strong> — your name, email address, and phone number when you register, submit a request, or purchase a service.</li>
        <li><strong>Usage & support data</strong> — responses to surveys, support messages, and actions you take on the site.</li>
        <li><strong>Technical data</strong> — device, browser, and approximate location to keep the service secure and fast.</li>
      </ul>
      <p>You can browse much of the site anonymously without providing personal details.</p>

      <h3>3. How We Use Your Information</h3>
      <ul>
        <li>To create and manage your account and referrals</li>
        <li>To process transactions and deliver services you request</li>
        <li>To provide support, send important updates, and prevent fraud or abuse</li>
        <li>To improve the platform, fix issues, and personalize your experience</li>
      </ul>

      <h3>4. How We Protect Your Information</h3>
      <p>
        All sensitive and payment data is transmitted securely via <strong>Stripe</strong> using encrypted channels. We do not store your
        full card numbers, CVV, or other sensitive financial credentials on our servers after a transaction is completed.
        Access to personal data is restricted to authorized personnel only, and we use industry-standard encryption and monitoring
        to safeguard our systems.
      </p>

      <h3>5. Sharing & Disclosure</h3>
      <p>
        We do not sell, trade, or transfer your personally identifiable information to outside parties for their marketing purposes.
        We may share information only with:
      </p>
      <ul>
        <li><strong>Trusted service providers</strong> who help us operate the site, process payments, or support you — and only under confidentiality agreements.</li>
        <li><strong>Legal requirements</strong> — when required to comply with law, enforce our policies, or protect our rights, property, or safety, or that of others.</li>
      </ul>

      <h3>6. Children&apos;s Privacy (COPPA)</h3>
      <p>
        FlashGain 9ja is intended for users aged 13 and older. We comply with the Children&apos;s Online Privacy Protection Act (COPPA)
        and do not knowingly collect data from anyone under 13. If we learn that such data was collected, we will delete it promptly.
      </p>

      <h3>7. How Long We Keep Your Data</h3>
      <p>
        When you register, we retain your information for as long as your account remains active. If you delete your account or
        withdraw consent, we will delete or anonymize your data, subject to any legal or regulatory retention obligations (for example, transaction records).
      </p>

      <h3>8. What We Will Never Do</h3>
      <p>
        We will never share, disclose, sell, or otherwise provide your data to other companies for the promotion of their products or services.
        Your data is used solely to serve you better within FlashGain 9ja.
      </p>

      <h3>9. Changes to This Policy</h3>
      <p>
        If we update this Privacy Policy, we will post the changes on this page and revise the &ldquo;Last updated&rdquo; date above.
        Continued use after changes means you accept the updated policy.
      </p>

      <h3>10. Contact</h3>
      <p>
        Questions about privacy? Reach our support team through the dashboard live chat or via the Support Policy channels.
      </p>
    </div>
  );
}

function PaymentContent() {
  return (
    <div>
      <h3>1. Agreement to Payment Terms</h3>
      <p>
        By using FlashGain 9ja and purchasing any service, bundle, or fee-based feature, you agree to this Payment Policy.
        All payments are processed securely and transparently.
      </p>

      <h3>2. Payment Methods & Processing</h3>
      <p>
        We use <strong>Stripe</strong> as our secure payment processor. You may be asked to provide your name, email, and card details at checkout.
        All card and bank data is encrypted in transit — we never store full card numbers, CVV codes, or PINs on our servers after a transaction.
      </p>

      <h3>3. Pricing, Fees & Currency</h3>
      <ul>
        <li>Prices are displayed in Nigerian Naira (₦) unless stated otherwise.</li>
        <li>Any processing or service fees are shown clearly at checkout before you confirm.</li>
        <li>You authorize us (via Stripe) to charge the displayed total to your chosen payment method.</li>
      </ul>

      <h3>4. Authorization & Verification</h3>
      <p>
        By submitting payment, you confirm you are the authorized holder of the payment method and that the details you provide are accurate.
        We may verify transactions and request additional confirmation to prevent fraud.
      </p>

      <h3>5. Transaction Security</h3>
      <p>
        After a successful payment, sensitive financial data is not retained on our systems. Stripe handles storage under PCI-DSS compliant
        security. We also monitor for suspicious activity and may pause or review flagged transactions to protect you.
      </p>

      <h3>6. Refunds, Cancellations & Failed Payments</h3>
      <ul>
        <li>Fees for digital services (e.g., codes, loans, or bundles) are generally non-refundable once delivered or activated, unless required by law or stated otherwise.</li>
        <li>If a payment fails or is cancelled by your bank, no service will be delivered and you will not be charged.</li>
        <li>Duplicate or erroneous charges — contact support promptly with proof of payment for review within 7 days.</li>
      </ul>

      <h3>7. Data Retention for Payments</h3>
      <p>
        We keep minimal transaction records (amount, date, reference, and status) for accounting, support, and legal compliance — but never your
        full card details. You can request account deletion; transactional logs required by law may be retained in anonymized or restricted form.
      </p>

      <h3>8. Changes to Payment Policy</h3>
      <p>
        We may update this policy to reflect new payment methods or regulatory requirements. Updates will be posted here with a new effective date.
      </p>
    </div>
  );
}

function SupportContent() {
  return (
    <div>
      <h3>1. Our Commitment</h3>
      <p>
        FlashGain 9ja is committed to fast, friendly, and fair support. By using our platform you agree to use support channels responsibly and
        follow the guidelines below.
      </p>

      <h3>2. How to Get Help</h3>
      <ul>
        <li><strong>Live Chat</strong> — Available from your dashboard for account, payment, and technical issues.</li>
        <li><strong>Telegram Channel</strong> — Join @flashgain9janews for updates, announcements, and community help.</li>
        <li>When contacting us, include your registered email and a clear description so we can help faster.</li>
      </ul>

      <h3>3. Support Hours & Response Times</h3>
      <p>
        Our team aims to respond within a few hours during business hours (9am–9pm WAT), and within 24 hours on weekends/holidays.
        Complex payment verifications may take up to 48 hours.
      </p>

      <h3>4. What Support Can Help With</h3>
      <ul>
        <li>Account access, profile updates, and password recovery</li>
        <li>Payment confirmations, failed transactions, and receipt issues</li>
        <li>Guidance on earning tasks, referrals, withdrawals, and platform features</li>
      </ul>

      <h3>5. What Support Cannot Do</h3>
      <ul>
        <li>We will never ask for your full card number, CVV, or password. Do not share these with anyone.</li>
        <li>We cannot bypass verification, alter referral records, or guarantee earnings.</li>
        <li>We cannot act on requests that violate our terms or applicable law.</li>
      </ul>

      <h3>6. User Responsibilities</h3>
      <ul>
        <li>Provide accurate information when registering and contacting support.</li>
        <li>Be respectful — abusive, fraudulent, or spam behavior may result in restricted support access.</li>
        <li>Keep your login details secure; you are responsible for activity on your account.</li>
        <li>Follow lawful use — we may release information when required to comply with law or protect rights, property, or safety.</li>
      </ul>

      <h3>7. Privacy & Payments While Getting Support</h3>
      <p>
        Support interactions may involve your name, email, or phone to verify ownership. All sensitive payments remain handled through{" "}
        <strong>Stripe</strong> — after any transaction, card details are not stored on our servers. We never sell or share your personal
        information for third-party marketing.
      </p>

      <h3>8. Updates to Support Policy</h3>
      <p>
        We may improve support channels or hours over time. Any changes will be posted on this page. Continued use after updates constitutes acceptance.
      </p>
    </div>
  );
}

export default function PoliciesPage() {
  return (
    <Suspense fallback={
      <div className="hh-root min-h-screen flex items-center justify-center"><p className="text-white/60">Loading policies...</p></div>
    }>
      <PoliciesContent />
    </Suspense>
  );
}

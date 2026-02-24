"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Sparkles, MapPin, User, TrendingUp } from "lucide-react";

interface WithdrawalNotificationProps {
  onClose: () => void;
}

export function WithdrawalNotification({
  onClose,
}: WithdrawalNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [notificationData, setNotificationData] = useState<{
    name: string;
    amount: string;
    state: string;
  } | null>(null);

  const [usedStates, setUsedStates] = useState<string[]>([]);
  const [usedNames, setUsedNames] = useState<string[]>([]);

  // Nigerian names grouped by tribe
  const nigerianNames = {
    Igbo: [
      "Chinedu",
      "Emeka",
      "Chioma",
      "Ikechukwu",
      "Chukwuma",
      "Chinonso",
      "Obinna",
      "Ifemelu",
      "Ifeanyi",
      "Chukwuemeka",
      "Nnenna",
      "Uche",
      "Ngozi",
      "Adaeze",
      "Chisom",
      "Somto",
      "Onyeka",
      "Ugochukwu",
      "Chizoba",
      "Ijeoma",
    ],
    Yoruba: [
      "Adebayo",
      "Temitope",
      "Kehinde",
      "Babatunde",
      "Titilayo",
      "Funmilayo",
      "Segun",
      "Olumide",
      "Oluwaseun",
      "Tosin",
      "Bisi",
      "Adeola",
      "Ayotunde",
      "Femi",
      "Modupe",
      "Oluwadamilola",
      "Olamide",
      "Ireti",
      "Lanre",
      "Morenikeji",
    ],
    Hausa: [
      "Aisha",
      "Zainab",
      "Ibrahim",
      "Usman",
      "Aliyu",
      "Hadiza",
      "Salamatu",
      "Maryam",
      "Hafsat",
      "Abubakar",
      "Sani",
      "Fatima",
      "Rakiya",
      "Bilal",
      "Aminu",
      "Yusuf",
      "Hajara",
      "Maimuna",
      "Nasiru",
      "Zubairu",
    ],
    Edo: [
      "Folake",
      "Obioma",
      "Oghene",
      "Osamudiamen",
      "Efe",
      "Eseosa",
      "Oluwatomi",
      "Omoregie",
      "Uyi",
      "Olaoluwa",
      "Aisosa",
      "Idahosa",
      "Osamuyi",
      "Igiogbe",
      "Ehikioya",
      "Ehimen",
      "Osarhiemen",
      "Oghenemaro",
      "Oghenemaro2",
      "Oghenebror",
    ],
    Tiv: [
      "Terver",
      "Aondowase",
      "Iorbee",
      "Aondona",
      "Kwagh",
      "Terkimbi",
      "Iorwese",
      "Terkula",
      "Tervar",
      "Iorhima",
      "Aondoba",
      "Terngu",
      "Kpav",
      "Tersala",
      "Iorwane",
      "Terbeku",
      "Terpande",
      "Aondona",
      "Terkuma",
      "Terbenga",
    ],
    Kanuri: [
      "Goni",
      "Bello",
      "Abdullahi",
      "Hassan",
      "Fatimah",
      "Auwal",
      "Musa",
      "Rakiya",
      "Salihu",
      "Aisha",
      "Yakubu",
      "Halima",
      "Mustapha",
      "Maryam",
      "Sadiya",
      "Bukar",
      "Zainab",
      "Ibrahim",
      "Umar",
      "Hafsat",
    ],
    Kanembu: [
      "Abakar",
      "Abdoulaye",
      "Maimouna",
      "Oumar",
      "Fatou",
      "Issa",
      "Sanda",
      "Moussa",
      "Aisha",
      "Boubacar",
      "Mahamat",
      "Zeinab",
      "Ali",
      "Mariama",
      "Abdel",
      "Hassan",
      "Ramatou",
      "Oumarou",
      "Hassana",
      "Barka",
    ],
    Efik: [
      "Iniobong",
      "Uduak",
      "Ekaette",
      "Ekemini",
      "Nsikak",
      "Emem",
      "Obong",
      "Imaobong",
      "Eyo",
      "Eno",
      "Itoro",
      "Essien",
      "Bassey",
      "Ndifreke",
      "Akpan",
      "Eka",
      "Owoidighe",
      "Etim",
      "Ekemini2",
      "Adiaha",
    ],
    English: [
      "John",
      "James",
      "Mary",
      "Elizabeth",
      "William",
      "Emma",
      "Michael",
      "Olivia",
      "Robert",
      "Sophia",
      "Charles",
      "Isabella",
      "Thomas",
      "Mia",
      "Daniel",
      "Amelia",
      "Matthew",
      "Charlotte",
      "Joseph",
      "Ava",
    ],
  };

  // Tribe to state mapping
  const tribeToStates: Record<string, string[]> = {
    Igbo: [
      "Enugu State",
      "Anambra State",
      "Imo State",
      "Abia State",
      "Ebonyi State",
    ],
    Yoruba: [
      "Lagos State",
      "Oyo State",
      "Osun State",
      "Ondo State",
      "Ekiti State",
      "Kwara State",
    ],
    Hausa: [
      "Kano State",
      "Kaduna State",
      "Katsina State",
      "Sokoto State",
      "Bauchi State",
      "Adamawa State",
      "Yobe State",
      "Taraba State",
    ],
    Edo: [
      "Edo State",
      "Delta State",
      "Rivers State",
      "Bayelsa State",
      "Cross River State",
    ],
    Tiv: ["Benue State", "Niger State"],
    Kanuri: ["Borno State", "Yobe State"],
    Kanembu: ["Borno State", "Yobe State"],
    Efik: ["Akwa Ibom State", "Cross River State"],
    English: [
      "FCT Abuja",
      "Kaduna State",
      "Lagos State",
      "Oyo State",
      "Rivers State",
    ],
  };

  // Expanded withdrawal amounts
  const withdrawalAmounts = [
    "₦500,000",
    "₦525,000",
    "₦550,000",
    "₦575,000",
    "₦600,000",
    "₦625,000",
    "₦650,000",
    "₦675,000",
    "₦700,000",
    "₦725,000",
    "₦750,000",
    "₦775,000",
    "₦800,000",
    "₦825,000",
    "₦850,000",
    "₦875,000",
    "₦900,000",
    "₦925,000",
    "₦950,000",
    "₦975,000",
    "₦1,000,000",
    "₦1,050,000",
    "₦1,075,000",
    "₦1,100,000",
    "₦1,125,000",
    "₦1,150,000",
    "₦1,175,000",
    "₦1,200,000",
    "₦1,225,000",
    "₦1,250,000",
    "₦1,275,000",
    "₦1,300,000",
    "₦1,325,000",
    "₦1,350,000",
    "₦1,375,000",
    "₦1,400,000",
    "₦1,425,000",
    "₦1,450,000",
    "₦1,475,000",
    "₦1,500,000",
  ];

  const getUniqueTribeState = () => {
    const tribes = Object.keys(nigerianNames);

    // Filter states and names to not used yet
    let availableTribes = tribes.filter((t) => {
      return tribeToStates[t].some((s) => !usedStates.includes(s));
    });

    if (availableTribes.length === 0) {
      // reset used arrays if all states used
      setUsedStates([]);
      setUsedNames([]);
      availableTribes = tribes;
    }

    let selectedTribe =
      availableTribes[Math.floor(Math.random() * availableTribes.length)];
    let availableStates = tribeToStates[selectedTribe].filter(
      (s) => !usedStates.includes(s),
    );
    let selectedState =
      availableStates[Math.floor(Math.random() * availableStates.length)];

    let availableNames = nigerianNames[selectedTribe].filter(
      (n: string) => !usedNames.includes(n),
    );
    let selectedName =
      availableNames[Math.floor(Math.random() * availableNames.length)];

    // Update used arrays
    setUsedStates((prev) => [...prev, selectedState]);
    setUsedNames((prev) => [...prev, selectedName]);

    return { name: selectedName, state: selectedState };
  };

  useEffect(() => {
    const showNotification = () => {
      const { name, state } = getUniqueTribeState();
      const randomAmount =
        withdrawalAmounts[Math.floor(Math.random() * withdrawalAmounts.length)];
      setNotificationData({ name, amount: randomAmount, state });
      setIsVisible(true);

      setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300);
      }, 10000);

      localStorage.setItem("last_withdrawal_popup", Date.now().toString());
    };

    const checkAndShow = () => {
      const lastShown = localStorage.getItem("last_withdrawal_popup");
      const now = Date.now();
      if (!lastShown || now - parseInt(lastShown) > 120000) {
        setTimeout(showNotification, 3000);
      } else {
        const remaining = 120000 - (now - parseInt(lastShown));
        setTimeout(showNotification, remaining);
      }
    };

    checkAndShow();
  }, [onClose]);

  if (!notificationData) return null;

  return (
    <div
      className={`hh-notification-wrapper ${
        isVisible ? "hh-notification-visible" : "hh-notification-hidden"
      }`}
    >
      <div className="hh-notification">
        {/* Animated bubbles */}
        <div className="hh-notif-bubbles">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`hh-notif-bubble hh-notif-bubble-${i + 1}`}
            ></div>
          ))}
        </div>

        {/* Glowing orb */}
        <div className="hh-notif-orb"></div>

        {/* Main content */}
        <div className="hh-notif-content">
          {/* Icon with pulse */}
          <div className="hh-notif-icon-container">
            <div className="hh-notif-icon-pulse"></div>
            <CheckCircle className="hh-notif-icon" />
          </div>

          {/* Text content */}
          <div className="hh-notif-text">
            <div className="hh-notif-title">
              <Sparkles className="hh-notif-sparkle" />
              <span>Withdrawal Successful</span>
            </div>

            <div className="hh-notif-details">
              <div className="hh-notif-user">
                <User className="hh-notif-user-icon" />
                <span className="hh-notif-name">{notificationData.name}</span>
              </div>
              <div className="hh-notif-amount">
                <TrendingUp className="hh-notif-amount-icon" />
                <span className="hh-notif-amount-text">
                  {notificationData.amount}
                </span>
              </div>
            </div>

            <div className="hh-notif-location">
              <MapPin className="hh-notif-location-icon" />
              <span className="hh-notif-location-text">
                {notificationData.state}
              </span>
              <span className="hh-notif-flag">🇳🇬</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="hh-notif-progress">
          <div className="hh-notif-progress-fill"></div>
        </div>
      </div>

      <style jsx>{`
        .hh-notification-wrapper {
          position: fixed;
          top: 20px;
          left: 0;
          right: 0;
          z-index: 9999;
          display: flex;
          justify-content: center;
          transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .hh-notification-visible {
          transform: translateY(0);
          opacity: 1;
        }

        .hh-notification-hidden {
          transform: translateY(-150%);
          opacity: 0;
        }

        .hh-notification {
          background: linear-gradient(135deg, #0d1f2d, #0a1628);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 20px;
          padding: 16px;
          width: calc(100% - 32px);
          max-width: 380px;
          position: relative;
          overflow: hidden;
          box-shadow:
            0 20px 40px rgba(0, 0, 0, 0.4),
            0 0 30px rgba(16, 185, 129, 0.2);
          backdrop-filter: blur(12px);
        }

        /* Animated bubbles inside notification */
        .hh-notif-bubbles {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .hh-notif-bubble {
          position: absolute;
          border-radius: 50%;
          opacity: 0;
          animation: hh-notif-bubble-rise linear infinite;
        }

        .hh-notif-bubble-1 {
          width: 8px;
          height: 8px;
          left: 10%;
          background: radial-gradient(
            circle,
            rgba(16, 185, 129, 0.4),
            transparent
          );
          animation-duration: 8s;
          animation-delay: 0s;
        }
        .hh-notif-bubble-2 {
          width: 14px;
          height: 14px;
          left: 25%;
          background: radial-gradient(
            circle,
            rgba(59, 130, 246, 0.3),
            transparent
          );
          animation-duration: 11s;
          animation-delay: 1.5s;
        }
        .hh-notif-bubble-3 {
          width: 6px;
          height: 6px;
          left: 40%;
          background: radial-gradient(
            circle,
            rgba(16, 185, 129, 0.5),
            transparent
          );
          animation-duration: 9s;
          animation-delay: 3s;
        }
        .hh-notif-bubble-4 {
          width: 18px;
          height: 18px;
          left: 55%;
          background: radial-gradient(
            circle,
            rgba(139, 92, 246, 0.2),
            transparent
          );
          animation-duration: 13s;
          animation-delay: 0.5s;
        }
        .hh-notif-bubble-5 {
          width: 10px;
          height: 10px;
          left: 70%;
          background: radial-gradient(
            circle,
            rgba(16, 185, 129, 0.3),
            transparent
          );
          animation-duration: 10s;
          animation-delay: 2s;
        }
        .hh-notif-bubble-6 {
          width: 5px;
          height: 5px;
          left: 82%;
          background: radial-gradient(
            circle,
            rgba(52, 211, 153, 0.6),
            transparent
          );
          animation-duration: 7s;
          animation-delay: 4s;
        }

        @keyframes hh-notif-bubble-rise {
          0% {
            transform: translateY(100%) scale(0.5);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(-50%) scale(1.2);
            opacity: 0;
          }
        }

        /* Glowing orb */
        .hh-notif-orb {
          position: absolute;
          top: -20px;
          right: -20px;
          width: 100px;
          height: 100px;
          background: radial-gradient(
            circle,
            rgba(16, 185, 129, 0.2),
            transparent
          );
          border-radius: 50%;
          filter: blur(20px);
          animation: hh-notif-orb-float 6s ease-in-out infinite;
        }

        @keyframes hh-notif-orb-float {
          0%,
          100% {
            transform: translate(0, 0);
          }
          50% {
            transform: translate(-10px, 10px);
          }
        }

        /* Content */
        .hh-notif-content {
          position: relative;
          z-index: 10;
          display: flex;
          gap: 12px;
        }

        /* Icon container */
        .hh-notif-icon-container {
          position: relative;
          flex-shrink: 0;
        }

        .hh-notif-icon-pulse {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.3);
          animation: hh-notif-pulse 2s ease-out infinite;
        }

        .hh-notif-icon {
          position: relative;
          width: 32px;
          height: 32px;
          color: #10b981;
          filter: drop-shadow(0 0 10px #10b981);
          animation: hh-notif-icon-spin 10s linear infinite;
        }

        @keyframes hh-notif-pulse {
          0% {
            transform: scale(0.8);
            opacity: 1;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }

        @keyframes hh-notif-icon-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        /* Text content */
        .hh-notif-text {
          flex: 1;
        }

        .hh-notif-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 15px;
          font-weight: 700;
          color: white;
          margin-bottom: 6px;
        }

        .hh-notif-sparkle {
          width: 16px;
          height: 16px;
          color: #fbbf24;
          animation: hh-notif-sparkle-pulse 1.5s ease-in-out infinite;
        }

        @keyframes hh-notif-sparkle-pulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
        }

        .hh-notif-details {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 6px;
          flex-wrap: wrap;
        }

        .hh-notif-user {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .hh-notif-user-icon {
          width: 12px;
          height: 12px;
          color: #9ca3af;
        }

        .hh-notif-name {
          font-size: 13px;
          font-weight: 600;
          color: #e5e7eb;
        }

        .hh-notif-amount {
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 20px;
          padding: 2px 8px;
        }

        .hh-notif-amount-icon {
          width: 12px;
          height: 12px;
          color: #fbbf24;
        }

        .hh-notif-amount-text {
          font-size: 13px;
          font-weight: 700;
          color: #fbbf24;
        }

        .hh-notif-location {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 4px;
        }

        .hh-notif-location-icon {
          width: 12px;
          height: 12px;
          color: #10b981;
          animation: hh-notif-location-bounce 2s ease-in-out infinite;
        }

        @keyframes hh-notif-location-bounce {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-2px);
          }
        }

        .hh-notif-location-text {
          font-size: 11px;
          color: #10b981;
          font-weight: 500;
        }

        .hh-notif-flag {
          font-size: 12px;
          margin-left: 2px;
          animation: hh-notif-flag-wave 2s ease-in-out infinite;
        }

        @keyframes hh-notif-flag-wave {
          0%,
          100% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(5deg);
          }
          75% {
            transform: rotate(-5deg);
          }
        }

        /* Progress bar */
        .hh-notif-progress {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: rgba(255, 255, 255, 0.1);
          overflow: hidden;
        }

        .hh-notif-progress-fill {
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, #10b981, #fbbf24, #10b981);
          animation: hh-notif-progress-shrink 10s linear forwards;
          transform-origin: left;
        }

        @keyframes hh-notif-progress-shrink {
          from {
            transform: scaleX(1);
          }
          to {
            transform: scaleX(0);
          }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .hh-notif-bubble,
          .hh-notif-orb,
          .hh-notif-icon-pulse,
          .hh-notif-icon,
          .hh-notif-sparkle,
          .hh-notif-location-icon,
          .hh-notif-flag,
          .hh-notif-progress-fill {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { X, Share, Smartphone } from 'lucide-react';

const INSTALLED_KEY = 'moneymate_pwa_installed';
const DISMISSED_KEY = 'pwa_install_dismissed_at';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function detectPlatform() {
  if (typeof navigator === 'undefined') return { isIOS: false, isAndroid: false };
  const ua = navigator.userAgent.toLowerCase();
  const isIOS =
    /ipad|iphone|ipod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /android/.test(ua);
  return { isIOS, isAndroid };
}

function isAlreadyInstalled() {
  if (typeof window === 'undefined') return false;
  try {
    if (localStorage.getItem(INSTALLED_KEY) === '1') return true;
  } catch {}
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function markInstalled() {
  try { localStorage.setItem(INSTALLED_KEY, '1'); } catch {}
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Already installed — never show again.
    if (isAlreadyInstalled()) {
      markInstalled();
      return;
    }

    // Dismissed within last 24 hours — don't show again yet.
    try {
      const dismissedTime = localStorage.getItem(DISMISSED_KEY);
      if (dismissedTime && parseInt(dismissedTime) > Date.now() - 24 * 60 * 60 * 1000) return;
    } catch {}

    const { isIOS: ios } = detectPlatform();
    setIsIOS(ios);

    let timer: number | undefined;
    if (ios) {
      // iOS has no install prompt — show the mini card after a short delay.
      timer = window.setTimeout(() => {
        if (!isAlreadyInstalled()) setShow(true);
      }, 3000);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      if (isAlreadyInstalled()) return;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    const handleInstalled = () => {
      markInstalled();
      setShow(false);
      setDeferredPrompt(null);
      setExpanded(false);
    };
    // If the app gets installed while open (or display mode flips),
    // hide the card permanently.
    const mq = window.matchMedia('(display-mode: standalone)');
    const handleDisplayChange = (ev: MediaQueryListEvent) => {
      if (ev.matches) handleInstalled();
    };
    try {
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', handleDisplayChange);
      else (mq as any).addListener(handleDisplayChange);
    } catch {}

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', handleInstalled);
      try {
        if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', handleDisplayChange);
        else (mq as any).removeListener(handleDisplayChange);
      } catch {}
    };
  }, []);

  const handleDismiss = () => {
    setShow(false);
    setExpanded(false);
    try { localStorage.setItem(DISMISSED_KEY, Date.now().toString()); } catch {}
  };

  // Small card → first tap EXPANDS it (grows to show details), second tap installs.
  const handleInstallClick = async () => {
    if (!expanded) {
      setExpanded(true);
      return;
    }
    if (deferredPrompt) {
      try {
        setIsInstalling(true);
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          markInstalled();
          setShow(false);
          setDeferredPrompt(null);
          setExpanded(false);
        }
      } catch (err) {
        console.error('Install error:', err);
      }
      setIsInstalling(false);
      return;
    }
    if (isIOS) return; // steps are shown in the expanded card
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-[92px] md:bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-lg z-50">
      <div
        className={`bg-white rounded-[20px] border border-gray-100 shadow-2xl p-3 flex flex-col gap-3 transition-all duration-300 overflow-hidden ${expanded ? 'min-h-[160px]' : ''}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 via-sky-500 to-amber-400 grid place-items-center text-white font-black flex-shrink-0">
            M
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-black text-gray-900">Install Moneymate 9ja</div>
            <div className="text-xs text-gray-500">
              {isIOS && expanded ? 'Follow steps below' : expanded ? 'Tap Install again to add it' : 'Add to home screen for quick access'}
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="px-5 py-2.5 rounded-full bg-sky-500 text-white text-sm font-bold hover:bg-sky-600 transition flex-shrink-0 disabled:opacity-60"
          >
            {isInstalling ? '...' : expanded ? 'Install' : 'Install'}
          </button>
          <button
            onClick={() => {
              if (expanded) setExpanded(false);
              else handleDismiss();
            }}
            className="w-8 h-8 grid place-items-center rounded-full hover:bg-gray-50 text-gray-400 flex-shrink-0"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Expanded: card grows to ~2x and shows benefits + steps */}
        {expanded && (
          <div className="border-t border-gray-100 pt-3 animate-[fadeIn_0.25s_ease]">
            {!isIOS ? (
              <>
                <p className="text-xs font-bold text-gray-700 mb-2.5 flex items-center gap-1.5">
                  <Smartphone className="h-3.5 w-3.5 text-sky-500" /> Why install?
                </p>
                <ul className="text-xs text-gray-600 space-y-1.5 pl-1">
                  <li>✅ Home screen shortcut — open in one tap</li>
                  <li>✅ Full-screen app experience</li>
                  <li>✅ Push notifications even when closed</li>
                </ul>
                <button
                  onClick={handleInstallClick}
                  disabled={isInstalling}
                  className="mt-3 w-full py-2.5 rounded-full bg-sky-500 text-white text-sm font-bold hover:bg-sky-600 transition disabled:opacity-60"
                >
                  {isInstalling ? 'Installing...' : deferredPrompt ? 'Install Now' : 'Got it'}
                </button>
              </>
            ) : (
              <>
                <p className="text-xs font-bold text-gray-700 mb-2.5 flex items-center gap-1.5">
                  <Smartphone className="h-3.5 w-3.5 text-sky-500" /> To add Moneymate on iPhone:
                </p>
                <ol className="space-y-2.5">
                  <li className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-sky-500 text-white grid place-items-center text-xs font-bold flex-shrink-0">1</span>
                    <span className="text-xs text-gray-600">
                      Tap the <Share className="inline h-3.5 w-3.5 text-sky-600 mx-0.5" /> <span className="font-semibold text-gray-800">Share</span> button in Safari&apos;s bottom bar
                    </span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-sky-500 text-white grid place-items-center text-xs font-bold flex-shrink-0">2</span>
                    <span className="text-xs text-gray-600">
                      Scroll and tap <span className="font-semibold text-gray-800">Add to Home Screen</span>
                    </span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-sky-500 text-white grid place-items-center text-xs font-bold flex-shrink-0">3</span>
                    <span className="text-xs text-gray-600">
                      Tap <span className="font-semibold text-sky-600">Add</span> top-right to install instantly
                    </span>
                  </li>
                </ol>
                <p className="mt-3 text-[11px] text-gray-400 text-center">Then launch Moneymate from your home screen like a real app.</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { X, Download, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

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
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showAndroidPrompt, setShowAndroidPrompt] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    // Already installed — nothing to do
    if (isAlreadyInstalled()) return;

    // Dismissed within last 24 hours — don't show again
    const dismissedTime = localStorage.getItem('pwa_install_dismissed_at');
    if (dismissedTime && parseInt(dismissedTime) > Date.now() - 24 * 60 * 60 * 1000) return;

    const { isIOS, isAndroid } = detectPlatform();

    if (isIOS) {
      // iOS: show manual "Add to Home Screen" instructions after a short delay
      const t = setTimeout(() => setShowIOSPrompt(true), 3000);
      return () => clearTimeout(t);
    }

    if (isAndroid || true) {
      // Android / Desktop: listen for browser-native install prompt
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setShowAndroidPrompt(true);
      };
      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }
  }, []);

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowAndroidPrompt(false);
        setDeferredPrompt(null);
      }
    } catch (err) {
      console.error('Install error:', err);
    }
  };

  const handleDismiss = () => {
    setShowAndroidPrompt(false);
    setShowIOSPrompt(false);
    localStorage.setItem('pwa_install_dismissed_at', Date.now().toString());
  };

  // ─── Android prompt ────────────────────────────────────────────────────────
  if (showAndroidPrompt && deferredPrompt) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <Card className="w-full max-w-sm shadow-2xl bg-yellow-50 border-yellow-300 border-2">
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 rounded-xl">
                  <Download className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold">Install Moneymate 9ja</h2>
                  <p className="text-xs text-gray-500">Add to your home screen</p>
                </div>
              </div>
              <button onClick={handleDismiss} className="p-1 hover:bg-gray-100 rounded-md" aria-label="Close">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <p className="text-sm text-gray-600">
              Install the app for faster access, offline use, and so you get <strong>push notifications even when the app is closed</strong>.
            </p>

            <ul className="text-xs text-gray-500 space-y-1 pl-1">
              <li>✅ Home screen shortcut</li>
              <li>✅ Full-screen experience</li>
              <li>✅ Background notifications</li>
              <li>✅ Works offline</li>
            </ul>

            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleAndroidInstall}
                className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-bold shadow"
              >
                Install Now
              </Button>
              <Button onClick={handleDismiss} variant="outline" className="flex-1">
                Later
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // ─── iOS prompt ────────────────────────────────────────────────────────────
  // iOS doesn't support beforeinstallprompt — guide users manually
  if (showIOSPrompt) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
        <Card className="w-full shadow-2xl border-yellow-400 border-2 bg-amber-50">
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share className="w-5 h-5 text-yellow-600" />
                <h2 className="text-sm font-bold">Install Moneymate 9ja</h2>
              </div>
              <button onClick={handleDismiss} className="p-1 hover:bg-gray-100 rounded-md" aria-label="Close">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              To install and get notifications on iOS:
            </p>

            <ol className="text-xs text-gray-600 space-y-1 pl-4 list-decimal">
              <li>Tap the <strong>Share</strong> button <span className="text-blue-500">⬆</span> in Safari</li>
              <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
              <li>Tap <strong>"Add"</strong> — then open the app from your home screen</li>
            </ol>

            <p className="text-xs text-yellow-700 font-medium">
              ⚠ Notifications only work when the app is installed from Safari.
            </p>

            <Button onClick={handleDismiss} variant="outline" className="w-full text-xs" size="sm">
              Got it
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return null;
}

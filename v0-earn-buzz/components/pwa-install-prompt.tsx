'use client';

import React, { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Check if device is Android
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroidDevice = /android/.test(userAgent);
    setIsAndroid(isAndroidDevice);

    // Check if user has dismissed the prompt recently (24 hours)
    const dismissedTime = localStorage.getItem('pwa_install_dismissed_at');
    if (dismissedTime) {
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      if (parseInt(dismissedTime) > dayAgo) {
        return; // User dismissed recently, don't show again
      }
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return; // App is already installed
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('User installed the app');
        setShowPrompt(false);
        setDeferredPrompt(null);
      } else {
        console.log('User dismissed the install prompt');
      }
    } catch (error) {
      console.error('Error installing app:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Store dismissal time to avoid showing for 24 hours
    localStorage.setItem('pwa_install_dismissed_at', Date.now().toString());
  };

  // Only show on Android devices
  if (!isAndroid || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-300">
      <Card className="w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-lg">
                <Download className="w-6 h-6 text-orange-600" />
              </div>
              <h2 className="text-lg font-semibold">Install App</h2>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-gray-100 rounded-md transition"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600">
            Install <strong>FlashGain 9ja</strong> on your phone for faster access and offline support. Get notifications right on your home screen!
          </p>

          {/* Benefits */}
          <ul className="text-xs text-gray-600 space-y-1">
            <li>✓ Quick access from home screen</li>
            <li>✓ Works offline</li>
            <li>✓ Get push notifications</li>
            <li>✓ Full-screen app experience</li>
          </ul>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleInstall}
              className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-lg shadow-md"
            >
              Install Now
            </Button>
            <Button
              onClick={handleDismiss}
              variant="outline"
              className="flex-1"
            >
              Maybe Later
            </Button>
          </div>

          {/* Footer note */}
          <p className="text-xs text-gray-500 text-center">
            You can install anytime from your browser menu
          </p>
        </div>
      </Card>
    </div>
  );
}

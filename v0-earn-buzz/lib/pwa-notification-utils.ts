/**
 * PWA Notification System - Frontend Utilities
 * Handles capability detection, subscription, and diagnostics
 */

// Type definitions
export interface NotificationConfig {
  vapidPublicKey: string;
  firebaseConfig?: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
  backendUrl: string;
  subscribeEndpoint: string;
  sendEndpoint: string;
}

export interface CapabilityDetection {
  isIOS: boolean;
  isStandalone: boolean;
  hasPushManager: boolean;
  hasServiceWorker: boolean;
  hasNotificationAPI: boolean;
  permission: NotificationPermission;
  userAgent: string;
}

export interface DiagnosticPayload extends CapabilityDetection {
  stage: string;
  timestamp: number;
  standalone: boolean;
  reason?: string;
  response?: object;
  serviceWorkerReady: boolean;
  hasSubscription: boolean;
}

export interface FCMSubscriptionPayload {
  type: 'fcm';
  token: string;
  uid: string;
}

export interface WebPushSubscriptionPayload {
  type: 'webpush';
  subscription: PushSubscription;
  uid: string;
}

type SubscriptionPayload = FCMSubscriptionPayload | WebPushSubscriptionPayload;

type FirebaseMessagingBundle = {
  app: any;
  messaging: any;
  vapidPublicKey: string;
};

// Capability Detection
export function detectCapabilities(): CapabilityDetection {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone =
    (navigator as any)?.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;

  return {
    isIOS,
    isStandalone,
    hasPushManager: 'PushManager' in window,
    hasServiceWorker: 'serviceWorker' in navigator,
    hasNotificationAPI: 'Notification' in window,
    permission: (Notification as any)?.permission || 'default',
    userAgent: navigator.userAgent,
  };
}

// Service Worker Registration with Fallbacks
export async function registerServiceWorker(): Promise<ServiceWorkerContainer['controller'] | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker not supported');
    return null;
  }

  const paths = [
    '/notification-sw.js',
    '/sw.js',
    '/service-worker.js',
  ];

  for (const path of paths) {
    try {
      await navigator.serviceWorker.register(path, { scope: '/' });
      console.log('Service Worker registered:', path);
      return navigator.serviceWorker.controller;
    } catch (error) {
      console.warn(`Failed to register SW from ${path}:`, error);
    }
  }

  return null;
}

// Check Service Worker Readiness
export async function isServiceWorkerReady(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  const reg = await navigator.serviceWorker.getRegistration();
  return Boolean(reg && (reg.active || reg.waiting));
}

// Firebase FCM Token Management
export async function initializeFirebase(config: NotificationConfig): Promise<FirebaseMessagingBundle | null> {
  if (!config.firebaseConfig) {
    console.warn('Firebase config not provided');
    return null;
  }

  try {
    const firebaseApp = await import('firebase/app');
    const firebaseMessaging = await import('firebase/messaging');

    const app = firebaseApp.getApps().length
      ? firebaseApp.getApps()[0]
      : firebaseApp.initializeApp(config.firebaseConfig);

    const supported = await firebaseMessaging.isSupported();
    if (!supported) {
      console.warn('Firebase messaging is not supported in this browser/runtime');
      return null;
    }

    const messaging = firebaseMessaging.getMessaging(app);
    return {
      app,
      messaging,
      vapidPublicKey: config.vapidPublicKey,
    };
  } catch (error) {
    console.warn('Firebase initialization failed:', error);
    return null;
  }
}

// Get FCM Token
export async function getFCMToken(
  messaging: any,
  capabilities: CapabilityDetection
): Promise<string | null> {
  if (!messaging || capabilities.isIOS) {
    return null; // FCM not used on iOS
  }

  try {
    const firebaseMessaging = await import('firebase/messaging');
    const token = await firebaseMessaging.getToken(messaging.messaging, {
      vapidKey: messaging.vapidPublicKey,
      serviceWorkerRegistration: await navigator.serviceWorker.getRegistration('/notification-sw.js')
        || await navigator.serviceWorker.getRegistration('/sw.js')
        || undefined,
    });
    return token || null;
  } catch (error) {
    console.error('Failed to get FCM token:', error);
    return null;
  }
}

// Handle FCM Token Refresh
export function listenToFCMTokenRefresh(
  messaging: any,
  onRefresh: (token: string) => void
): void {
  if (!messaging) return;
  void onRefresh;
}

// Listen to FCM Messages
export function listenToFCMMessages(messaging: any): void {
  if (!messaging) return;
  import('firebase/messaging')
    .then((firebaseMessaging) => {
      firebaseMessaging.onMessage(messaging.messaging, (payload: any) => {
        console.log('FCM Message received:', payload);

        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SHOW_NOTIFICATION',
            notification: payload.notification || payload.data,
          });
        }
      });
    })
    .catch((error) => {
      console.warn('Unable to attach FCM onMessage listener:', error);
    });
}

// Request Notification Permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    throw new Error('Notification API not supported');
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    throw new Error('Notification permission denied by user');
  }

  return Notification.requestPermission();
}

// Subscribe to Web Push
export async function subscribeToWebPush(
  vapidPublicKey: string
): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Web Push not supported');
  }

  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) {
    throw new Error('Service Worker not registered');
  }

  const options = {
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
  };

  try {
    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      subscription = await reg.pushManager.subscribe(options);
    }

    return subscription;
  } catch (error) {
    console.error('Web Push subscription error:', error);
    throw error;
  }
}

// Convert VAPID key format
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

// Send Subscription to Backend
export async function sendSubscriptionToBackend(
  backendUrl: string,
  subscribeEndpoint: string,
  payload: SubscriptionPayload
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await fetch(`${backendUrl}${subscribeEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return { success: true, message: data.message };
  } catch (error) {
    console.error('Subscription error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Build Diagnostic Payload
export async function buildDiagnosticPayload(
  stage: string,
  capabilities: CapabilityDetection,
  reason?: string,
  response?: object
): Promise<DiagnosticPayload> {
  const serviceWorkerReady = await isServiceWorkerReady();
  const hasSubscription = await checkExistingSubscription();

  return {
    ...capabilities,
    stage,
    standalone: capabilities.isStandalone,
    timestamp: Date.now(),
    serviceWorkerReady,
    hasSubscription,
    reason,
    response,
  };
}

// Check for Existing Subscription
export async function checkExistingSubscription(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      return false;
    }

    const subscription = await (reg as any).pushManager?.getSubscription?.();
    return !!subscription;
  } catch (error) {
    console.error('Error checking subscription:', error);
    return false;
  }
}

// iOS Standalone Check
export function isIosStandalone(capabilities: CapabilityDetection): boolean {
  return capabilities.isIOS && capabilities.isStandalone;
}

// iOS Non-Standalone Check (needs add to home screen)
export function needsAddToHomeScreen(capabilities: CapabilityDetection): boolean {
  return capabilities.isIOS && !capabilities.isStandalone;
}

// Storage helpers for throttling
export function setHelperButtonTimestamp(key: string): void {
  const timestamp = Date.now();
  localStorage.setItem(`notification_helper_${key}`, timestamp.toString());
}

export function getHelperButtonTimestamp(key: string): number | null {
  const stored = localStorage.getItem(`notification_helper_${key}`);
  return stored ? parseInt(stored, 10) : null;
}

export function isHelperButtonThrottled(key: string, hours: number = 24): boolean {
  const timestamp = getHelperButtonTimestamp(key);
  if (!timestamp) {
    return false;
  }

  const now = Date.now();
  const elapsed = now - timestamp;
  const throttleMs = hours * 60 * 60 * 1000;

  return elapsed < throttleMs;
}

// Copy to clipboard helper
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    }
  } catch (error) {
    console.error('Copy to clipboard failed:', error);
    return false;
  }
}

// Format JSON with indentation
export function formatDiagnosticJSON(obj: object): string {
  return JSON.stringify(obj, null, 2);
}

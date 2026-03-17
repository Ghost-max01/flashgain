'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  detectCapabilities,
  registerServiceWorker,
  isServiceWorkerReady,
  initializeFirebase,
  getFCMToken,
  listenToFCMTokenRefresh,
  listenToFCMMessages,
  requestNotificationPermission,
  subscribeToWebPush,
  sendSubscriptionToBackend,
  buildDiagnosticPayload,
  checkExistingSubscription,
  isIosStandalone,
  needsAddToHomeScreen,
  setHelperButtonTimestamp,
  isHelperButtonThrottled,
  formatDiagnosticJSON,
  CapabilityDetection,
  DiagnosticPayload,
  NotificationConfig,
} from '@/lib/pwa-notification-utils';

export interface UseNotificationOptions {
  config: NotificationConfig;
  userId: string;
  onPermissionGranted?: (diagnostic: DiagnosticPayload) => void;
  onPermissionDenied?: (diagnostic: DiagnosticPayload) => void;
  onError?: (error: Error, diagnostic: DiagnosticPayload) => void;
}

export interface UseNotificationReturn {
  capabilities: CapabilityDetection | null;
  permission: NotificationPermission | null;
  isLoading: boolean;
  diagnostic: DiagnosticPayload | null;
  requestPermission: () => Promise<void>;
  checkStatus: () => Promise<void>;
  showDiagnostics: () => void;
  isHelperThrottled: (key: string) => boolean;
  recordHelperUsage: (key: string) => void;
}

export function useNotification(
  options: UseNotificationOptions
): UseNotificationReturn {
  const [capabilities, setCapabilities] = useState<CapabilityDetection | null>(
    null
  );
  const [permission, setPermission] = useState<NotificationPermission | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [diagnostic, setDiagnostic] = useState<DiagnosticPayload | null>(null);
  const messagingRef = useRef<any>(null);

  // Initialize on mount
  useEffect(() => {
    initializeNotifications();
  }, []);

  const initializeNotifications = async () => {
    try {
      // 1. Detect capabilities
      const caps = detectCapabilities();
      setCapabilities(caps);
      setPermission(caps.permission);

      // 2. Register service worker
      if (caps.hasServiceWorker) {
        await registerServiceWorker();
      }

      // 3. Initialize Firebase if not iOS
      if (!caps.isIOS && options.config.firebaseConfig) {
        messagingRef.current = await initializeFirebase(options.config);

        if (messagingRef.current) {
          // Listen to token refresh
          listenToFCMTokenRefresh(messagingRef.current, (token: string) => {
            handleFCMTokenRefresh(token);
          });

          // Listen to incoming messages
          listenToFCMMessages(messagingRef.current);

          // Try to get initial token if permission granted
          if (caps.permission === 'granted') {
            const token = await getFCMToken(messagingRef.current, caps);
            if (token) {
              await subscribeFCMToken(token);
            }
          }
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Notification initialization error:', error);
      setIsLoading(false);
    }
  };

  const requestPermission = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!capabilities) throw new Error('Capabilities not detected');

      // iOS tab mode - show guidance only
      if (needsAddToHomeScreen(capabilities)) {
        const diagnostic = await buildDiagnosticPayload(
          'ios-tab-mode',
          capabilities,
          'iOS Safari tab mode - please add to home screen'
        );
        setDiagnostic(diagnostic);
        options.onError?.(
          new Error('Add to Home Screen iOS'),
          diagnostic
        );
        setIsLoading(false);
        return;
      }

      // Request permission
      const result = await requestNotificationPermission();
      setPermission(result);

      // Build capability snapshot after permission request
      const updatedCaps = detectCapabilities();
      setCapabilities(updatedCaps);

      if (result === 'granted') {
        // Android/Desktop FCM flow
        if (!capabilities.isIOS && messagingRef.current) {
          const token = await getFCMToken(messagingRef.current, updatedCaps);
          if (token) {
            await subscribeFCMToken(token);
          }
        }

        // iOS standalone native webpush flow
        if (isIosStandalone(updatedCaps)) {
          const subscription = await subscribeToWebPush(
            options.config.vapidPublicKey
          );
          if (subscription) {
            await subscribeWebPushToBackend(subscription);
          }
        }

        const diagnostic = await buildDiagnosticPayload(
          'permission-granted',
          updatedCaps
        );
        setDiagnostic(diagnostic);
        options.onPermissionGranted?.(diagnostic);
      } else if (result === 'denied') {
        const diagnostic = await buildDiagnosticPayload(
          'permission-denied',
          updatedCaps,
          'User denied notification permission'
        );
        setDiagnostic(diagnostic);
        options.onPermissionDenied?.(diagnostic);
      }

      setIsLoading(false);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const diagnostic = await buildDiagnosticPayload(
        'permission-error',
        capabilities || detectCapabilities(),
        err.message
      );
      setDiagnostic(diagnostic);
      options.onError?.(err, diagnostic);
      setIsLoading(false);
    }
  }, [capabilities, options]);

  const checkStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!capabilities) throw new Error('Capabilities not detected');

      const serviceWorkerReady = await isServiceWorkerReady();
      const hasSubscription = await checkExistingSubscription();
      const updatedCaps = detectCapabilities();

      const diagnostic = await buildDiagnosticPayload(
        'status-check',
        updatedCaps
      );

      setDiagnostic(diagnostic);
      setCapabilities(updatedCaps);
      setPermission(updatedCaps.permission);

      setIsLoading(false);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const diagnostic = await buildDiagnosticPayload(
        'status-check-error',
        capabilities || detectCapabilities(),
        err.message
      );
      setDiagnostic(diagnostic);
      options.onError?.(err, diagnostic);
      setIsLoading(false);
    }
  }, [capabilities, options]);

  const showDiagnostics = useCallback(() => {
    if (diagnostic) {
      const json = formatDiagnosticJSON(diagnostic);
      console.log('Notification Diagnostics:', json);
    }
  }, [diagnostic]);

  const isHelperThrottled = useCallback((key: string): boolean => {
    return isHelperButtonThrottled(key, 24);
  }, []);

  const recordHelperUsage = useCallback((key: string) => {
    setHelperButtonTimestamp(key);
  }, []);

  const subscribeFCMToken = async (token: string) => {
    await sendSubscriptionToBackend(
      options.config.backendUrl,
      options.config.subscribeEndpoint,
      {
        type: 'fcm',
        token,
        uid: options.userId,
      }
    );
  };

  const subscribeWebPushToBackend = async (
    subscription: PushSubscription
  ) => {
    await sendSubscriptionToBackend(
      options.config.backendUrl,
      options.config.subscribeEndpoint,
      {
        type: 'webpush',
        subscription,
        uid: options.userId,
      }
    );
  };

  const handleFCMTokenRefresh = async (newToken: string) => {
    console.log('FCM token refreshed');
    await subscribeFCMToken(newToken);
  };

  return {
    capabilities,
    permission,
    isLoading,
    diagnostic,
    requestPermission,
    checkStatus,
    showDiagnostics,
    isHelperThrottled,
    recordHelperUsage,
  };
}

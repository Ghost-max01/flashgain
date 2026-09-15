'use client'

import { useEffect } from 'react'
import { sanitizeCorruptedStorage } from '@/lib/safe-storage'

/**
 * Boot-time guard (renders nothing): drops corrupted JSON values from
 * localStorage BEFORE page effects read them, so a half-written value can
 * never throw inside a page's JSON.parse again. Logic-only, no visual output.
 */
export function ClientCrashGuard() {
  useEffect(() => {
    sanitizeCorruptedStorage();
  }, []);
  return null;
}

'use client'

import { useEffect } from 'react'

export function ServiceWorkerUpdater() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    let attempts = 0

    const handleControllerChange = () => {
      // New service worker has taken control. Do a silent background fetch
      // to warm caches and let the app keep running without a visible reload.
      try {
        // fetch current page to allow SW to update its cache via fetch handler
        void fetch(window.location.href, { cache: 'no-store', credentials: 'same-origin' })
      } catch (e) {
        /* ignore */
      }
    }

    const tryUpdate = async () => {
      attempts += 1
      try {
        const registration =
          (await navigator.serviceWorker.getRegistration('/sw.js')) ||
          (await navigator.serviceWorker.register('/sw.js', { scope: '/' }))

        // Force an update check
        await registration.update()

        // If a worker is waiting, tell it to activate immediately
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        }
      } catch (error) {
        console.error('[ServiceWorkerUpdater] failed to update service worker', error)
      }
    }

    // If page appears blank (very small body text), try to refresh using SW update
    const checkForBlankAndReload = () => {
      try {
        const bodyText = document.body?.innerText || ''
        const visibleText = bodyText.trim()
        const lastReload = parseInt(localStorage.getItem('sw-last-reload') || '0', 10)
        const now = Date.now()
        // If body has almost no text and we haven't reloaded recently, attempt update+reload
        if (visibleText.length < 20 && now - lastReload > 30_000) {
          localStorage.setItem('sw-last-reload', String(now))
          void tryUpdate()
          // As a fallback, force a hard reload after a short delay
          setTimeout(() => {
            if (!hasReloaded) {
              hasReloaded = true
              window.location.reload()
            }
          }, 1_200)
        }
      } catch (e) {
        /* ignore */
      }
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    // Run initial update immediately; blank detection still triggers background fetch
    void tryUpdate()
    checkForBlankAndReload()

    // Retry a few times in the background for stubborn cases
    const interval = setInterval(() => {
      if (attempts > 6) return clearInterval(interval)
      void tryUpdate()
      checkForBlankAndReload()
    }, 10_000)

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
      clearInterval(interval)
    }
  }, [])

  return null
}

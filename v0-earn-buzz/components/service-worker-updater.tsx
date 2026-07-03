'use client'

import { useEffect } from 'react'

export function ServiceWorkerUpdater() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    let hasReloaded = false
    let attempts = 0

    const handleControllerChange = () => {
      if (hasReloaded) return
      hasReloaded = true
      // small delay to allow DOM settle before reload
      setTimeout(() => window.location.reload(), 200)
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

    // Run initial update and blank check immediately
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

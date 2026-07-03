'use client'

import { useEffect } from 'react'

export function ServiceWorkerUpdater() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    let hasReloaded = false

    const handleControllerChange = () => {
      if (hasReloaded) return
      hasReloaded = true
      window.location.reload()
    }

    const updateWorker = async () => {
      try {
        const registration =
          (await navigator.serviceWorker.getRegistration('/sw.js')) ||
          (await navigator.serviceWorker.register('/sw.js', { scope: '/' }))

        await registration.update()

        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        }
      } catch (error) {
        console.error('[ServiceWorkerUpdater] failed to update service worker', error)
      }
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
    void updateWorker()

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
    }
  }, [])

  return null
}

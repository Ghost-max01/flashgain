"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { NotificationPermissionPopup } from "@/components/notification-permission-popup"
import { useNotification } from "@/hooks/useNotification"

function resolveUserId(): string {
  if (typeof window === "undefined") {
    return "anonymous"
  }

  return (
    localStorage.getItem("uid") ||
    localStorage.getItem("user_id") ||
    localStorage.getItem("userId") ||
    "anonymous"
  )
}

export function NotificationHelperTools() {
  const [open, setOpen] = useState(false)
  const [showFloatingButtons, setShowFloatingButtons] = useState(true)
  const [userLoggedIn, setUserLoggedIn] = useState(false)

  const config = useMemo(
    () => ({
      vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
      backendUrl: process.env.NEXT_PUBLIC_NOTIFICATION_BACKEND_URL || "",
      subscribeEndpoint: process.env.NEXT_PUBLIC_NOTIFICATION_SUBSCRIBE_PATH || "/api/notifications/subscribe",
      sendEndpoint: process.env.NEXT_PUBLIC_NOTIFICATION_SEND_PATH || "/api/notifications/send",
      firebaseConfig: process.env.NEXT_PUBLIC_FIREBASE_API_KEY
        ? {
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
            messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
          }
        : undefined,
    }),
    [],
  )

  const {
    permission,
    isLoading,
    diagnostic,
    requestPermission,
    checkStatus,
    isHelperThrottled,
    recordHelperUsage,
  } = useNotification({
    config,
    userId: resolveUserId(),
    onPermissionGranted: () => {
      setOpen(true)
    },
    onPermissionDenied: () => {
      setOpen(true)
    },
    onError: () => {
      setOpen(true)
    },
  })

  const hideHelpers = isHelperThrottled("tools_visible")

  // Check for user login/signup events
  useEffect(() => {
    const checkUserLogin = () => {
      const userData = localStorage.getItem("tivexx-user")
      const hasUser = userData && JSON.parse(userData).id

      if (hasUser && !userLoggedIn) {
        setUserLoggedIn(true)
        // Reset the throttle when user logs in/signs up
        localStorage.removeItem("notification-helper-tools_visible")
        setShowFloatingButtons(true)
      } else if (!hasUser && userLoggedIn) {
        setUserLoggedIn(false)
      }
    }

    checkUserLogin()

    // Listen for storage changes (login/logout events)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "tivexx-user") {
        checkUserLogin()
      }
    }

    window.addEventListener("storage", handleStorageChange)

    // Also check periodically for local changes
    const interval = setInterval(checkUserLogin, 1000)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      clearInterval(interval)
    }
  }, [userLoggedIn])

  useEffect(() => {
    if (hideHelpers && !userLoggedIn) return

    const timer = window.setTimeout(() => {
      setShowFloatingButtons(false)
      recordHelperUsage("tools_visible")
    }, 10_000) // Changed from 25_000 to 10_000 (10 seconds)

    return () => window.clearTimeout(timer)
  }, [hideHelpers, recordHelperUsage, userLoggedIn])

  const onEnable = async () => {
    await requestPermission()
    setOpen(true)
    recordHelperUsage("tools_visible")
  }

  const onCheck = async () => {
    await checkStatus()
    setOpen(true)
    recordHelperUsage("tools_visible")
  }

  if (hideHelpers && !userLoggedIn) {
    return (
      <NotificationPermissionPopup
        isOpen={open}
        permission={permission}
        diagnostic={diagnostic}
        onClose={() => setOpen(false)}
        onEnableNotifications={onEnable}
        onCheckStatus={onCheck}
        isLoading={isLoading}
        showHelperButtons={false}
      />
    )
  }

  return (
    <>
      {(!hideHelpers || userLoggedIn) && showFloatingButtons && (
        <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2">
          <Button 
            size="sm" 
            onClick={onEnable} 
            disabled={isLoading}
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold shadow-lg rounded-lg transition-colors"
          >
            Enable Notifications
          </Button>
          <Button size="sm" variant="outline" onClick={onCheck} disabled={isLoading}>
            Check Notification Status
          </Button>
        </div>
      )}
      <NotificationPermissionPopup
        isOpen={open}
        permission={permission}
        diagnostic={diagnostic}
        onClose={() => setOpen(false)}
        onEnableNotifications={onEnable}
        onCheckStatus={onCheck}
        isLoading={isLoading}
        showHelperButtons={!hideHelpers || userLoggedIn}
      />
    </>
  )
}

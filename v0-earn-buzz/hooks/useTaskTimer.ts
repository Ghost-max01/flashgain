import { useEffect } from "react"

export function useTaskTimer() {
  // Store task tracking in sessionStorage: { taskId: startTime }
  const STORAGE_KEY = "taskTimers"

  const startTaskTimer = (taskId: string) => {
    try {
      const timers = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}")
      timers[taskId] = Date.now()
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(timers))
    } catch (e) {
      console.error("Error storing task timer:", e)
    }
  }

  const attachFocusListener = (
    onTaskSuccess: (taskId: string, elapsed: number) => void,
    onTaskIncomplete: (taskId: string, elapsed: number) => void,
    isTaskCompleted: (taskId: string) => boolean
  ) => {
    // Track whether the page was actually hidden/blurred.
    // Initialise from current state so re-attachments while the page
    // is already in the background still work correctly.
    let pageWasHidden = document.hidden || !document.hasFocus()

    const processTimers = () => {
      // Only process when the user is genuinely RETURNING to the page
      if (!pageWasHidden) return
      pageWasHidden = false

      try {
        const timers = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}")
        if (!timers || Object.keys(timers).length === 0) return

        const now = Date.now()
        const tasksToDelete: string[] = []

        Object.entries(timers).forEach(([taskId, startTime]) => {
          const elapsed = now - (startTime as number)

          // Skip already-completed tasks
          if (isTaskCompleted(taskId)) {
            tasksToDelete.push(taskId)
            return
          }

          if (elapsed >= 20000) {
            // Task qualifies for completion (20+ seconds outside)
            onTaskSuccess(taskId, elapsed / 1000)
            tasksToDelete.push(taskId)
          } else {
            // Task incomplete — inform caller but KEEP the timer so UI
            // progress and active state remain (user may return later to finish)
            onTaskIncomplete(taskId, elapsed / 1000)
            // do NOT push to tasksToDelete: leave timer in sessionStorage
          }
        })

        // Remove completed/processed tasks from storage
        tasksToDelete.forEach((taskId) => {
          delete timers[taskId]
        })

        if (Object.keys(timers).length > 0) {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(timers))
        } else {
          sessionStorage.removeItem(STORAGE_KEY)
        }
      } catch (e) {
        console.error("Error processing task timers on return:", e)
      }
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        pageWasHidden = true
      } else {
        processTimers()
      }
    }

    const handleFocus = () => {
      // Fallback: some browsers fire focus but not visibilitychange
      processTimers()
    }

    const handleBlur = () => {
      pageWasHidden = true
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleFocus)
    window.addEventListener("blur", handleBlur)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
      window.removeEventListener("blur", handleBlur)
    }
  }

  return { startTaskTimer, attachFocusListener }
}

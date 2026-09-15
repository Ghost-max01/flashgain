import { useEffect } from "react"
import { safeParse } from "@/lib/safe-storage";

export const TASK_VISIT_SECONDS = 10;

const TIMER_KEY = "taskTimers";
const HIDDEN_KEY = "taskPageWasHidden";

function wasHidden(): boolean {
  try { return sessionStorage.getItem(HIDDEN_KEY) === "1"; } catch { return false; }
}
function setHidden(v: boolean) {
  try { sessionStorage.setItem(HIDDEN_KEY, v ? "1" : "0"); } catch {}
}

export function useTaskTimer() {
  const startTaskTimer = (taskId: string) => {
    try {
      const timers: Record<string, number> = safeParse(sessionStorage.getItem(TIMER_KEY), {});
      timers[taskId] = Date.now();
      sessionStorage.setItem(TIMER_KEY, JSON.stringify(timers));
    } catch (e) {
      console.error("Error storing task timer:", e);
    }
  };

  const attachFocusListener = (
    onTaskSuccess: (taskId: string, elapsed: number) => void,
    onTaskIncomplete: (taskId: string, elapsed: number) => void,
    isTaskCompleted: (taskId: string) => boolean
  ) => {
    let pageWasHidden = wasHidden() || document.hidden || !document.hasFocus();

    const processTimers = () => {
      if (!pageWasHidden) return;
      pageWasHidden = false;
      setHidden(false);

      try {
        const timers: Record<string, number> = safeParse(sessionStorage.getItem(TIMER_KEY), {});
        if (!timers || Object.keys(timers).length === 0) return;

        const now = Date.now();
        const tasksToDelete: string[] = [];

        Object.entries(timers).forEach(([taskId, startTime]) => {
          const elapsed = now - (startTime as number);
          if (isTaskCompleted(taskId)) {
            tasksToDelete.push(taskId);
            return;
          }
          if (elapsed >= TASK_VISIT_SECONDS * 1000) {
            onTaskSuccess(taskId, elapsed / 1000);
            tasksToDelete.push(taskId);
          } else {
            onTaskIncomplete(taskId, elapsed / 1000);
          }
        });

        tasksToDelete.forEach((taskId) => { delete timers[taskId]; });
        if (Object.keys(timers).length > 0) {
          sessionStorage.setItem(TIMER_KEY, JSON.stringify(timers));
        } else {
          sessionStorage.removeItem(TIMER_KEY);
        }
      } catch (e) {
        console.error("Error processing task timers on return:", e);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        pageWasHidden = true;
        setHidden(true);
      } else {
        processTimers();
      }
    };
    const handleFocus = () => { processTimers(); };
    const handleBlur = () => { pageWasHidden = true; setHidden(true); };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  };

  const processPendingOnMount = (
    onTaskSuccess: (taskId: string, elapsed: number) => void,
    onTaskIncomplete: (taskId: string, elapsed: number) => void,
    isTaskCompleted: (taskId: string) => boolean
  ) => {
    if (!wasHidden()) return false;
    setHidden(false);
    try {
      const timers: Record<string, number> = safeParse(sessionStorage.getItem(TIMER_KEY), {});
      if (!timers || Object.keys(timers).length === 0) return false;
      const now = Date.now();
      let processed = false;
      const tasksToDelete: string[] = [];
      Object.entries(timers).forEach(([taskId, startTime]) => {
        const elapsed = now - (startTime as number);
        if (isTaskCompleted(taskId)) { tasksToDelete.push(taskId); return; }
        if (elapsed >= TASK_VISIT_SECONDS * 1000) {
          onTaskSuccess(taskId, elapsed / 1000);
          tasksToDelete.push(taskId);
          processed = true;
        } else {
          onTaskIncomplete(taskId, elapsed / 1000);
        }
      });
      tasksToDelete.forEach((taskId) => { delete timers[taskId]; });
      if (Object.keys(timers).length > 0) sessionStorage.setItem(TIMER_KEY, JSON.stringify(timers));
      else sessionStorage.removeItem(TIMER_KEY);
      return processed;
    } catch { return false; }
  };

  return { startTaskTimer, attachFocusListener, processPendingOnMount };
}
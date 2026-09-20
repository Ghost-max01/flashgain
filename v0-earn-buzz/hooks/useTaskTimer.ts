import { safeParse } from "@/lib/safe-storage";

export const TASK_VISIT_SECONDS = 10;

const TIMER_KEY = "taskTimers";
const HIDDEN_KEY = "taskPageWasHidden";
// Incomplete ("came back too early") toasts are debounced per task so the
// 1s poll can never spam them — one notice per return at most.
const INCOMPLETE_DEBOUNCE_MS = 8000;
const lastIncompleteAt: Record<string, number> = {};

function wasHidden(): boolean {
  try { return sessionStorage.getItem(HIDDEN_KEY) === "1"; } catch { return false; }
}
function setHidden(v: boolean) {
  try { sessionStorage.setItem(HIDDEN_KEY, v ? "1" : "0"); } catch {}
}

// Timers live in localStorage (primary — survives reloads, back-navigation
// and PWA restarts) with a sessionStorage mirror for legacy readers.
function readTimers(): Record<string, number> {
  try {
    const raw = localStorage.getItem(TIMER_KEY);
    const parsed = safeParse(raw, null as any);
    if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
      return parsed as Record<string, number>;
    }
  } catch {}
  try {
    return safeParse(sessionStorage.getItem(TIMER_KEY), {});
  } catch {
    return {};
  }
}

function writeTimers(timers: Record<string, number>) {
  try {
    if (Object.keys(timers).length > 0) {
      localStorage.setItem(TIMER_KEY, JSON.stringify(timers));
    } else {
      localStorage.removeItem(TIMER_KEY);
    }
  } catch {}
  try {
    if (Object.keys(timers).length > 0) {
      sessionStorage.setItem(TIMER_KEY, JSON.stringify(timers));
    } else {
      sessionStorage.removeItem(TIMER_KEY);
    }
  } catch {}
}

export function useTaskTimer() {
  const processTimers = (
    onTaskSuccess: (taskId: string, elapsed: number) => void,
    onTaskIncomplete: (taskId: string, elapsed: number) => void,
    isTaskCompleted: (taskId: string) => boolean,
    opts?: { quietIncomplete?: boolean },
  ) => {
    try {
      const timers = readTimers();
      if (!timers || Object.keys(timers).length === 0) return false;

      const now = Date.now();
      const tasksToDelete: string[] = [];
      let processed = false;

      Object.entries(timers).forEach(([taskId, startTime]) => {
        const elapsed = now - (startTime as number);
        if (isTaskCompleted(taskId)) {
          tasksToDelete.push(taskId);
          return;
        }
        if (elapsed >= TASK_VISIT_SECONDS * 1000) {
          try { onTaskSuccess(taskId, elapsed / 1000); } catch {}
          tasksToDelete.push(taskId);
          processed = true;
        } else if (!opts?.quietIncomplete) {
          // Debounced: the 1s poll must never spam "too early" toasts.
          const last = lastIncompleteAt[taskId] || 0;
          if (now - last >= INCOMPLETE_DEBOUNCE_MS) {
            lastIncompleteAt[taskId] = now;
            try { onTaskIncomplete(taskId, elapsed / 1000); } catch {}
          }
        }
      });

      tasksToDelete.forEach((taskId) => { delete timers[taskId]; });
      writeTimers(timers);
      return processed;
    } catch (e) {
      console.error("Error processing task timers:", e);
      return false;
    }
  };

  const startTaskTimer = (taskId: string) => {
    try {
      const timers = readTimers();
      timers[taskId] = Date.now();
      writeTimers(timers);
      delete lastIncompleteAt[taskId];
    } catch (e) {
      console.error("Error storing task timer:", e);
    }
  };

  const attachFocusListener = (
    onTaskSuccess: (taskId: string, elapsed: number) => void,
    onTaskIncomplete: (taskId: string, elapsed: number) => void,
    isTaskCompleted: (taskId: string) => boolean
  ) => {
    const onReturn = () => { processTimers(onTaskSuccess, onTaskIncomplete, isTaskCompleted); };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setHidden(true);
      } else {
        onReturn();
      }
    };
    const handleFocus = () => { onReturn(); };
    const handleBlur = () => { setHidden(true); };
    const handlePageShow = () => { onReturn(); };
    // Poll for SUCCESS only: even if a focus/visibility event is missed
    // (background throttling, PWA webview quirks), a user who stayed 10s+
    // still gets credited the moment the page is visible again. Incomplete
    // notices fire only on real return events (debounced), never from here.
    const timerInterval = window.setInterval(() => {
      if (!document.hidden && document.hasFocus()) {
        processTimers(onTaskSuccess, onTaskIncomplete, isTaskCompleted, { quietIncomplete: true });
      }
    }, 1000);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("pageshow", handlePageShow);

    // Also process immediately in case the timer already expired while away.
    try { onReturn(); } catch {}

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("pageshow", handlePageShow);
      window.clearInterval(timerInterval);
    };
  };

  const processPendingOnMount = (
    onTaskSuccess: (taskId: string, elapsed: number) => void,
    onTaskIncomplete: (taskId: string, elapsed: number) => void,
    isTaskCompleted: (taskId: string) => boolean
  ) => {
    try {
      // Always process pending timers on mount — not only when the hidden
      // flag survived. Same-window navigation (location.href fallback) and
      // PWA restarts can lose the flag while the timer itself persists.
      setHidden(false);
      const timers = readTimers();
      if (!timers || Object.keys(timers).length === 0) return false;
      const now = Date.now();
      let processed = false;
      const tasksToDelete: string[] = [];
      Object.entries(timers).forEach(([taskId, startTime]) => {
        const elapsed = now - (startTime as number);
        if (isTaskCompleted(taskId)) { tasksToDelete.push(taskId); return; }
        if (elapsed >= TASK_VISIT_SECONDS * 1000) {
          try { onTaskSuccess(taskId, elapsed / 1000); } catch {}
          tasksToDelete.push(taskId);
          processed = true;
        } else {
          try { onTaskIncomplete(taskId, elapsed / 1000); } catch {}
        }
      });
      tasksToDelete.forEach((taskId) => { delete timers[taskId]; });
      writeTimers(timers);
      return processed;
    } catch { return false; }
  };

  return { startTaskTimer, attachFocusListener, processPendingOnMount };
}

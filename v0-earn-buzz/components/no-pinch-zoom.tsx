"use client";

import { useEffect } from "react";

// Global pinch/zoom lock: blocks two-finger squeeze/stretch (Safari
// gesturestart + generic two-touch move), ctrl/cmd+wheel zoom, and
// double-tap zoom — while keeping normal scrolling/tapping intact.
export function NoPinchZoom() {
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();

    const onGesture = (e: Event) => e.preventDefault();
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault();
    };
    const onTouchMove = (e: TouchEvent) => {
      // Two+ fingers = pinch squeeze/stretch → block zoom, allow 1-finger scroll.
      if (e.touches && e.touches.length > 1) e.preventDefault();
    };
    const onTouchEnd = (e: TouchEvent) => {
      // iOS double-tap zoom guard: kill rapid second tap zoom (<300ms).
      try {
        const now = Date.now();
        const last = (window as any).__lastTouchEnd || 0;
        if (now - last < 300) e.preventDefault();
        (window as any).__lastTouchEnd = now;
      } catch {}
    };
    const onDblClick = (e: MouseEvent) => e.preventDefault();
    const onKey = (e: KeyboardEvent) => {
      // ctrl/cmd + (+/-/0) browser zoom shortcuts.
      if ((e.ctrlKey || e.metaKey) && ["+", "-", "=", "0"].includes(e.key)) e.preventDefault();
    };

    document.addEventListener("gesturestart", onGesture as EventListener, { passive: false });
    document.addEventListener("gesturechange", onGesture as EventListener, { passive: false });
    document.addEventListener("gestureend", onGesture as EventListener, { passive: false });
    // Double-tap zoom emits dblclick — prevent it globally.
    document.addEventListener("dblclick", onDblClick as EventListener, { passive: false });
    window.addEventListener("wheel", onWheel, { passive: false });
    // touchmove must be non-passive to be cancelable for pinch only.
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: false });
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("gesturestart", onGesture as EventListener);
      document.removeEventListener("gesturechange", onGesture as EventListener);
      document.removeEventListener("gestureend", onGesture as EventListener);
      document.removeEventListener("dblclick", onDblClick as EventListener);
      window.removeEventListener("wheel", onWheel);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("keydown", onKey);
      void prevent;
    };
  }, []);

  return null;
}

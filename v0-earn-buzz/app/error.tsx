"use client";

import { useEffect } from "react";
import { sanitizeCorruptedStorage } from "@/lib/safe-storage";

/**
 * Root error boundary — previously missing, so ANY client-side throw on
 * landing / non-dashboard routes rendered the dead Next.js
 * "Application error: a client-side exception has occurred" page.
 * Now: drop corrupted storage, then offer a clean retry.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[root-error]", error);
    sanitizeCorruptedStorage();
  }, [error]);

  const hardReset = () => {
    try {
      sanitizeCorruptedStorage();
      if ("caches" in window) {
        void caches.keys().then((ks) => ks.forEach((k) => void caches.delete(k)));
      }
      void navigator.serviceWorker
        ?.getRegistrations()
        .then((rs) => rs.forEach((r) => void r.unregister()));
    } catch {}
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h2 className="text-lg font-black">Something didn&apos;t load right</h2>
      <p className="text-sm opacity-60 mt-2 max-w-md">
        A stale cache or saved value blocked this page. Your account is fine — reload clean to continue.
      </p>
      <button
        onClick={() => reset()}
        className="mt-4 px-6 py-3 rounded-full bg-emerald-500 text-white font-black"
      >
        Try again
      </button>
      <button onClick={hardReset} className="mt-2 text-xs underline opacity-50">
        Clear cache &amp; reload
      </button>
      {error?.message && (
        <p className="text-[11px] opacity-30 mt-3 break-all max-w-md">{error.message}</p>
      )}
    </div>
  );
}

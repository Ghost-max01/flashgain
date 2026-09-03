"use client";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <h2 className="text-lg font-black text-white">Dashboard hit a hiccup</h2>
      <p className="text-sm text-white/60 mt-2 max-w-md">We recovered from a stale cache. Tap below to reload clean.</p>
      <button onClick={() => reset()} className="mt-4 px-6 py-3 rounded-full bg-emerald-500 text-white font-black">Reload dashboard</button>
      <button
        onClick={() => {
          try {
            if ("caches" in window) caches.keys().then(ks => ks.forEach(k => caches.delete(k)));
            navigator.serviceWorker?.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
          } catch {}
          window.location.reload();
        }}
        className="mt-2 text-xs text-white/50 underline"
      >
        Hard clear cache & reload
      </button>
      {error?.message && <p className="text-[11px] text-white/30 mt-3 break-all">{error.message}</p>}
    </div>
  );
}

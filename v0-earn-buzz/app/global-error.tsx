"use client";

/**
 * Last-resort boundary for throws inside the root layout itself.
 * Must define its own <html>/<body> and use inline styles (global CSS
 * is not guaranteed to be applied here).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const hardReset = () => {
    try {
      if ("caches" in window) {
        void caches.keys().then((ks) => ks.forEach((k) => void caches.delete(k)));
      }
      const nav = window.navigator as Navigator & {
        serviceWorker?: { getRegistrations: () => Promise<{ unregister: () => void }[]> };
      };
      void nav.serviceWorker
        ?.getRegistrations()
        .then((rs) => rs.forEach((r) => void r.unregister()));
    } catch {}
    window.location.reload();
  };

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            textAlign: "center",
            background: "#f6f7fb",
            color: "#111",
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>Something didn&apos;t load right</h2>
          <p style={{ fontSize: 14, opacity: 0.6, maxWidth: 420 }}>
            A stale cache blocked this page. Your account is fine — reload clean to continue.
          </p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: 16,
              padding: "12px 24px",
              borderRadius: 999,
              border: 0,
              background: "#10b981",
              color: "#fff",
              fontWeight: 800,
            }}
          >
            Try again
          </button>
          <button
            onClick={hardReset}
            style={{ marginTop: 8, fontSize: 12, textDecoration: "underline", opacity: 0.5, background: "none", border: 0 }}
          >
            Clear cache &amp; reload
          </button>
          {error?.message && (
            <p style={{ fontSize: 11, opacity: 0.3, marginTop: 12, wordBreak: "break-all", maxWidth: 420 }}>
              {error.message}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}

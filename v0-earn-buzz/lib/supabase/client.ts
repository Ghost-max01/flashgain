import { createBrowserClient } from "@supabase/ssr";

function makeClient() {
  // Only create the browser client when running in the browser.
  if (typeof window === "undefined") return null

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // NEVER throw at module import: that would crash every page that imports
    // this module with an unrecoverable client-side exception. Pages already
    // null-check `supabase` (e.g. landing shows the homepage when null).
    if (typeof window !== "undefined") {
      console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in the runtime environment");
    }
    return null
  }

  return createBrowserClient(url, key)
}

export const supabase = makeClient();

// Copy this file to config/env.js and fill in your own values.
// config/env.js is gitignored — it never gets pushed to GitHub.
//
// SUPABASE_URL and SUPABASE_ANON_KEY are safe to expose in the browser.
// The anon key only grants what your Row Level Security policies allow —
// it is NOT the same as the service-role key, which must never appear here.
//
// The AI_API_KEY is NOT set here. It lives only on the server
// (Vercel environment variables) and is read by api/flowmate-ai.js.
// The browser never sees it.

window.FLOWMATE_CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR-SUPABASE-ANON-PUBLIC-KEY"
};

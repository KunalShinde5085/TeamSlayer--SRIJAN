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
//
// DEMO_MODE: set to true to auto-load sample tasks/routines for a fresh
// workspace (handy for demos). Leave false/omitted for real use — v2
// no longer seeds fake data automatically (see js/demo.js).

window.FLOWMATE_CONFIG = {
  SUPABASE_URL: "https://mgojwbybuxmhznytseyk.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_KOtDsSYBmWOOzR2pCbZv1w_TfIhCtnl",
   GEMINI_API_KEY: "AQ.Ab8RN6J6oF28TZAFrlaK7nsF00ZytGln97S6D9pYoERS7_3A1Q",
  DEMO_MODE: false
};

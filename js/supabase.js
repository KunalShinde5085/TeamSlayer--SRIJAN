// js/supabase.js
// Initializes the Supabase client from config/env.js.
// Only the public anon key is used here — never the service-role key.

let supabaseClient = null;
let supabaseReady = false;

function initSupabase() {
  const cfg = window.FLOWMATE_CONFIG;
  if (!cfg || !cfg.SUPABASE_URL || cfg.SUPABASE_URL.includes("YOUR-PROJECT")) {
    console.warn("[FlowMate] Supabase is not configured yet — running in local demo mode. " +
      "Copy config/env.example.js to config/env.js and add your project's URL and anon key.");
    supabaseReady = false;
    return null;
  }
  try {
    supabaseClient = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    supabaseReady = true;
    return supabaseClient;
  } catch (err) {
    console.error("[FlowMate] Failed to initialize Supabase:", err);
    supabaseReady = false;
    return null;
  }
}

function isSupabaseReady() {
  return supabaseReady;
}

function getSupabase() {
  return supabaseClient;
}

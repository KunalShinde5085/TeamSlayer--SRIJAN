// js/utils/storage.js
// Wraps localStorage so offline/local-mode data (tasks, routines,
// notifications, team) survives a page reload instead of vanishing.
// Every store falls back to this when Supabase isn't configured.

const LocalStorage = (() => {
  const PREFIX = "flowmate_";

  function get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (err) {
      console.warn("[FlowMate] Failed to read local storage key:", key, err);
      return fallback;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn("[FlowMate] Failed to write local storage key:", key, err);
      return false;
    }
  }

  function remove(key) {
    localStorage.removeItem(PREFIX + key);
  }

  function clear() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => localStorage.removeItem(k));
  }

  // Bundles everything local into one downloadable JSON blob.
  function exportData() {
    return {
      exported_at: new Date().toISOString(),
      tasks: get("tasks", []),
      routines: get("routines", []),
      notifications: get("notifications", []),
      team: get("team", []),
      settings: get("settings", {})
    };
  }

  function importData(data) {
    if (!data || typeof data !== "object") throw new Error("Invalid backup file.");
    if (data.tasks) set("tasks", data.tasks);
    if (data.routines) set("routines", data.routines);
    if (data.notifications) set("notifications", data.notifications);
    if (data.team) set("team", data.team);
    if (data.settings) set("settings", data.settings);
  }

  return { get, set, remove, clear, exportData, importData };
})();

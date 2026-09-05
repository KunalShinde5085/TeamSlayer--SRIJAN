// js/stores/routine-store.js
// CRUD for recurring routines, plus a "next occurrence" calculator.
// Persisted to localStorage in local mode (previously an in-memory array
// that reset on every reload). Still no server-side scheduler — see
// docs/SETUP.md and README_V2.md for what that would take.

const RoutineStore = (() => {
  const KEY = "routines";

  function loadLocal() { return LocalStorage.get(KEY, []); }
  function saveLocal(routines) { LocalStorage.set(KEY, routines); }
  function nextLocalId(routines) {
    const maxSeq = routines.reduce((max, r) => {
      const n = String(r.id).startsWith("local-") ? parseInt(r.id.split("-")[1], 10) || 0 : 0;
      return Math.max(max, n);
    }, 0);
    return "local-" + (maxSeq + 1);
  }

  async function createRoutine({ title, description = "", frequency = "daily", time = "09:00" }) {
    const err = Validate.routine({ title, frequency, time });
    if (err) throw new Error(err);

    if (isSupabaseReady()) {
      const sb = getSupabase();
      const { data, error } = await sb.from("routines").insert({
        title: title.trim(), description, frequency, scheduled_time: time, enabled: true
      }).select().single();
      if (error) throw error;
      return data;
    }
    const routines = loadLocal();
    const routine = { id: nextLocalId(routines), title: title.trim(), description, frequency, scheduled_time: time, enabled: true, created_at: new Date().toISOString() };
    routines.unshift(routine);
    saveLocal(routines);
    return routine;
  }

  async function getRoutines() {
    if (isSupabaseReady()) {
      const sb = getSupabase();
      const { data, error } = await sb.from("routines").select("*").eq("enabled", true).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
    return loadLocal().filter(r => r.enabled);
  }

  async function setEnabled(id, enabled) {
    if (isSupabaseReady() && !String(id).startsWith("local-")) {
      const sb = getSupabase();
      const { error } = await sb.from("routines").update({ enabled }).eq("id", id);
      if (error) throw error;
      return;
    }
    const routines = loadLocal();
    const r = routines.find(x => x.id === id);
    if (r) r.enabled = enabled;
    saveLocal(routines);
  }

  async function deleteRoutine(id) {
    if (isSupabaseReady() && !String(id).startsWith("local-")) {
      const sb = getSupabase();
      const { error } = await sb.from("routines").delete().eq("id", id);
      if (error) throw error;
      return;
    }
    saveLocal(loadLocal().filter(r => r.id !== id));
  }

  // Returns a human label for when this routine next fires, e.g. "Tomorrow, 9:00 AM"
  function nextOccurrence(routine) {
    const now = new Date();
    const [h, m] = (routine.scheduled_time || "09:00:00").split(":").map(Number);
    const next = new Date(now);
    next.setHours(h, m || 0, 0, 0);

    if (routine.frequency === "daily" || routine.frequency === "weekdays") {
      if (next <= now) next.setDate(next.getDate() + 1);
      if (routine.frequency === "weekdays") {
        while (next.getDay() === 0 || next.getDay() === 6) next.setDate(next.getDate() + 1);
      }
    } else if (routine.frequency === "weekly") {
      if (next <= now) next.setDate(next.getDate() + 7);
    } else if (routine.frequency === "monthly") {
      if (next <= now) next.setMonth(next.getMonth() + 1);
    }

    const isToday = next.toDateString() === now.toDateString();
    const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
    const isTomorrow = next.toDateString() === tomorrow.toDateString();
    const dayLabel = isToday ? "Today" : isTomorrow ? "Tomorrow" : next.toLocaleDateString(undefined, { weekday: "long" });
    const timeLabel = next.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return `${dayLabel}, ${timeLabel}`;
  }

  function seedLocal(seedRoutines) {
    if (isSupabaseReady()) return;
    const routines = loadLocal();
    if (routines.length > 0) return;
    seedRoutines.forEach(r => routines.unshift({ id: nextLocalId(routines), ...r }));
    saveLocal(routines);
  }

  return { createRoutine, getRoutines, setEnabled, deleteRoutine, nextOccurrence, seedLocal };
})();

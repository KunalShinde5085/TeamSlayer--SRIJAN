// js/routines.js
// CRUD for recurring routines, plus a simple "next occurrence" calculator.
// No cron/scheduling engine here on purpose — see docs/SETUP.md for why.

const RoutineStore = (() => {
  let localRoutines = [];
  let localSeq = 1;

  async function createRoutine({ title, description = "", frequency = "daily", time = "09:00" }) {
    if (isSupabaseReady()) {
      const sb = getSupabase();
      const { data, error } = await sb.from("routines").insert({
        title, description, frequency, scheduled_time: time, enabled: true
      }).select().single();
      if (error) throw error;
      return data;
    }
    const routine = { id: "local-" + (localSeq++), title, description, frequency, scheduled_time: time, enabled: true, created_at: new Date().toISOString() };
    localRoutines.push(routine);
    return routine;
  }

  async function getRoutines() {
    if (isSupabaseReady()) {
      const sb = getSupabase();
      const { data, error } = await sb.from("routines").select("*").eq("enabled", true).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
    return [...localRoutines].reverse();
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
    if (!isSupabaseReady() && localRoutines.length === 0) {
      seedRoutines.forEach(r => localRoutines.push({ id: "local-" + (localSeq++), ...r }));
    }
  }

  return { createRoutine, getRoutines, nextOccurrence, seedLocal };
})();

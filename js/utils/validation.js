// js/utils/validation.js
// Small, dependency-free validators shared by the manual task modal, the
// routine form, and the code that commits AI Inbox output — so an AI
// hallucination (a 400-character title, a garbage date) can't reach the
// store any more easily than a bad manual entry can.

const Validate = (() => {
  function title(value) {
    const v = (value || "").trim();
    if (!v) return "A title is required.";
    if (v.length > 200) return "Title must be under 200 characters.";
    return null;
  }

  function date(value) {
    if (!value) return null; // dates are optional
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Date must be in YYYY-MM-DD format.";
    const d = new Date(value + "T00:00:00");
    if (Number.isNaN(d.getTime())) return "That date isn't valid.";
    return null;
  }

  function priority(value) {
    if (!["low", "normal", "high"].includes(value)) return "Priority must be low, normal, or high.";
    return null;
  }

  function email(value) {
    if (!value) return null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "That doesn't look like a valid email.";
    return null;
  }

  function routine(r) {
    if (!r.title || !r.title.trim()) return "A routine needs a title.";
    if (!["daily", "weekly", "weekdays", "monthly"].includes(r.frequency)) return "Unknown routine frequency.";
    if (r.time && !/^\d{2}:\d{2}$/.test(r.time)) return "Time must be in HH:MM format.";
    return null;
  }

  // Runs a validator and throws if it fails — convenient at call sites
  // that just want to bail out with a clear message.
  function assert(validator, value, label) {
    const err = validator(value);
    if (err) throw new Error(err);
  }

  return { title, date, priority, email, routine, assert };
})();

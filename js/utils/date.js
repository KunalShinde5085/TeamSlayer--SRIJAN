// js/utils/date.js
// Centralized date handling. Everything here works in LOCAL time, not UTC,
// because `new Date().toISOString()` silently shifts to UTC and can make a
// task due "today" in India look overdue (or vice-versa). Do not scatter
// date math across other files — put it here instead.

const DateUtil = (() => {
  // Returns today as YYYY-MM-DD in the browser's local timezone.
  function getLocalDate(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // A task is overdue if it isn't completed/cancelled and its due date has
  // passed, compared using local midnight boundaries (not UTC).
  function isTaskOverdue(task) {
    if (!task || !task.due_date) return false;
    if (task.status === "completed" || task.status === "cancelled") return false;
    return task.due_date < getLocalDate();
  }

  function daysUntilDue(dueDate) {
    if (!dueDate) return null;
    const [y, m, d] = dueDate.split("-").map(Number);
    const due = new Date(y, m - 1, d);
    const [ty, tm, td] = getLocalDate().split("-").map(Number);
    const today = new Date(ty, tm - 1, td);
    return Math.round((due - today) / 86400000);
  }

  // Human label for a due date: "Today", "Tomorrow", "Overdue", or a short weekday/date.
  function formatTaskDate(dueDate, status) {
    if (!dueDate) return "No deadline";
    const diff = daysUntilDue(dueDate);
    if (status !== "completed" && status !== "cancelled" && diff < 0) return "Overdue";
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    const [y, m, d] = dueDate.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  }

  function addDays(n, from = getLocalDate()) {
    const [y, m, d] = from.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + n);
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  }

  return { getLocalDate, isTaskOverdue, daysUntilDue, formatTaskDate, addDays };
})();

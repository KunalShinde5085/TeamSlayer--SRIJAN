// js/notifications.js
// Two layers, as required: in-app notifications (always work, stored in
// Supabase or locally) and browser push notifications (best-effort, never
// required for the app to function).

const NotificationStore = (() => {
  let localNotifs = [];
  let localSeq = 1;
  const sentKeys = new Set(); // de-dupe guard: `${type}:${taskId}`

  async function create({ type, title, message = "", taskId = null }) {
    const key = `${type}:${taskId || title}`;
    if (sentKeys.has(key)) return null; // avoid duplicate spam
    sentKeys.add(key);

    let record;
    if (isSupabaseReady()) {
      const sb = getSupabase();
      const { data, error } = await sb.from("notifications").insert({
        type, title, message, task_id: (taskId && !String(taskId).startsWith("local-")) ? taskId : null
      }).select().single();
      if (error) { console.error("[FlowMate] notification insert failed:", error); record = { id: "local-" + (localSeq++), type, title, message, is_read: false, created_at: new Date().toISOString() }; }
      else record = data;
    } else {
      record = { id: "local-" + (localSeq++), type, title, message, is_read: false, created_at: new Date().toISOString() };
      localNotifs.unshift(record);
    }

    if (isSupabaseReady() && record) localNotifs.unshift(record); // keep a fast local cache either way
    showBrowserNotification(title, message);
    return record;
  }

  async function getAll() {
    if (isSupabaseReady()) {
      const sb = getSupabase();
      const { data, error } = await sb.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
      if (!error) return data;
    }
    return localNotifs;
  }

  function requestBrowserPermission() {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => { /* silently ignore */ });
    }
  }

  function showBrowserNotification(title, body) {
    if (!("Notification" in window)) return; // API unavailable — in-app list still works
    if (Notification.permission !== "granted") return; // not granted — in-app list still works
    try { new Notification("🔔 FlowMate — " + title, { body }); }
    catch (err) { console.warn("[FlowMate] Browser notification failed:", err); }
  }

  // Scans tasks and raises the appropriate notifications, without duplicates.
  async function checkDeadlines(tasks) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (const t of tasks) {
      if (t.status === "completed" || !t.due_date) continue;
      const due = new Date(t.due_date); due.setHours(0, 0, 0, 0);
      const diffDays = Math.round((due - today) / 86400000);
      if (diffDays < 0 && t.status !== "overdue") {
        await create({ type: "task_overdue", title: t.title + " is overdue", message: "Was due " + t.due_date, taskId: t.id });
      } else if (diffDays === 0 || diffDays === 1) {
        await create({ type: "deadline_approaching", title: t.title + " is due soon", message: diffDays === 0 ? "Due today" : "Due tomorrow", taskId: t.id });
      }
    }
  }

  return { create, getAll, requestBrowserPermission, showBrowserNotification, checkDeadlines };
})();

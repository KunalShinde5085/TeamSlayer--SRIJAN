// js/stores/notification-store.js
// Two layers: in-app notifications (stored in Supabase or localStorage,
// always work) and browser push notifications (best-effort, never
// required). The de-dupe guard (`sentKeys`) now persists to localStorage
// too — previously it was an in-memory Set that reset on every reload,
// so closing and reopening the tab could recreate the same reminder.

const NotificationStore = (() => {
  const KEY = "notifications";
  const SENT_KEY = "sent_notification_keys";

  function loadLocal() { return LocalStorage.get(KEY, []); }
  function saveLocal(notifs) { LocalStorage.set(KEY, notifs.slice(0, 100)); }
  function loadSentKeys() { return new Set(LocalStorage.get(SENT_KEY, [])); }
  function saveSentKeys(set) { LocalStorage.set(SENT_KEY, Array.from(set)); }
  function nextLocalId(notifs) {
    const maxSeq = notifs.reduce((max, n) => {
      const m = String(n.id).startsWith("local-") ? parseInt(n.id.split("-")[1], 10) || 0 : 0;
      return Math.max(max, m);
    }, 0);
    return "local-" + (maxSeq + 1);
  }

  async function create({ type, title, message = "", taskId = null }) {
    const key = `${type}:${taskId || title}`;
    const sentKeys = loadSentKeys();
    if (sentKeys.has(key)) return null; // avoid duplicate spam, even across reloads
    sentKeys.add(key);
    saveSentKeys(sentKeys);

    let record;
    if (isSupabaseReady()) {
      const sb = getSupabase();
      const { data, error } = await sb.from("notifications").insert({
        type, title, message, task_id: (taskId && !String(taskId).startsWith("local-")) ? taskId : null
      }).select().single();
      if (error) {
        console.error("[FlowMate] notification insert failed:", error);
        record = { id: "local-" + Date.now(), type, title, message, is_read: false, created_at: new Date().toISOString() };
      } else {
        record = data;
      }
    } else {
      const notifs = loadLocal();
      record = { id: nextLocalId(notifs), type, title, message, is_read: false, created_at: new Date().toISOString() };
      notifs.unshift(record);
      saveLocal(notifs);
    }

    showBrowserNotification(title, message);
    return record;
  }

  async function getAll() {
    if (isSupabaseReady()) {
      const sb = getSupabase();
      const { data, error } = await sb.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
      if (!error) return data;
    }
    return loadLocal();
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
  // Uses DateUtil so overdue/approaching is computed from local time, not UTC.
  async function checkDeadlines(tasks) {
    for (const t of tasks) {
      if (t.status === "completed" || t.status === "cancelled" || !t.due_date) continue;
      const diffDays = DateUtil.daysUntilDue(t.due_date);
      if (diffDays < 0) {
        await create({ type: "task_overdue", title: t.title + " is overdue", message: "Was due " + t.due_date, taskId: t.id });
      } else if (diffDays === 0 || diffDays === 1) {
        await create({ type: "deadline_approaching", title: t.title + " is due soon", message: diffDays === 0 ? "Due today" : "Due tomorrow", taskId: t.id });
      }
    }
  }

  return { create, getAll, requestBrowserPermission, showBrowserNotification, checkDeadlines };
})();

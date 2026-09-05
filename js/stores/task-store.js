// js/stores/task-store.js
// CRUD for tasks. Writes to Supabase when configured; otherwise persists
// to localStorage (via LocalStorage) so local-mode data survives a reload
// instead of resetting to an empty array every time.
//
// Status is now one of: pending, in_progress, completed, cancelled.
// "Overdue" is NOT a status — it's computed from due_date (see
// js/utils/date.js#isTaskOverdue), so a task can be in_progress AND
// overdue at the same time instead of losing its workflow state.

const TaskStore = (() => {
  const KEY = "tasks";

  function loadLocal() { return LocalStorage.get(KEY, []); }
  function saveLocal(tasks) { LocalStorage.set(KEY, tasks); }
  function nextLocalId(tasks) {
    const maxSeq = tasks.reduce((max, t) => {
      const n = String(t.id).startsWith("local-") ? parseInt(t.id.split("-")[1], 10) || 0 : 0;
      return Math.max(max, n);
    }, 0);
    return "local-" + (maxSeq + 1);
  }

  async function createTask({ title, description = "", assigneeName = "You", dueDate = null, priority = "normal", source = "manual" }) {
    const titleErr = Validate.title(title);
    if (titleErr) throw new Error(titleErr);
    if (dueDate) { const d = Validate.date(dueDate); if (d) throw new Error(d); }

    if (isSupabaseReady()) {
      const sb = getSupabase();
      const assignee = await TeamStore.findOrCreateByName(assigneeName);
      const { data, error } = await sb.from("tasks").insert({
        title: title.trim(), description, assignee_id: assignee ? assignee.id : null,
        due_date: dueDate, priority, status: "pending", source
      }).select().single();
      if (error) throw error;
      return normalizeTask(data, assigneeName);
    }

    const assignee = await TeamStore.findOrCreateByName(assigneeName);
    const tasks = loadLocal();
    const task = {
      id: nextLocalId(tasks), title: title.trim(), description,
      assigneeId: assignee ? assignee.id : null, assigneeName: assignee ? assignee.name : "Unassigned",
      due_date: dueDate, priority, status: "pending", source, completed_at: null, created_at: new Date().toISOString()
    };
    tasks.unshift(task);
    saveLocal(tasks);
    return task;
  }

  async function getTasks() {
    let tasks;
    if (isSupabaseReady()) {
      const sb = getSupabase();
      const { data, error } = await sb.from("tasks").select("*, team_members(name)").order("created_at", { ascending: false });
      if (error) throw error;
      tasks = data.map(t => normalizeTask(t, t.team_members ? t.team_members.name : "Unassigned"));
    } else {
      tasks = [...loadLocal()];
    }
    // Attach the computed overdue flag without mutating stored status.
    return tasks.map(t => ({ ...t, is_overdue: DateUtil.isTaskOverdue(t) }));
  }

  async function updateTask(id, patch) {
    if (patch.title !== undefined) { const e = Validate.title(patch.title); if (e) throw new Error(e); }
    if (patch.due_date) { const e = Validate.date(patch.due_date); if (e) throw new Error(e); }

    if (isSupabaseReady() && !String(id).startsWith("local-")) {
      const sb = getSupabase();
      const dbPatch = { ...patch };
      delete dbPatch.assigneeName; delete dbPatch.assigneeId;
      const { error } = await sb.from("tasks").update(dbPatch).eq("id", id);
      if (error) throw error;
      return;
    }
    const tasks = loadLocal();
    const t = tasks.find(x => x.id === id);
    if (t) Object.assign(t, patch);
    saveLocal(tasks);
  }

  async function updateTaskStatus(id, status) {
    const completed_at = status === "completed" ? new Date().toISOString() : null;
    await updateTask(id, { status, completed_at });
  }

  async function reassignTask(id, assigneeName) {
    const assignee = await TeamStore.findOrCreateByName(assigneeName);
    if (isSupabaseReady() && !String(id).startsWith("local-")) {
      const sb = getSupabase();
      const { error } = await sb.from("tasks").update({ assignee_id: assignee.id }).eq("id", id);
      if (error) throw error;
      return;
    }
    const tasks = loadLocal();
    const t = tasks.find(x => x.id === id);
    if (t) { t.assigneeId = assignee.id; t.assigneeName = assignee.name; }
    saveLocal(tasks);
  }

  async function updateDueDate(id, dueDate) {
    await updateTask(id, { due_date: dueDate });
  }

  async function deleteTask(id) {
    if (isSupabaseReady() && !String(id).startsWith("local-")) {
      const sb = getSupabase();
      const { error } = await sb.from("tasks").delete().eq("id", id);
      if (error) throw error;
      return;
    }
    saveLocal(loadLocal().filter(x => x.id !== id));
  }

  function normalizeTask(row, assigneeName) {
    return {
      id: row.id, title: row.title, description: row.description,
      assigneeId: row.assignee_id, assigneeName: assigneeName || "Unassigned", due_date: row.due_date,
      priority: row.priority, status: row.status, source: row.source,
      completed_at: row.completed_at, created_at: row.created_at
    };
  }

  // Used only by js/demo.js, and only when FLOWMATE_CONFIG.DEMO_MODE is on.
  function seedLocal(seedTasks) {
    if (isSupabaseReady()) return;
    const tasks = loadLocal();
    if (tasks.length > 0) return;
    seedTasks.forEach(s => tasks.unshift({ id: nextLocalId(tasks), ...s }));
    saveLocal(tasks);
  }

  return { createTask, getTasks, updateTask, updateTaskStatus, reassignTask, updateDueDate, deleteTask, seedLocal };
})();

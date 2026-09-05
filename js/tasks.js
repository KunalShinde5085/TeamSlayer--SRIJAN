// js/tasks.js
// CRUD for tasks. Writes to Supabase when configured; falls back to an
// in-memory array so the demo still works with zero setup.

const TaskStore = (() => {
  let localTasks = [];
  let localSeq = 1;

  function localId() { return "local-" + (localSeq++); }

  async function createTask({ title, description = "", assigneeName = "You", dueDate = null, priority = "normal", source = "manual" }) {
    if (isSupabaseReady()) {
      const sb = getSupabase();
      const assignee = await findOrCreateTeamMember(assigneeName);
      const { data, error } = await sb.from("tasks").insert({
        title, description, assignee_id: assignee ? assignee.id : null,
        due_date: dueDate, priority, status: "pending", source
      }).select().single();
      if (error) throw error;
      return normalizeTask(data, assigneeName);
    }
    const task = {
      id: localId(), title, description, assigneeName, due_date: dueDate,
      priority, status: "pending", source, completed_at: null, created_at: new Date().toISOString()
    };
    localTasks.push(task);
    return task;
  }

  async function getTasks() {
    if (isSupabaseReady()) {
      const sb = getSupabase();
      const { data, error } = await sb.from("tasks").select("*, team_members(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(t => normalizeTask(t, t.team_members ? t.team_members.name : "Unassigned"));
    }
    return [...localTasks].reverse();
  }

  async function updateTaskStatus(id, status) {
    const completed_at = status === "completed" ? new Date().toISOString() : null;
    if (isSupabaseReady() && !String(id).startsWith("local-")) {
      const sb = getSupabase();
      const { error } = await sb.from("tasks").update({ status, completed_at }).eq("id", id);
      if (error) throw error;
      return;
    }
    const t = localTasks.find(x => x.id === id);
    if (t) { t.status = status; t.completed_at = completed_at; }
  }

  async function reassignTask(id, assigneeName) {
    if (isSupabaseReady() && !String(id).startsWith("local-")) {
      const sb = getSupabase();
      const assignee = await findOrCreateTeamMember(assigneeName);
      const { error } = await sb.from("tasks").update({ assignee_id: assignee.id }).eq("id", id);
      if (error) throw error;
      return;
    }
    const t = localTasks.find(x => x.id === id);
    if (t) t.assigneeName = assigneeName;
  }

  async function updateDueDate(id, dueDate) {
    if (isSupabaseReady() && !String(id).startsWith("local-")) {
      const sb = getSupabase();
      const { error } = await sb.from("tasks").update({ due_date: dueDate, status: "pending" }).eq("id", id);
      if (error) throw error;
      return;
    }
    const t = localTasks.find(x => x.id === id);
    if (t) { t.due_date = dueDate; t.status = "pending"; }
  }

  async function markOverdue(ids) {
    if (isSupabaseReady()) {
      const realIds = ids.filter(id => !String(id).startsWith("local-"));
      if (realIds.length) {
        const sb = getSupabase();
        await sb.from("tasks").update({ status: "overdue" }).in("id", realIds);
      }
    }
    localTasks.filter(t => ids.includes(t.id)).forEach(t => t.status = "overdue");
  }

  async function deleteTask(id) {
    if (isSupabaseReady() && !String(id).startsWith("local-")) {
      const sb = getSupabase();
      const { error } = await sb.from("tasks").delete().eq("id", id);
      if (error) throw error;
      return;
    }
    localTasks = localTasks.filter(x => x.id !== id);
  }

  async function findOrCreateTeamMember(name) {
    const sb = getSupabase();
    let { data } = await sb.from("team_members").select("*").eq("name", name).maybeSingle();
    if (data) return data;
    const { data: created, error } = await sb.from("team_members").insert({ name }).select().single();
    if (error) throw error;
    return created;
  }

  function normalizeTask(row, assigneeName) {
    return {
      id: row.id, title: row.title, description: row.description,
      assigneeName: assigneeName || "Unassigned", due_date: row.due_date,
      priority: row.priority, status: row.status, source: row.source,
      completed_at: row.completed_at, created_at: row.created_at
    };
  }

  function seedLocal(seedTasks) {
    if (!isSupabaseReady() && localTasks.length === 0) {
      seedTasks.forEach(s => localTasks.push({ id: localId(), ...s }));
    }
  }

  return { createTask, getTasks, updateTaskStatus, reassignTask, updateDueDate, markOverdue, deleteTask, seedLocal };
})();

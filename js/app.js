// js/app.js
// Orchestrates the UI: wires nav, the AI Inbox, the task modal, team
// management, and rendering. CRUD logic itself lives in js/stores/*;
// this file is the "glue", kept deliberately thinner than v1's 337-line
// single file now that tasks/routines/notifications/team have their own
// modules.

let cachedTasks = [];
let cachedRoutines = [];
let cachedNotifs = [];
let cachedTeam = [];
let taskFilters = { search: "", status: "all", priority: "all", assignee: "all", sort: "due_date" };

document.addEventListener("DOMContentLoaded", async () => {
  initSupabase();
  wireNav();
  wireInbox();
  wireBehindButton();
  wireTaskModalTriggers();
  wireTeamForm();
  wireFilters();
  NotificationStore.requestBrowserPermission();

  if (await Demo.isEnabled()) await Demo.seed();
  await refreshAll();
});

/* ---------------- data refresh + render ---------------- */
async function refreshAll() {
  try {
    cachedTeam = await TeamStore.getMembers();
    cachedTasks = await TaskStore.getTasks();
    cachedRoutines = await RoutineStore.getRoutines();
    await NotificationStore.checkDeadlines(cachedTasks);
    cachedNotifs = await NotificationStore.getAll();
  } catch (err) {
    console.error("[FlowMate] Failed to load data:", err);
    Toast.error("Couldn't load the latest data. Showing what we have.");
  }
  populateAssigneeFilter();
  renderDashboard();
  renderTasks();
  renderTeam();
  renderRoutines();
  renderNotifications();
  renderProgress();
}

/* ---------------- shared row rendering ---------------- */
function badgeFor(t) {
  if (t.status === "completed") return '<span class="badge ok">Done</span>';
  if (t.status === "cancelled") return '<span class="badge" style="background:var(--surface-sunk);color:var(--ink-soft);">Cancelled</span>';
  if (t.is_overdue) return '<span class="badge overdue">Overdue</span>';
  return `<span class="badge due">${DateUtil.formatTaskDate(t.due_date, t.status)}</span>`;
}
function priorityDot(p) {
  const colors = { high: "🔴", normal: "🟡", low: "🔵" };
  return `<span class="priority-dot" title="${p} priority">${colors[p] || "🟡"}</span>`;
}
function escapeHtml(s) { return (s || "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])); }

function taskRowHtml(t, withAssignSelect) {
  const assigneeHtml = withAssignSelect
    ? `<select class="assign-select" onchange="onReassign('${t.id}', this.value)" onclick="event.stopPropagation()">${cachedTeam.map(m => `<option ${m.name === t.assigneeName ? "selected" : ""}>${escapeHtml(m.name)}</option>`).join("")}</select>`
    : `<span class="badge" style="background:var(--surface-sunk);color:var(--ink-soft);">${escapeHtml(t.assigneeName)}</span>`;
  const isDone = t.status === "completed";
  return `<div class="task-row" ${withAssignSelect ? `onclick="onEditTask('${t.id}')"` : ""}>
    <div class="check ${isDone ? "done" : ""}" onclick="event.stopPropagation(); onToggleDone('${t.id}')">${isDone ? "✓" : ""}</div>
    ${priorityDot(t.priority)}
    <div class="name ${isDone ? "done" : ""}">${escapeHtml(t.title)}</div>
    ${assigneeHtml}
    ${badgeFor(t)}
  </div>`;
}

function emptyState({ title, body, actions }) {
  return `<div class="empty-state">
    <div class="empty-title">${escapeHtml(title)}</div>
    <div class="empty-body">${escapeHtml(body)}</div>
    <div class="empty-actions">${actions || ""}</div>
  </div>`;
}

/* ---------------- dashboard ---------------- */
function renderDashboard() {
  const el = document.getElementById("dashTaskList");
  const upcoming = [...cachedTasks].filter(t => t.status !== "completed" && t.status !== "cancelled")
    .sort((a, b) => (a.due_date || "9999") < (b.due_date || "9999") ? -1 : 1);
  el.innerHTML = cachedTasks.length === 0
    ? emptyState({
        title: "No tasks yet",
        body: "Try the AI Inbox, or create one manually.",
        actions: `<button class="modal-btn primary" onclick="switchView('inbox')">✨ Try AI Inbox</button>
                  <button class="modal-btn ghost" onclick="openNewTaskModal()">+ Create task</button>`
      })
    : upcoming.slice(0, 5).map(t => taskRowHtml(t, false)).join("");

  const routineEl = document.getElementById("dashRoutineList");
  routineEl.innerHTML = cachedRoutines.length === 0
    ? '<div class="empty">No routines yet.</div>'
    : cachedRoutines.map(r => `<div class="routine-row"><span class="name">${escapeHtml(r.title)}</span><span class="freq">${RoutineStore.nextOccurrence(r)}</span></div>`).join("");

  const notifEl = document.getElementById("dashNotifList");
  notifEl.innerHTML = cachedNotifs.length === 0
    ? '<div class="empty">Nothing yet.</div>'
    : cachedNotifs.slice(0, 4).map(notifRowHtml).join("");
}

/* ---------------- tasks view (search/filter/sort) ---------------- */
function populateAssigneeFilter() {
  const sel = document.getElementById("filterAssignee");
  const current = sel.value;
  sel.innerHTML = '<option value="all">Everyone</option>' +
    cachedTeam.map(m => `<option value="${escapeHtml(m.name)}">${escapeHtml(m.name)}</option>`).join("");
  if ([...sel.options].some(o => o.value === current)) sel.value = current;
}

function getFilteredTasks() {
  let list = [...cachedTasks];
  const f = taskFilters;
  if (f.search.trim()) {
    const q = f.search.trim().toLowerCase();
    list = list.filter(t => t.title.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q));
  }
  if (f.status !== "all") {
    list = f.status === "overdue" ? list.filter(t => t.is_overdue) : list.filter(t => t.status === f.status);
  }
  if (f.priority !== "all") list = list.filter(t => t.priority === f.priority);
  if (f.assignee !== "all") list = list.filter(t => t.assigneeName === f.assignee);

  if (f.sort === "due_date") {
    list.sort((a, b) => (a.due_date || "9999") < (b.due_date || "9999") ? -1 : 1);
  } else if (f.sort === "priority") {
    const order = { high: 0, normal: 1, low: 2 };
    list.sort((a, b) => order[a.priority] - order[b.priority]);
  } else if (f.sort === "newest") {
    list.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }
  return list;
}

function wireFilters() {
  document.getElementById("taskSearch").addEventListener("input", e => { taskFilters.search = e.target.value; renderTasks(); });
  document.getElementById("filterStatus").addEventListener("change", e => { taskFilters.status = e.target.value; renderTasks(); });
  document.getElementById("filterPriority").addEventListener("change", e => { taskFilters.priority = e.target.value; renderTasks(); });
  document.getElementById("filterAssignee").addEventListener("change", e => { taskFilters.assignee = e.target.value; renderTasks(); });
  document.getElementById("sortTasks").addEventListener("change", e => { taskFilters.sort = e.target.value; renderTasks(); });
}

function renderTasks() {
  const filtered = getFilteredTasks();
  const el = document.getElementById("fullTaskList");
  if (cachedTasks.length === 0) {
    el.innerHTML = emptyState({
      title: "No tasks yet",
      body: "Create your first task, or describe it in plain language via the AI Inbox.",
      actions: `<button class="modal-btn primary" onclick="openNewTaskModal()">+ New task</button>
                <button class="modal-btn ghost" onclick="switchView('inbox')">✨ Try AI Inbox</button>`
    });
    return;
  }
  el.innerHTML = filtered.length === 0
    ? emptyState({ title: "No matches", body: "Nothing fits those filters yet.", actions: "" })
    : filtered.map(t => taskRowHtml(t, true)).join("");
}

/* ---------------- team ---------------- */
function renderTeam() {
  const el = document.getElementById("teamList");
  if (cachedTeam.length === 0) {
    el.innerHTML = emptyState({ title: "No team members yet", body: "Add someone above to start assigning tasks.", actions: "" });
    return;
  }
  el.innerHTML = cachedTeam.map(person => {
    const mine = cachedTasks.filter(t => t.assigneeName === person.name);
    const done = mine.filter(t => t.status === "completed").length;
    const overdue = mine.filter(t => t.is_overdue).length;
    const pct = mine.length ? Math.round((done / mine.length) * 100) : 0;
    return `<div class="team-row">
      <div class="avatar">${escapeHtml(person.name.slice(0, 2).toUpperCase())}</div>
      <div class="team-info">
        <strong>${escapeHtml(person.name)}</strong>
        <span>${mine.length} task${mine.length === 1 ? "" : "s"} · ${done} done${overdue ? " · " + overdue + " overdue" : ""}</span>
      </div>
      <div class="mini-track"><div class="mini-fill" style="width:${pct}%"></div></div>
      <span class="badge" style="background:var(--surface-sunk);color:var(--ink-soft);">${pct}%</span>
      <button class="row-remove-btn" title="Remove ${escapeHtml(person.name)}" onclick="onRemoveMember('${person.id}', '${escapeHtml(person.name)}')">✕</button>
    </div>`;
  }).join("");
}

function wireTeamForm() {
  document.getElementById("addMemberBtn").addEventListener("click", onAddMember);
  document.getElementById("newMemberName").addEventListener("keydown", e => { if (e.key === "Enter") onAddMember(); });
}
async function onAddMember() {
  const input = document.getElementById("newMemberName");
  const name = input.value.trim();
  if (!name) return;
  try {
    await TeamStore.addMember({ name });
    input.value = "";
    Toast.success(`${name} added to the team`);
    await refreshAll();
  } catch (err) { Toast.error(err.message || "Couldn't add that team member."); }
}
async function onRemoveMember(id, name) {
  Modal.confirmDelete({
    title: `Remove ${name}?`,
    message: "Their existing tasks stay, but will show as unassigned until reassigned.",
    onConfirm: async () => {
      try { await TeamStore.removeMember(id); Toast.success(`${name} removed`); await refreshAll(); }
      catch (err) { Toast.error(err.message || "Couldn't remove that member."); }
    }
  });
}
window.onRemoveMember = onRemoveMember;

/* ---------------- routines ---------------- */
function renderRoutines() {
  const el = document.getElementById("fullRoutineList");
  el.innerHTML = cachedRoutines.length === 0
    ? emptyState({ title: "No routines yet", body: "Ask the AI Inbox to remind you about something recurring.", actions: `<button class="modal-btn primary" onclick="switchView('inbox')">✨ Try AI Inbox</button>` })
    : cachedRoutines.map(r => `<div class="routine-row">
        <span class="name">${escapeHtml(r.title)}</span>
        <span class="freq">${r.frequency} · next ${RoutineStore.nextOccurrence(r)}</span>
        <button class="row-remove-btn" title="Delete routine" onclick="onDeleteRoutine('${r.id}')">✕</button>
      </div>`).join("");
}
async function onDeleteRoutine(id) {
  Modal.confirmDelete({
    title: "Delete this routine?",
    message: "It will stop reminding you. This can't be undone.",
    onConfirm: async () => {
      try { await RoutineStore.deleteRoutine(id); Toast.success("Routine deleted"); await refreshAll(); }
      catch (err) { Toast.error(err.message || "Couldn't delete that routine."); }
    }
  });
}
window.onDeleteRoutine = onDeleteRoutine;

/* ---------------- notifications ---------------- */
function notifRowHtml(n) {
  const icons = { task_created: "🗓️", task_assigned: "👤", deadline_approaching: "⏰", task_overdue: "⚠️", routine_reminder: "🔔", recovery_plan: "⚠️", plan_applied: "✅" };
  return `<div class="notif-row"><div class="icon">${icons[n.type] || "🔔"}</div><div class="body"><strong>${escapeHtml(n.title)}</strong><span>${escapeHtml(n.message || "")}</span></div></div>`;
}
function renderNotifications() {
  document.getElementById("fullNotifList").innerHTML = cachedNotifs.length === 0
    ? '<div class="empty">Nothing yet.</div>'
    : cachedNotifs.map(notifRowHtml).join("");
}

/* ---------------- progress ---------------- */
function renderProgress() {
  const total = cachedTasks.length;
  const done = cachedTasks.filter(t => t.status === "completed").length;
  const overdue = cachedTasks.filter(t => t.is_overdue).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  ["progressFill", "progressFill2"].forEach(id => document.getElementById(id).style.width = pct + "%");
  ["progressNum", "progressNum2"].forEach(id => document.getElementById(id).textContent = pct + "%");
  document.getElementById("progressSub").textContent = total ? `${done} of ${total} tasks complete` : "Across all active tasks";
  document.getElementById("progressBreak").textContent = total ? `${done} done · ${total - done} open · ${overdue} overdue` : "No tasks yet.";
}

/* ---------------- task modal (manual CRUD) ---------------- */
function wireTaskModalTriggers() {
  document.getElementById("newTaskBtn").addEventListener("click", openNewTaskModal);
}
function openNewTaskModal() {
  Modal.openTask({
    task: null,
    members: cachedTeam,
    onSubmit: async (values) => {
      try {
        await TaskStore.createTask({ title: values.title, description: values.description, assigneeName: values.assigneeName, dueDate: values.dueDate, priority: values.priority, source: "manual" });
        Modal.close();
        Toast.success("Task created");
        await refreshAll();
      } catch (err) { Toast.error(err.message || "Couldn't create that task."); }
    }
  });
}
window.openNewTaskModal = openNewTaskModal;

function onEditTask(id) {
  const task = cachedTasks.find(t => t.id === id);
  if (!task) return;
  Modal.openTask({
    task,
    members: cachedTeam,
    onSubmit: async (values) => {
      try {
        await TaskStore.updateTask(id, { title: values.title.trim(), description: values.description, due_date: values.dueDate, priority: values.priority });
        if (values.assigneeName !== task.assigneeName) await TaskStore.reassignTask(id, values.assigneeName);
        Modal.close();
        Toast.success("Task updated");
        await refreshAll();
      } catch (err) { Toast.error(err.message || "Couldn't save those changes."); }
    },
    onDelete: async (taskId) => {
      try {
        await TaskStore.deleteTask(taskId);
        Modal.close();
        Toast.success("Task deleted");
        await refreshAll();
      } catch (err) { Toast.error(err.message || "Couldn't delete that task."); }
    }
  });
}
window.onEditTask = onEditTask;

/* ---------------- interactions ---------------- */
async function onToggleDone(id) {
  const t = cachedTasks.find(x => x.id === id);
  if (!t) return;
  const newStatus = t.status === "completed" ? "pending" : "completed";
  try {
    await TaskStore.updateTaskStatus(id, newStatus);
    await refreshAll();
  } catch (err) { Toast.error(err.message || "Couldn't update that task."); }
}
window.onToggleDone = onToggleDone;

async function onReassign(id, person) {
  try {
    await TaskStore.reassignTask(id, person);
    await NotificationStore.create({ type: "task_assigned", title: "Reassigned", message: `Task moved to ${person}`, taskId: id });
    Toast.success(`Reassigned to ${person}`);
    await refreshAll();
  } catch (err) { Toast.error(err.message || "Couldn't reassign that task."); }
}
window.onReassign = onReassign;

/* ---------------- AI Inbox ---------------- */
function wireInbox() {
  const input = document.getElementById("inboxInput");
  const sendBtn = document.getElementById("sendBtn");

  sendBtn.addEventListener("click", () => handleInboxSubmit());
  input.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleInboxSubmit(); }
  });

  const examples = {
    "1": "Prepare the monthly sales report by Friday, assign the presentation to Rahul, and remind me every morning to work on it.",
    "2": "Set up the client onboarding checklist by Tuesday and assign the welcome call to Aisha.",
    "3": "Write the weekly standup notes by tomorrow and remind me every day to send them."
  };
  document.querySelectorAll(".example-chip").forEach(btn => {
    btn.addEventListener("click", () => { document.getElementById("inboxInput").value = examples[btn.dataset.ex]; });
  });
}

async function handleInboxSubmit() {
  const input = document.getElementById("inboxInput");
  const sendBtn = document.getElementById("sendBtn");
  const zone = document.getElementById("processingZone");
  const text = input.value.trim();
  if (!text) return;

  sendBtn.disabled = true;
  zone.innerHTML = `<div class="automation-result"><div class="head">🤖 FLOWMATE IS UNDERSTANDING YOUR REQUEST…</div></div>`;

  try {
    const parsed = await FlowMateAI.parseInstruction(text);
    const cards = await commitParsedResult(parsed);
    zone.innerHTML = cards.length
      ? `<div class="automation-result"><div class="head">✨ AUTOMATION CREATED</div>${cards.map(c => `<div class="autom-item"><div class="icon">${c.icon}</div><div class="txt"><strong>${escapeHtml(c.title)}</strong><span>${escapeHtml(c.sub)}</span></div></div>`).join("")}</div>`
      : `<div class="automation-result"><div class="head">AI PROCESSING</div><div class="autom-item"><div class="icon">🤔</div><div class="txt"><strong>Couldn't find a clear task in that.</strong><span>Try naming what to do and when it's due.</span></div></div></div>`;
    input.value = "";
    await refreshAll();
  } catch (err) {
    zone.innerHTML = `<div class="automation-result"><div class="head">⚠️ SOMETHING WENT WRONG</div><div class="autom-item"><div class="icon">⚠️</div><div class="txt"><strong>${escapeHtml(err.message || "The AI request failed.")}</strong><span>Nothing was changed — try again.</span></div></div></div>`;
  } finally {
    sendBtn.disabled = false;
  }
}

// Turns the AI's structured JSON into real Supabase/local writes. Every
// field is still passed through the same validators a manual entry would
// hit (see js/utils/validation.js) via TaskStore/RoutineStore — an AI
// hallucination doesn't get a free pass a human wouldn't get.
async function commitParsedResult(parsed) {
  const cards = [];
  const createdTaskIds = {}; // title -> id, so assignments/routines can attach

  for (const t of (parsed.tasks || [])) {
    try {
      const task = await TaskStore.createTask({
        title: t.title, description: t.description || "", assigneeName: t.assignee || "You",
        dueDate: t.deadline || null, priority: t.priority || "normal", source: "ai_inbox"
      });
      createdTaskIds[t.title] = task.id;
      cards.push({ icon: "📊", title: t.title, sub: t.deadline ? "Deadline: " + DateUtil.formatTaskDate(t.deadline, "pending") : "No deadline set" });
      await NotificationStore.create({ type: "task_created", title: "New task created", message: t.title, taskId: task.id });
    } catch (err) {
      cards.push({ icon: "⚠️", title: t.title || "A task", sub: "Skipped: " + err.message });
    }
  }

  for (const a of (parsed.assignments || [])) {
    const id = createdTaskIds[a.task_title];
    if (id) {
      await TaskStore.reassignTask(id, a.assignee);
    } else {
      const task = await TaskStore.createTask({ title: a.task_title, assigneeName: a.assignee, source: "ai_inbox" });
      createdTaskIds[a.task_title] = task.id;
    }
    cards.push({ icon: "👤", title: a.task_title, sub: "Assigned to " + a.assignee });
    await NotificationStore.create({ type: "task_assigned", title: a.assignee + " was assigned a task", message: a.task_title, taskId: createdTaskIds[a.task_title] });
  }

  for (const r of (parsed.routines || [])) {
    try {
      await RoutineStore.createRoutine({ title: r.title, frequency: r.frequency || "daily", time: r.time || "09:00" });
      cards.push({ icon: "🔔", title: "Reminder set", sub: `${r.frequency}, ${r.time || "09:00"}` });
      await NotificationStore.create({ type: "routine_reminder", title: "Recurring reminder created", message: r.title });
    } catch (err) {
      cards.push({ icon: "⚠️", title: r.title || "A routine", sub: "Skipped: " + err.message });
    }
  }

  for (const n of (parsed.notifications || [])) {
    await NotificationStore.create({ type: "routine_reminder", title: n.title, message: n.message });
  }

  return cards;
}

/* ---------------- I'm Behind ---------------- */
function wireBehindButton() {
  document.getElementById("behindBtn").addEventListener("click", handleImBehind);
}

async function handleImBehind() {
  const zone = document.getElementById("planZone");
  const openTasks = cachedTasks.filter(t => t.status !== "completed" && t.status !== "cancelled");
  if (openTasks.length === 0) {
    zone.innerHTML = `<div class="plan-card"><h4>Nothing overdue</h4><div class="empty">All caught up — add a task from the AI Inbox first.</div></div>`;
    return;
  }

  zone.innerHTML = `<div class="plan-card"><h4>🤖 Building your recovery plan…</h4></div>`;

  const summaries = openTasks.map(t => ({ title: t.title, due_date: t.due_date, status: t.status, is_overdue: t.is_overdue }));
  const overdueIds = openTasks.filter(t => t.is_overdue).slice(0, 4).map(t => t.id);

  try {
    const result = await FlowMateAI.generateRecoveryPlan(summaries);
    const plan = result.plan || [];
    if (plan.length === 0) throw new Error("The AI didn't return a usable plan.");

    zone.innerHTML = `<div class="plan-card">
      <h4>⚠️ Recovery plan</h4>
      ${plan.map(p => `<div class="plan-row"><span>${escapeHtml(p.day)}</span><span>${escapeHtml(p.focus)}</span></div>`).join("")}
      <button class="apply-btn" id="applyPlanBtn">Apply new plan</button>
    </div>`;
    await NotificationStore.create({ type: "recovery_plan", title: overdueIds.length + " task(s) overdue", message: "Recovery plan generated" });
    await refreshAll();

    document.getElementById("applyPlanBtn").addEventListener("click", async () => {
      try {
        for (let i = 0; i < Math.min(overdueIds.length, plan.length); i++) {
          await TaskStore.updateDueDate(overdueIds[i], DateUtil.addDays(i + 1));
        }
        await NotificationStore.create({ type: "plan_applied", title: "Recovery plan applied", message: "Schedule updated for overdue tasks" });
        zone.innerHTML = `<div class="plan-card"><h4>Plan applied</h4><div class="empty">Overdue tasks are back on a schedule.</div></div>`;
        Toast.success("Recovery plan applied");
        await refreshAll();
      } catch (err) { Toast.error("Couldn't apply the plan. Please try again."); }
    });
  } catch (err) {
    zone.innerHTML = `<div class="plan-card"><h4>⚠️ Couldn't build a plan</h4><div class="empty">${escapeHtml(err.message || "Please try again.")}</div></div>`;
  }
}

/* ---------------- nav + misc ---------------- */
function wireNav() {
  document.getElementById("nav").addEventListener("click", e => {
    const btn = e.target.closest("button");
    if (!btn) return;
    switchView(btn.dataset.view);
  });
}
function switchView(view) {
  document.querySelectorAll(".nav button").forEach(b => b.classList.toggle("active", b.dataset.view === view));
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === "view-" + view));
}
window.switchView = switchView;

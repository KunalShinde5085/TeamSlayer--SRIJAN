// js/app.js
// Wires the existing FlowMate UI to real data (Supabase, with a local
// fallback) and the real AI endpoint. Visual design/markup is unchanged
// from the original prototype.

const TEAM = ["Rahul", "Aisha", "Wei", "You"];
let cachedTasks = [];
let cachedRoutines = [];
let cachedNotifs = [];

document.addEventListener("DOMContentLoaded", async () => {
  initSupabase();
  wireNav();
  wireInbox();
  wireBehindButton();
  NotificationStore.requestBrowserPermission();
  await ensureDemoSeed();
  await refreshAll();
});

/* ---------------- seed data (only used when everything is empty) ---------------- */
async function ensureDemoSeed() {
  const existing = await TaskStore.getTasks();
  if (existing.length > 0) return;

  TaskStore.seedLocal([
    { title: "Prepare the monthly sales report", description: "", assigneeName: "You", due_date: inDays(2), priority: "high", status: "pending", source: "ai_inbox", completed_at: null, created_at: new Date().toISOString() },
    { title: "Presentation", description: "", assigneeName: "Rahul", due_date: inDays(2), priority: "normal", status: "pending", source: "ai_inbox", completed_at: null, created_at: new Date().toISOString() }
  ]);
  RoutineStore.seedLocal([
    { title: "Work on sales report", description: "", frequency: "daily", scheduled_time: "09:00:00", enabled: true, created_at: new Date().toISOString() }
  ]);

  if (isSupabaseReady()) {
    try {
      await TaskStore.createTask({ title: "Prepare the monthly sales report", assigneeName: "You", dueDate: inDays(2), priority: "high", source: "ai_inbox" });
      await TaskStore.createTask({ title: "Presentation", assigneeName: "Rahul", dueDate: inDays(2), priority: "normal", source: "ai_inbox" });
      await RoutineStore.createRoutine({ title: "Work on sales report", frequency: "daily", time: "09:00" });
    } catch (err) { console.warn("[FlowMate] Seeding Supabase failed, continuing with local demo data:", err); }
  }
}

function inDays(n) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/* ---------------- data refresh + render ---------------- */
async function refreshAll() {
  try {
    cachedTasks = await TaskStore.getTasks();
    cachedRoutines = await RoutineStore.getRoutines();
    await NotificationStore.checkDeadlines(cachedTasks);
    cachedNotifs = await NotificationStore.getAll();
  } catch (err) {
    console.error("[FlowMate] Failed to load data:", err);
    showBanner("Couldn't load the latest data. Showing what we have.");
  }
  renderDashboard();
  renderTasks();
  renderTeam();
  renderRoutines();
  renderNotifications();
  renderProgress();
}

/* ---------------- rendering (same markup/classes as the original design) ---------------- */
function badgeFor(t) {
  if (t.status === "completed") return '<span class="badge ok">Done</span>';
  if (t.status === "overdue") return '<span class="badge overdue">Overdue</span>';
  return `<span class="badge due">${t.due_date ? formatDate(t.due_date) : "No deadline"}</span>`;
}
function formatDate(iso) {
  const d = new Date(iso + "T00:00:00");
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
function taskRowHtml(t, withAssignSelect) {
  const assigneeHtml = withAssignSelect
    ? `<select class="assign-select" onchange="onReassign('${t.id}', this.value)">${TEAM.map(n => `<option ${n === t.assigneeName ? "selected" : ""}>${n}</option>`).join("")}</select>`
    : `<span class="badge" style="background:var(--surface-sunk);color:var(--ink-soft);">${t.assigneeName}</span>`;
  const isDone = t.status === "completed";
  return `<div class="task-row">
    <div class="check ${isDone ? "done" : ""}" onclick="onToggleDone('${t.id}')">${isDone ? "✓" : ""}</div>
    <div class="name ${isDone ? "done" : ""}">${escapeHtml(t.title)}</div>
    ${assigneeHtml}
    ${badgeFor(t)}
  </div>`;
}
function escapeHtml(s) { return (s || "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])); }

function renderDashboard() {
  const el = document.getElementById("dashTaskList");
  el.innerHTML = cachedTasks.length === 0
    ? '<div class="empty">No tasks yet — try the AI Inbox.</div>'
    : cachedTasks.slice(0, 5).map(t => taskRowHtml(t, false)).join("");

  const routineEl = document.getElementById("dashRoutineList");
  routineEl.innerHTML = cachedRoutines.length === 0
    ? '<div class="empty">No routines yet.</div>'
    : cachedRoutines.map(r => `<div class="routine-row"><span class="name">${escapeHtml(r.title)}</span><span class="freq">${RoutineStore.nextOccurrence(r)}</span></div>`).join("");

  const notifEl = document.getElementById("dashNotifList");
  notifEl.innerHTML = cachedNotifs.length === 0
    ? '<div class="empty">Nothing yet.</div>'
    : cachedNotifs.slice(0, 4).map(notifRowHtml).join("");
}

function renderTasks() {
  document.getElementById("fullTaskList").innerHTML = cachedTasks.length === 0
    ? '<div class="empty">Nothing here yet.</div>'
    : cachedTasks.map(t => taskRowHtml(t, true)).join("");
}

function renderTeam() {
  document.getElementById("teamList").innerHTML = TEAM.map(person => {
    const mine = cachedTasks.filter(t => t.assigneeName === person);
    const done = mine.filter(t => t.status === "completed").length;
    const pct = mine.length ? Math.round((done / mine.length) * 100) : 0;
    return `<div class="team-row">
      <div class="avatar">${person.slice(0, 2).toUpperCase()}</div>
      <div class="team-info"><strong>${person}</strong><span>${mine.length} task${mine.length === 1 ? "" : "s"} assigned</span></div>
      <div class="mini-track"><div class="mini-fill" style="width:${pct}%"></div></div>
      <span class="badge" style="background:var(--surface-sunk);color:var(--ink-soft);">${pct}%</span>
    </div>`;
  }).join("");
}

function renderRoutines() {
  document.getElementById("fullRoutineList").innerHTML = cachedRoutines.length === 0
    ? '<div class="empty">No routines yet.</div>'
    : cachedRoutines.map(r => `<div class="routine-row"><span class="name">${escapeHtml(r.title)}</span><span class="freq">${r.frequency} · next ${RoutineStore.nextOccurrence(r)}</span></div>`).join("");
}

function notifRowHtml(n) {
  const icons = { task_created: "🗓️", task_assigned: "👤", deadline_approaching: "⏰", task_overdue: "⚠️", routine_reminder: "🔔", recovery_plan: "⚠️", plan_applied: "✅" };
  return `<div class="notif-row"><div class="icon">${icons[n.type] || "🔔"}</div><div class="body"><strong>${escapeHtml(n.title)}</strong><span>${escapeHtml(n.message || "")}</span></div></div>`;
}
function renderNotifications() {
  document.getElementById("fullNotifList").innerHTML = cachedNotifs.length === 0
    ? '<div class="empty">Nothing yet.</div>'
    : cachedNotifs.map(notifRowHtml).join("");
}

function renderProgress() {
  const total = cachedTasks.length;
  const done = cachedTasks.filter(t => t.status === "completed").length;
  const overdue = cachedTasks.filter(t => t.status === "overdue").length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  ["progressFill", "progressFill2"].forEach(id => document.getElementById(id).style.width = pct + "%");
  ["progressNum", "progressNum2"].forEach(id => document.getElementById(id).textContent = pct + "%");
  document.getElementById("progressSub").textContent = total ? `${done} of ${total} tasks complete` : "Across all active tasks";
  document.getElementById("progressBreak").textContent = total ? `${done} done · ${total - done} open · ${overdue} overdue` : "No tasks yet.";
}

/* ---------------- interactions ---------------- */
async function onToggleDone(id) {
  const t = cachedTasks.find(x => x.id === id);
  if (!t) return;
  const newStatus = t.status === "completed" ? "pending" : "completed";
  try {
    await TaskStore.updateTaskStatus(id, newStatus);
    await refreshAll();
  } catch (err) { showBanner("Couldn't update that task. Please try again."); }
}
window.onToggleDone = onToggleDone;

async function onReassign(id, person) {
  try {
    await TaskStore.reassignTask(id, person);
    await NotificationStore.create({ type: "task_assigned", title: "Reassigned", message: `Task moved to ${person}`, taskId: id });
    await refreshAll();
  } catch (err) { showBanner("Couldn't reassign that task. Please try again."); }
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

// Turns the AI's structured JSON into real Supabase/local writes.
async function commitParsedResult(parsed) {
  const cards = [];
  const createdTaskIds = {}; // title -> id, so assignments/routines can attach

  for (const t of (parsed.tasks || [])) {
    const task = await TaskStore.createTask({
      title: t.title, description: t.description || "", assigneeName: t.assignee || "You",
      dueDate: t.deadline || null, priority: t.priority || "normal", source: "ai_inbox"
    });
    createdTaskIds[t.title] = task.id;
    cards.push({ icon: "📊", title: t.title, sub: t.deadline ? "Deadline: " + formatDate(t.deadline) : "No deadline set" });
    await NotificationStore.create({ type: "task_created", title: "New task created", message: t.title, taskId: task.id });
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
    await RoutineStore.createRoutine({ title: r.title, frequency: r.frequency || "daily", time: r.time || "09:00" });
    cards.push({ icon: "🔔", title: "Reminder set", sub: `${r.frequency}, ${r.time || "09:00"}` });
    await NotificationStore.create({ type: "routine_reminder", title: "Recurring reminder created", message: r.title });
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
  const openTasks = cachedTasks.filter(t => t.status !== "completed");
  if (openTasks.length === 0) {
    zone.innerHTML = `<div class="plan-card"><h4>Nothing overdue</h4><div class="empty">All caught up — add a task from the AI Inbox first.</div></div>`;
    return;
  }

  zone.innerHTML = `<div class="plan-card"><h4>🤖 Building your recovery plan…</h4></div>`;

  const summaries = openTasks.map(t => ({ title: t.title, due_date: t.due_date, status: t.status }));
  const overdueIds = openTasks.filter(t => t.status === "overdue" || (t.due_date && t.due_date < todayISO())).slice(0, 4).map(t => t.id);

  try {
    if (overdueIds.length) await TaskStore.markOverdue(overdueIds);
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
          await TaskStore.updateDueDate(overdueIds[i], addDaysISO(i + 1));
        }
        await NotificationStore.create({ type: "plan_applied", title: "Recovery plan applied", message: "Schedule updated for overdue tasks" });
        zone.innerHTML = `<div class="plan-card"><h4>Plan applied</h4><div class="empty">Overdue tasks are back on a schedule.</div></div>`;
        await refreshAll();
      } catch (err) { showBanner("Couldn't apply the plan. Please try again."); }
    });
  } catch (err) {
    zone.innerHTML = `<div class="plan-card"><h4>⚠️ Couldn't build a plan</h4><div class="empty">${escapeHtml(err.message || "Please try again.")}</div></div>`;
  }
}
function todayISO() { return new Date().toISOString().slice(0, 10); }
function addDaysISO(n) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }

/* ---------------- nav + misc ---------------- */
function wireNav() {
  document.getElementById("nav").addEventListener("click", e => {
    const btn = e.target.closest("button");
    if (!btn) return;
    document.querySelectorAll(".nav button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    document.getElementById("view-" + btn.dataset.view).classList.add("active");
  });
}

function showBanner(message) {
  // Minimal, non-blocking: reuse the notifications list as the error surface
  // so a failure never leaves the UI stuck without feedback.
  console.error("[FlowMate]", message);
  const zone = document.getElementById("processingZone");
  if (zone) {
    const div = document.createElement("div");
    div.className = "automation-result";
    div.innerHTML = `<div class="head">⚠️ NOTICE</div><div class="autom-item"><div class="icon">⚠️</div><div class="txt"><strong>${escapeHtml(message)}</strong></div></div>`;
    zone.prepend(div);
  }
}

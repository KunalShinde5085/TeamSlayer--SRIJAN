// js/ui/modal.js
// Manual task creation/edit modal (previously the app depended entirely on
// the AI Inbox to create tasks — there was no ordinary form) plus a
// reusable confirm-before-delete modal for destructive actions.
//
// This module only renders and reads the DOM; it doesn't know about
// Supabase/localStorage — app.js passes in callbacks and decides what to
// do with the result.

const Modal = (() => {
  function overlay() { return document.getElementById("modalOverlay"); }

  function closeAll() {
    const el = overlay();
    if (el) { el.classList.remove("open"); el.innerHTML = ""; }
  }

  function escapeHtml(s) { return (s || "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])); }

  // task: null for create, or an existing task object for edit.
  // members: array of {id, name} for the assignee dropdown.
  // onSubmit(values) is called with { title, description, assigneeName, dueDate, priority }.
  function openTask({ task = null, members = [], onSubmit, onDelete }) {
    const isEdit = !!task;
    const el = overlay();
    el.innerHTML = `
      <div class="modal-box">
        <div class="modal-head">
          <h3>${isEdit ? "Edit task" : "New task"}</h3>
          <button class="modal-close" id="modalCloseBtn" aria-label="Close">✕</button>
        </div>
        <div class="modal-body">
          <label class="field-label">Title</label>
          <input type="text" id="mTitle" class="field-input" maxlength="200" value="${escapeHtml(task ? task.title : "")}" placeholder="What needs to get done?">
          <div class="field-error" id="mTitleErr"></div>

          <label class="field-label">Description</label>
          <textarea id="mDescription" class="field-input field-textarea" placeholder="Optional details">${escapeHtml(task ? task.description : "")}</textarea>

          <div class="field-row">
            <div>
              <label class="field-label">Assignee</label>
              <select id="mAssignee" class="field-input">
                ${members.map(m => `<option value="${escapeHtml(m.name)}" ${task && task.assigneeName === m.name ? "selected" : ""}>${escapeHtml(m.name)}</option>`).join("")}
              </select>
            </div>
            <div>
              <label class="field-label">Priority</label>
              <select id="mPriority" class="field-input">
                <option value="low" ${task && task.priority === "low" ? "selected" : ""}>Low</option>
                <option value="normal" ${!task || task.priority === "normal" ? "selected" : ""}>Normal</option>
                <option value="high" ${task && task.priority === "high" ? "selected" : ""}>High</option>
              </select>
            </div>
          </div>

          <label class="field-label">Due date</label>
          <input type="date" id="mDueDate" class="field-input" value="${task && task.due_date ? task.due_date : ""}">
          <div class="field-error" id="mDateErr"></div>
        </div>
        <div class="modal-foot">
          ${isEdit ? `<button class="modal-btn danger" id="mDeleteBtn">Delete</button>` : `<span></span>`}
          <div>
            <button class="modal-btn ghost" id="mCancelBtn">Cancel</button>
            <button class="modal-btn primary" id="mSaveBtn">${isEdit ? "Save changes" : "Create task"}</button>
          </div>
        </div>
      </div>`;
    el.classList.add("open");

    document.getElementById("modalCloseBtn").addEventListener("click", closeAll);
    document.getElementById("mCancelBtn").addEventListener("click", closeAll);
    el.addEventListener("click", (e) => { if (e.target === el) closeAll(); });

    document.getElementById("mSaveBtn").addEventListener("click", () => {
      const values = {
        title: document.getElementById("mTitle").value,
        description: document.getElementById("mDescription").value,
        assigneeName: document.getElementById("mAssignee").value || "Unassigned",
        priority: document.getElementById("mPriority").value,
        dueDate: document.getElementById("mDueDate").value || null
      };
      const titleErr = Validate.title(values.title);
      const dateErr = values.dueDate ? Validate.date(values.dueDate) : null;
      document.getElementById("mTitleErr").textContent = titleErr || "";
      document.getElementById("mDateErr").textContent = dateErr || "";
      if (titleErr || dateErr) return;
      onSubmit(values);
    });

    if (isEdit) {
      document.getElementById("mDeleteBtn").addEventListener("click", () => {
        confirmDelete({
          title: "Delete this task?",
          message: `"${task.title}" will be permanently removed. This can't be undone.`,
          onConfirm: () => onDelete(task.id)
        });
      });
    }
  }

  function confirmDelete({ title, message, onConfirm }) {
    const el = overlay();
    el.innerHTML = `
      <div class="modal-box modal-box-sm">
        <div class="modal-head"><h3>${escapeHtml(title)}</h3></div>
        <div class="modal-body"><p class="modal-msg">${escapeHtml(message)}</p></div>
        <div class="modal-foot">
          <span></span>
          <div>
            <button class="modal-btn ghost" id="cCancelBtn">Cancel</button>
            <button class="modal-btn danger" id="cConfirmBtn">Delete</button>
          </div>
        </div>
      </div>`;
    el.classList.add("open");
    document.getElementById("cCancelBtn").addEventListener("click", closeAll);
    el.addEventListener("click", (e) => { if (e.target === el) closeAll(); });
    document.getElementById("cConfirmBtn").addEventListener("click", () => { closeAll(); onConfirm(); });
  }

  return { openTask, confirmDelete, close: closeAll };
})();

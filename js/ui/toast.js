// js/ui/toast.js
// Small toast system so success/failure feedback doesn't rely solely on
// the notifications list (which is for FlowMate's own record-keeping, not
// transient UI feedback).

const Toast = (() => {
  function ensureContainer() {
    let el = document.getElementById("toastContainer");
    if (!el) {
      el = document.createElement("div");
      el.id = "toastContainer";
      el.className = "toast-container";
      document.body.appendChild(el);
    }
    return el;
  }

  function show(message, type = "success", timeout = 3200) {
    const container = ensureContainer();
    const icons = { success: "✓", error: "✕", warning: "⚠" };
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.innerHTML = `<span class="toast-icon">${icons[type] || "•"}</span><span class="toast-msg"></span>`;
    el.querySelector(".toast-msg").textContent = message;
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 250);
    }, timeout);
  }

  return {
    success: (msg) => show(msg, "success"),
    error: (msg) => show(msg, "error", 4500),
    warning: (msg) => show(msg, "warning", 4000)
  };
})();

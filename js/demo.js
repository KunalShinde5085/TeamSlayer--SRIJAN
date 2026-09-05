// js/demo.js
// Demo/sample data used to ALWAYS load automatically for every new user,
// which is fine for a hackathon judge but wrong for a real first-run
// experience. Now it only runs when explicitly enabled:
//
//   window.FLOWMATE_CONFIG.DEMO_MODE = true
//
// in config/env.js. Everyone else sees the real empty state (see
// renderEmptyStates in js/app.js) with a button that calls seedDemoData()
// on demand ("Import Sample Workspace").

const Demo = (() => {
  async function isEnabled() {
    return !!(window.FLOWMATE_CONFIG && window.FLOWMATE_CONFIG.DEMO_MODE);
  }

  async function seed() {
    const existing = await TaskStore.getTasks();
    if (existing.length > 0) return false;

    await TeamStore.findOrCreateByName("Rahul");
    await TeamStore.findOrCreateByName("Aisha");
    await TeamStore.findOrCreateByName("Wei");
    await TeamStore.findOrCreateByName("You");

    await TaskStore.createTask({ title: "Prepare the monthly sales report", assigneeName: "You", dueDate: DateUtil.addDays(2), priority: "high", source: "ai_inbox" });
    await TaskStore.createTask({ title: "Presentation", assigneeName: "Rahul", dueDate: DateUtil.addDays(2), priority: "normal", source: "ai_inbox" });
    await RoutineStore.createRoutine({ title: "Work on sales report", frequency: "daily", time: "09:00" });
    return true;
  }

  return { isEnabled, seed };
})();

// js/stores/team-store.js
// Replaces the old hardcoded `const TEAM = [...]` in app.js. Team members
// are now real records — addable, editable, removable — backed by
// Supabase when configured, and by localStorage otherwise so they survive
// a reload.

const TeamStore = (() => {
  let localSeq = 1;

  function loadLocal() {
    return LocalStorage.get("team", []);
  }
  function saveLocal(members) {
    LocalStorage.set("team", members);
  }
  function nextLocalId() {
    const existing = loadLocal();
    const maxSeq = existing.reduce((max, m) => {
      const n = String(m.id).startsWith("local-") ? parseInt(m.id.split("-")[1], 10) || 0 : 0;
      return Math.max(max, n);
    }, 0);
    return "local-" + (maxSeq + 1);
  }

  async function getMembers() {
    if (isSupabaseReady()) {
      const sb = getSupabase();
      const { data, error } = await sb.from("team_members").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    }
    const members = loadLocal();
    if (members.length === 0) {
      // First run in local mode: give the user a starting point, not an
      // empty screen with no way to assign anything.
      const seeded = [{ id: "local-1", name: "You", email: "", role: "member", created_at: new Date().toISOString() }];
      saveLocal(seeded);
      return seeded;
    }
    return members;
  }

  async function addMember({ name, email = "", role = "member" }) {
    const err = Validate.title(name);
    if (err) throw new Error(err);
    if (email) { const e = Validate.email(email); if (e) throw new Error(e); }

    if (isSupabaseReady()) {
      const sb = getSupabase();
      const { data, error } = await sb.from("team_members").insert({ name: name.trim(), email, role }).select().single();
      if (error) throw error;
      return data;
    }
    const members = loadLocal();
    const member = { id: nextLocalId(), name: name.trim(), email, role, created_at: new Date().toISOString() };
    members.push(member);
    saveLocal(members);
    return member;
  }

  async function updateMember(id, patch) {
    if (isSupabaseReady() && !String(id).startsWith("local-")) {
      const sb = getSupabase();
      const { error } = await sb.from("team_members").update(patch).eq("id", id);
      if (error) throw error;
      return;
    }
    const members = loadLocal();
    const m = members.find(x => x.id === id);
    if (m) Object.assign(m, patch);
    saveLocal(members);
  }

  async function removeMember(id) {
    if (isSupabaseReady() && !String(id).startsWith("local-")) {
      const sb = getSupabase();
      const { error } = await sb.from("team_members").delete().eq("id", id);
      if (error) throw error;
      return;
    }
    saveLocal(loadLocal().filter(m => m.id !== id));
  }

  // Finds a member by name (case-insensitive), creating one if AI Inbox or
  // a manual entry names someone who doesn't exist yet.
  async function findOrCreateByName(name) {
    const clean = (name || "").trim();
    if (!clean) return null;
    const members = await getMembers();
    const existing = members.find(m => m.name.toLowerCase() === clean.toLowerCase());
    if (existing) return existing;
    return addMember({ name: clean });
  }

  function getMemberTasks(memberId, tasks) {
    return tasks.filter(t => t.assigneeId === memberId);
  }

  return { getMembers, addMember, updateMember, removeMember, findOrCreateByName, getMemberTasks };
})();

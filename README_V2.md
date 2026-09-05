# FlowMate v2 — Core Upgrade

This is the first upgrade batch on top of the hackathon prototype:
**persistent local storage + dynamic team + proper task CRUD + a cleaner
status model + removal of automatic demo data.** The visual design and the
AI Inbox flow are unchanged on purpose — this pass is about making the
foundation real, not restyling anything.

## What changed

**Local data now survives a reload.**
`js/utils/storage.js` wraps `localStorage`. Tasks, routines, notifications,
team members, and the notification de-dupe guard all persist there when
Supabase isn't configured, instead of resetting to `[]` on every refresh.

**Team is dynamic, not hardcoded.**
The old `const TEAM = ["Rahul", "Aisha", "Wei", "You"]` in `app.js` is gone.
`js/stores/team-store.js` provides `getMembers / addMember / updateMember /
removeMember / findOrCreateByName`. The Team view has an add-member form and
a remove button per row; task assignee dropdowns are built from this store.

**Real manual task CRUD.**
Previously tasks could only be created by describing them to the AI Inbox.
There's now a "+ New task" button and a task modal (`js/ui/modal.js`) with
title, description, assignee, priority, and due date — used for both create
and edit. Clicking any task row opens it for editing; a delete option is
behind a confirm-before-destructive-action dialog, not an unguarded button.

**Cleaner status model.**
`overdue` is no longer a stored status. Tasks are `pending / in_progress /
completed / cancelled`, and "is this overdue" is computed from `due_date`
(`js/utils/date.js#isTaskOverdue`) — using local-timezone date math instead
of `toISOString()`, which was shifting dates by a day for timezones ahead of
UTC. This means a task can be `in_progress` **and** overdue at once, instead
of "overdue" silently overwriting whatever workflow state it was in.
`supabase/migrations/001_status_cleanup.sql` migrates an existing project;
`supabase/production_rls.sql.example` documents the RLS policies to apply
once real auth exists (see Phase 2 below — deliberately not applied yet,
since flipping policies without an auth flow and `user_id` columns in place
would just break every query).

**No more automatic fake data.**
`ensureDemoSeed()` used to run on every load for every user. Now
`js/demo.js` only seeds sample tasks/routines when
`window.FLOWMATE_CONFIG.DEMO_MODE = true` is set in `config/env.js`. Real
usage gets an honest empty state with "+ Create task" / "Try AI Inbox"
buttons instead of three tasks nobody created.

**Search, filter, and sort on the Tasks view.**
Text search, status/priority/assignee filters, and a sort dropdown — the
task list stays usable once it's not 3 items anymore.

**Input validation shared by manual entry and the AI Inbox.**
`js/utils/validation.js` checks title length, date format, and priority.
Both the task modal and `commitParsedResult()` (which turns AI JSON into
real records) use it, so a malformed AI response can't reach the store any
more easily than a bad manual entry could — bad AI Inbox items now show up
as a skipped card with the reason, instead of silently corrupting data.

**Toasts for action feedback.**
`js/ui/toast.js` gives create/update/delete/error feedback without
overloading the notifications list, which is FlowMate's own record of
events, not a transient UI acknowledgment.

**The `AI_MODEL` footgun is fixed.**
`api/flowmate-ai.js` no longer falls back to a guessed model id. If
`AI_MODEL` isn't set, it fails immediately with a clear message instead of
possibly working in dev and silently breaking in production against a
different account.

**Folder structure moved toward the recommended shape**, without a full
rewrite: `js/stores/` (task, routine, notification, team),
`js/utils/` (date, storage, validation), `js/ui/` (modal, toast). `app.js`
dropped from 337 lines to mostly view-wiring and rendering, since CRUD logic
now lives in the stores.

## What's deliberately NOT in this pass

These are real gaps, but each is a substantial feature on its own and
bundling them in would have meant shipping something half-working:

- **Authentication.** Still no login — the app is single-workspace,
  anon-key access. This needs Supabase Auth in the browser, a profile row
  on signup, `user_id`/`workspace_id` columns on every table, and only then
  the RLS swap in `production_rls.sql.example`.
- **Workspaces / multi-user collaboration**, and **Realtime sync** — both
  depend on auth existing first.
- **Task activity history**, **recurring-task scheduler that actually fires
  server-side** (current routines only compute "next occurrence" for
  display — no cron/email/push yet), **Settings and Admin pages**,
  **import/export**, **task detail view beyond the edit modal**.

Suggested order for the next pass, following the same
foundation-first logic as this one: auth → workspace/user_id columns →
apply the real RLS → then realtime, activity history, and the
notification/routine scheduler (all of which need a real user boundary to
be worth building safely).

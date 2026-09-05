-- ============================================================
-- Migration: remove "overdue" as a stored status, add "cancelled".
-- Only needed if you already ran the OLD schema.sql against a live
-- Supabase project. Skip this if you're starting fresh — the current
-- schema.sql already has the new constraint.
-- ============================================================

-- 1. Any task currently marked 'overdue' goes back to 'pending' —
--    overdue-ness is now computed from due_date on the client instead.
update tasks set status = 'pending' where status = 'overdue';

-- 2. Replace the old check constraint with the new one.
alter table tasks drop constraint if exists tasks_status_check;
alter table tasks add constraint tasks_status_check
  check (status in ('pending','in_progress','completed','cancelled'));

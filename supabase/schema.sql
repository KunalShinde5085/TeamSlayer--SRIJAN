-- ============================================================
-- FlowMate — Supabase schema
-- Paste this entire file into: Supabase Dashboard > SQL Editor > New query > Run
-- Safe to run on a fresh Supabase project.
-- ============================================================

create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- profiles: the logged-in / demo user
-- ------------------------------------------------------------
create table if not exists profiles (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  email       text unique,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- team_members: people tasks can be assigned to
-- ------------------------------------------------------------
create table if not exists team_members (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  email       text,
  role        text default 'member',
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- tasks
-- ------------------------------------------------------------
create table if not exists tasks (
  id            uuid primary key default uuid_generate_v4(),
  title         text not null,
  description   text default '',
  assignee_id   uuid references team_members(id) on delete set null,
  due_date      date,
  priority      text default 'normal' check (priority in ('low','normal','high')),
  status        text not null default 'pending' check (status in ('pending','in_progress','completed','overdue')),
  source        text default 'manual' check (source in ('manual','ai_inbox','recovery_plan')),
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);

create index if not exists idx_tasks_status on tasks(status);
create index if not exists idx_tasks_due_date on tasks(due_date);
create index if not exists idx_tasks_assignee on tasks(assignee_id);

-- ------------------------------------------------------------
-- routines: recurring reminders
-- ------------------------------------------------------------
create table if not exists routines (
  id              uuid primary key default uuid_generate_v4(),
  title           text not null,
  description     text default '',
  frequency       text not null check (frequency in ('daily','weekly','weekdays','monthly')),
  scheduled_time  time default '09:00',
  enabled         boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ------------------------------------------------------------
-- notifications
-- ------------------------------------------------------------
create table if not exists notifications (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid references profiles(id) on delete cascade,
  task_id        uuid references tasks(id) on delete cascade,
  type           text not null check (type in ('task_created','task_assigned','deadline_approaching','task_overdue','routine_reminder','recovery_plan','plan_applied')),
  title          text not null,
  message        text default '',
  scheduled_for  timestamptz default now(),
  is_read        boolean not null default false,
  created_at     timestamptz not null default now()
);

create index if not exists idx_notifications_user on notifications(user_id);
create index if not exists idx_notifications_read on notifications(is_read);

-- ------------------------------------------------------------
-- progress: a lightweight completion log, used for the Progress view
-- ------------------------------------------------------------
create table if not exists progress (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references profiles(id) on delete cascade,
  task_id       uuid references tasks(id) on delete cascade,
  status        text not null,
  completed_at  timestamptz,
  duration      interval,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- Row Level Security
--
-- Hackathon note: this project has no real login system, so these
-- policies allow the public "anon" key to read/write freely. That is
-- fine for a demo, but before this goes anywhere near real user data,
-- replace these with policies scoped to auth.uid().
-- ============================================================

alter table profiles       enable row level security;
alter table team_members   enable row level security;
alter table tasks          enable row level security;
alter table routines       enable row level security;
alter table notifications  enable row level security;
alter table progress       enable row level security;

create policy "demo: anon full access" on profiles       for all using (true) with check (true);
create policy "demo: anon full access" on team_members   for all using (true) with check (true);
create policy "demo: anon full access" on tasks          for all using (true) with check (true);
create policy "demo: anon full access" on routines       for all using (true) with check (true);
create policy "demo: anon full access" on notifications  for all using (true) with check (true);
create policy "demo: anon full access" on progress       for all using (true) with check (true);

-- ============================================================
-- Seed data — matches the in-app demo dataset
-- ============================================================
insert into team_members (name, role) values
  ('Rahul', 'member'),
  ('Aisha', 'member'),
  ('Wei',   'member'),
  ('You',   'member')
on conflict do nothing;

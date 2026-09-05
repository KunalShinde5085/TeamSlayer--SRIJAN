# FlowMate — AI-Powered Everyday Work Automation for Teams

## Problem

Turning a spoken or typed instruction into an actual tracked task — with a deadline, an owner, and a reminder — takes several manual steps across several tools. Most of that "admin tax" gets skipped, so deadlines slip quietly.

## Solution

FlowMate is an AI Inbox: type an instruction the way you'd say it to a teammate, and it becomes a structured task, deadline, assignment, and recurring reminder — automatically, and visible on a shared dashboard. When you fall behind, FlowMate looks at your real overdue work and proposes a day-by-day recovery plan.

> "I need to prepare the monthly sales report by Friday, assign the presentation to Rahul, and remind me every morning to work on it."

becomes a tracked task due Friday, an assignment for Rahul, and a daily reminder — with no forms to fill in.

## Features

- **AI Inbox** — natural language in, structured automation out (task / deadline / assignee / routine / notification)
- **Dashboard** — today's tasks, upcoming deadlines, active routines, recent notifications, overall progress
- **My Tasks** — create, complete, reassign, track status (pending / in progress / completed / overdue)
- **Team** — who's carrying what, with live completion percentages
- **Routines** — recurring reminders with a plain-language "next occurrence"
- **Notifications** — in-app history plus real browser push notifications (with graceful fallback if permission is denied)
- **I'm Behind** — sends your actual overdue/open tasks to the AI and gets back a realistic catch-up plan you can apply with one click
- **Progress** — completion percentage across everything active
- **Demo mode** — seeded with example team members and tasks so the app is never empty on first load, even before Supabase is configured

## Technology

- **Frontend:** HTML, CSS, vanilla JavaScript — no framework, no build step
- **Backend:** one serverless function (`api/flowmate-ai.js`), Vercel-compatible
- **Database:** Supabase (PostgreSQL) with Row Level Security
- **AI:** Anthropic API, called only from the serverless function — the key never reaches the browser

## Architecture

```
User types instruction
        |
        v
   AI Inbox (browser)
        |
        v
/api/flowmate-ai  (serverless function, holds the AI key)
        |
        v
   AI provider  --> structured JSON (tasks / assignments / routines / notifications)
        |
        v
   Browser JavaScript decides what to write
        |
        v
      Supabase  --> Dashboard, Team, Routines, Notifications all read from here
```

The AI never talks to the database directly — the app always sits between them and decides what actually gets written.

## Installation

```bash
git clone https://github.com/YOUR-USERNAME/flowmate-ai-work-automation.git
cd flowmate-ai-work-automation
cp config/env.example.js config/env.js   # then fill in your Supabase values
```

Full walkthrough: see `docs/SETUP.md`.

## Supabase setup

Run `supabase/schema.sql` in the Supabase SQL Editor. Full steps: `docs/SETUP.md`.

## AI API setup

See `docs/API_SETUP.md` for where to get a key and how the key stays server-side only.

## Environment variables

See `.env.example` (server-side: `AI_API_KEY`, `AI_MODEL`) and `config/env.example.js` (browser-facing: `SUPABASE_URL`, `SUPABASE_ANON_KEY`). Full explanation of what's safe where: `docs/API_SETUP.md`.

## Running locally

```bash
vercel dev
```

or, frontend-only (AI Inbox will show a friendly "unavailable" message, everything else still works):

```bash
npx serve .
```

## Deployment

Deploy on Vercel: import the repo, add `AI_API_KEY` (and optionally `AI_MODEL`) under Environment Variables, deploy. Details: `docs/API_SETUP.md`.

## GitHub setup

See `docs/GITHUB.md` for the exact push sequence and a checklist to confirm no secrets went up.

## Demo instructions

See `docs/DEMO.md` for a 2-minute walkthrough script, including a fallback plan if the network is unreliable during judging.

## Team roles

_Fill in for your team, e.g.:_
- Frontend / UI:
- Backend / API + Supabase:
- AI prompt design + demo script:

## Future improvements

- Real authentication (Supabase Auth) instead of a single shared demo workspace
- A scheduled job (Vercel Cron or Supabase Edge Functions) to actually fire routine reminders and deadline checks server-side, rather than only on page load
- Slack/email delivery for notifications in addition to browser push
- Smarter recovery planning that accounts for task size and the assignee's existing load, not just deadlines
- Per-company workspaces with role-based permissions

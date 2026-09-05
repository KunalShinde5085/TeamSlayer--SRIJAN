# Setup Guide

Written for someone setting this up for the first time. Total time: ~15 minutes.

## 1. Get the project

```bash
unzip FlowMate-Hackathon.zip
cd flowmate
```

## 2. Install dependencies

There's no build step, but `package.json` gives you two optional scripts. If you'll use Vercel locally:

```bash
npm install -g vercel
```

## 3. Create a Supabase project

1. Go to https://supabase.com and sign in.
2. Click **New project**. Pick a name and a database password (save the password somewhere — you won't need it for this app, but Supabase asks for it).
3. Wait ~2 minutes for it to provision.

## 4. Run the schema

1. In your Supabase project, open **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Open `supabase/schema.sql` from this project, copy all of it, and paste it into the editor.
4. Click **Run**. You should see "Success. No rows returned."

This creates all six tables (`profiles`, `team_members`, `tasks`, `routines`, `notifications`, `progress`), sets up demo-friendly Row Level Security policies, and seeds the four demo team members.

## 5. Configure the browser-facing values

1. In Supabase, go to **Project Settings > API**.
2. Copy the **Project URL** and the **anon / public** key (NOT the `service_role` key).
3. In this project, run:
   ```bash
   cp config/env.example.js config/env.js
   ```
4. Open `config/env.js` and paste in your values:
   ```js
   window.FLOWMATE_CONFIG = {
     SUPABASE_URL: "https://your-project.supabase.co",
     SUPABASE_ANON_KEY: "your-anon-key"
   };
   ```

## 6. Configure the AI API key

See `docs/API_SETUP.md` for where to get a key. Then:

- **Local development:** create a `.env` file in the project root (it's gitignored) with:
  ```
  AI_API_KEY=your-key-here
  ```
- **Deployed on Vercel:** add `AI_API_KEY` under Project Settings > Environment Variables (see `docs/API_SETUP.md`).

## 7. Run it locally

With Vercel CLI (recommended — this also runs the `/api` serverless function):

```bash
vercel dev
```

Without Vercel (frontend only — the AI Inbox will show a friendly error since `/api/flowmate-ai` won't exist, but every other feature still works against Supabase or local demo data):

```bash
npx serve .
```

## 8. Test the app

1. Open the AI Inbox and try: *"Prepare the monthly sales report by Friday, assign the presentation to Rahul, and remind me every morning to work on it."*
2. Confirm a task, an assignment, and a routine appear.
3. Check the **Dashboard**, **Team**, **Routines**, and **Notifications** tabs update.
4. Click a task's checkbox to mark it complete and watch **Progress** update.
5. Click **I'm behind** and confirm a recovery plan appears; click **Apply new plan**.
6. In Supabase, open the **Table Editor** and confirm rows actually landed in `tasks`, `routines`, and `notifications`.
7. When prompted, allow browser notifications and confirm a system notification appears alongside the in-app one.

If Supabase isn't configured yet, all of the above still works — the app quietly falls back to an in-memory demo store so it's never left broken during setup.

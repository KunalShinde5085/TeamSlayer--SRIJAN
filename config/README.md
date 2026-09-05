# config/

This folder holds browser-facing configuration — the small set of values
that are safe to ship to the client.

- `env.example.js` — committed to git, contains placeholders only.
- `env.js` — **gitignored**, contains your real Supabase URL and anon key.
  Copy the example file and fill in your own project's values:

  ```bash
  cp config/env.example.js config/env.js
  ```

## Why this exists instead of a `.env` file

Vanilla JS in the browser has no build step, so it can't read a `.env`
file directly. `config/env.js` plays that role for the two values that
are meant to be public:

| Value | Safe in the browser? | Why |
|---|---|---|
| `SUPABASE_URL` | Yes | It's just an endpoint address. |
| `SUPABASE_ANON_KEY` | Yes | It only grants what Row Level Security allows — see `supabase/schema.sql`. |
| `AI_API_KEY` | **No** | Never put this here. It lives in Vercel's environment variables and is only read by `api/flowmate-ai.js`, which runs on the server. |

If you ever see an AI provider key show up in this folder, remove it —
it does not belong here.

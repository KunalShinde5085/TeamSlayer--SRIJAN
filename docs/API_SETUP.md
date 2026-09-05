# API Setup

## Architecture

```
Browser  --POST-->  /api/flowmate-ai  --HTTPS-->  AI provider
   ^                       |
   |                       v
   +------ JSON response --+
   |
   v (browser writes the result)
Supabase (tasks / routines / notifications tables)
```

The browser never talks to the AI provider directly, and the AI never talks to Supabase directly. `api/flowmate-ai.js` is the only place the AI key is read, and `js/app.js` is the only place that decides what gets written to the database.

## Getting an AI API key

This project calls the Anthropic API by default (see `AI_MODEL` in `.env.example`). Get a key from https://console.anthropic.com — create an account, go to **API Keys**, and generate one.

`api/flowmate-ai.js` isolates the actual provider call inside a single `callModel()` function, so swapping providers (or models) later means editing that one function — nothing else in the app needs to change.

## Supabase values

| Value | Where to find it | Where it goes |
|---|---|---|
| Project URL | Supabase > Project Settings > API | `config/env.js` |
| `anon` / `public` key | Supabase > Project Settings > API | `config/env.js` |
| `service_role` key | Supabase > Project Settings > API | **Nowhere in this project.** Not needed — RLS policies handle access instead. |

## Environment variables

| Variable | Where it lives | Exposed to browser? |
|---|---|---|
| `SUPABASE_URL` | `config/env.js` | Yes — safe, it's just an endpoint |
| `SUPABASE_ANON_KEY` | `config/env.js` | Yes — safe, scoped by RLS |
| `AI_API_KEY` | `.env` locally / Vercel env vars in production | **No — server only** |
| `AI_MODEL` | `.env` locally / Vercel env vars in production | No |

## Setting environment variables on Vercel

1. Open your project on https://vercel.com.
2. Go to **Settings > Environment Variables**.
3. Add `AI_API_KEY` (and optionally `AI_MODEL`), scoped to Production, Preview, and Development as needed.
4. Redeploy so the function picks up the new values.

## Security precautions this project takes

- `api/flowmate-ai.js` runs server-side only (a Vercel serverless function) — the key is never bundled into anything the browser downloads.
- `config/env.js` is gitignored; only `config/env.example.js` (placeholders) is committed.
- Supabase access from the browser goes through the `anon` key plus Row Level Security, not the `service_role` key.
- If the AI call fails for any reason, `api/flowmate-ai.js` returns a JSON error instead of a raw stack trace, and the frontend shows a friendly message instead of hanging on "Processing."

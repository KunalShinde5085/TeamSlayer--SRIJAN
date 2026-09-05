// api/flowmate-ai.js
// Vercel serverless function (Node runtime).
// This is the ONLY part of the app that holds the AI API key and the
// ONLY part that talks to the AI provider. The browser calls this
// endpoint; this endpoint never touches Supabase directly.
//
// Flow: Browser -> /api/flowmate-ai -> AI provider -> JSON -> Browser -> Supabase

const SYSTEM_PROMPT = `You are FlowMate, an AI-powered work automation assistant for companies and teams.

Understand natural-language work instructions and convert them into structured tasks, deadlines, assignments, recurring routines, and notifications.

Rules:
- Do not invent information the user did not provide. If something is unknown, use null.
- Resolve relative dates (e.g. "Friday", "tomorrow", "next Monday") into an actual YYYY-MM-DD date, using the "Today's date" given to you.
- Return ONLY valid JSON matching the schema below. No prose, no markdown fences, no explanation.

Schema:
{
  "tasks": [
    { "title": string, "description": string, "deadline": "YYYY-MM-DD" | null, "priority": "low"|"normal"|"high", "assignee": string | null }
  ],
  "assignments": [
    { "task_title": string, "assignee": string }
  ],
  "routines": [
    { "title": string, "frequency": "daily"|"weekly"|"weekdays"|"monthly", "time": "HH:MM" }
  ],
  "notifications": [
    { "type": "reminder", "title": string, "message": string }
  ]
}`;

const RECOVERY_SYSTEM_PROMPT = `You are FlowMate's recovery planner. Given a list of a person's overdue and open tasks with their deadlines, produce a short, realistic day-by-day catch-up plan.

Rules:
- Use the actual tasks given — do not invent unrelated work.
- Keep it to 3-5 days, starting with "Today".
- Return ONLY valid JSON, no prose: { "plan": [ { "day": string, "focus": string } ] }`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST." });
  }

  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "AI_API_KEY is not configured on the server." });
  }

  const { mode, text, tasks } = req.body || {};

  try {
    let aiJson;
    if (mode === "parse") {
      if (!text || !text.trim()) return res.status(400).json({ error: "No instruction text was provided." });
      aiJson = await callModel({
        apiKey,
        system: SYSTEM_PROMPT,
        user: `Today's date: ${new Date().toISOString().slice(0, 10)}\n\nInstruction: ${text}`
      });
    } else if (mode === "recovery") {
      if (!Array.isArray(tasks) || tasks.length === 0) {
        return res.status(400).json({ error: "No tasks were provided for the recovery plan." });
      }
      aiJson = await callModel({
        apiKey,
        system: RECOVERY_SYSTEM_PROMPT,
        user: `Today's date: ${new Date().toISOString().slice(0, 10)}\n\nOpen/overdue tasks:\n${JSON.stringify(tasks, null, 2)}`
      });
    } else {
      return res.status(400).json({ error: "Unknown mode. Use 'parse' or 'recovery'." });
    }

    return res.status(200).json(aiJson);
  } catch (err) {
    console.error("[flowmate-ai] error:", err);
    return res.status(500).json({ error: "The AI request failed. Please try again." });
  }
}

// Isolated so the model/provider can be swapped without touching the rest
// of the app — only this function needs to change.
async function callModel({ apiKey, system, user }) {
  // v2: no assumed default model id. An unverified hardcoded model name
  // is a silent production-failure risk — fail loudly at request time
  // instead, with a clear message pointing at the fix.
  const model = process.env.AI_MODEL;
  if (!model) {
    throw new Error("AI_MODEL is not configured on the server. Set it to a model id your Anthropic account has access to.");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: user }]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error("AI provider error: " + errText);
  }

  const data = await response.json();
  const textBlock = (data.content || []).find(b => b.type === "text");
  if (!textBlock) throw new Error("AI response had no text content.");

  const cleaned = textBlock.text.trim().replace(/^```json\s*/i, "").replace(/```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error("AI did not return valid JSON: " + cleaned.slice(0, 200));
  }
}

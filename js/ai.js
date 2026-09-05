// js/ai.js
// GitHub Pages version: browser calls Gemini API directly.
// API key is loaded from config/env.js.

window.FlowMateAI = (() => {
  const API_KEY = window.FLOWMATE_CONFIG?.GEMINI_API_KEY;
  const MODEL = "gemini-2.0-flash";

  if (!API_KEY) {
    console.error("Gemini API key is missing.");
  }

  const ENDPOINT =
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  // Turns a natural-language inbox message into structured JSON:
  // { tasks: [...], assignments: [...], routines: [...], notifications: [...] }
  async function parseInstruction(text) {
    return callApi({
      mode: "parse",
      text
    });
  }

  // Given the user's current overdue/open tasks, asks for a realistic
  // day-by-day recovery plan.
  async function generateRecoveryPlan(taskSummaries) {
    return callApi({
      mode: "recovery",
      tasks: taskSummaries
    });
  }

  async function callApi(payload) {
    let response;

    try {
      response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `
You are FlowMate AI.

Return ONLY valid JSON.
Do not use markdown.
Do not wrap the response in code blocks.
Do not add explanations.

The application expects structured JSON.

Request mode: ${payload.mode}

User request:
${payload.text || JSON.stringify(payload)}
`
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });
    } catch (networkErr) {
      console.error("Gemini network error:", networkErr);

      throw new FlowMateAIError(
        "FlowMate couldn't reach Gemini. Check your connection and try again."
      );
    }

    if (!response.ok) {
      let detail = "";

      try {
        const errorData = await response.json();
        detail = errorData?.error?.message || "";
      } catch (_) {
        // Ignore JSON parsing errors
      }

      console.error("Gemini API error:", response.status, detail);

      throw new FlowMateAIError(
        detail || `Gemini couldn't process the request (Error ${response.status}).`
      );
    }

    let json;

    try {
      json = await response.json();
    } catch (_) {
      throw new FlowMateAIError(
        "The AI returned something we couldn't read. Try again."
      );
    }

    // Extract Gemini response text
    const aiText =
      json?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) {
      console.error("Unexpected Gemini response:", json);

      throw new FlowMateAIError(
        "Gemini returned an empty response. Try again."
      );
    }

    // Convert Gemini JSON text into JavaScript object
    try {
      return JSON.parse(aiText);
    } catch (_) {
      console.error("Invalid JSON from Gemini:", aiText);

      throw new FlowMateAIError(
        "Gemini returned invalid JSON. Try again."
      );
    }
  }

  return {
    parseInstruction,
    generateRecoveryPlan
  };
})();

class FlowMateAIError extends Error {
  constructor(message) {
    super(message);
    this.name = "FlowMateAIError";
  }
}

// js/ai.js
// The browser NEVER talks to the AI provider directly and never sees AI_API_KEY.
// It only calls our own serverless endpoint, which holds the key server-side.

window.FlowMateAI = (() => {
 const API_KEY = window.FLOWMATE_CONFIG.GEMINI_API_KEY;
const MODEL = "gemini-2.0-flash";
 
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  // Turns a natural-language inbox message into structured JSON:
  // { tasks: [...], assignments: [...], routines: [...], notifications: [...] }
  async function parseInstruction(text) {
    return callApi({ mode: "parse", text });
  }

  // Given the user's current overdue/open tasks, asks for a realistic
  // day-by-day recovery plan.
  async function generateRecoveryPlan(taskSummaries) {
    return callApi({ mode: "recovery", tasks: taskSummaries });
  }

  async function callApi(payload) {
    let response;
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
Do not use \`\`\`json.
Do not add explanations.

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
      throw new FlowMateAIError("FlowMate couldn't reach the server. Check your connection and try again.");
    }

    if (!response.ok) {
      let detail = "";
      try { detail = (await response.json()).error || ""; } catch (_) { /* ignore */ }
      throw new FlowMateAIError(
        response.status === 500
          ? "The AI is having trouble right now. Please try again in a moment."
          : (detail || "FlowMate couldn't process that request.")
      );
    }

  let json;
try {
    json = await response.json();
} catch (_) {
    throw new FlowMateAIError("The AI returned something we couldn't read. Try rephrasing.");
}

// Extract Gemini response text
const aiText = json?.candidates?.[0]?.content?.parts?.[0]?.text;

if (!aiText) {
    throw new FlowMateAIError("Gemini returned an empty response. Try again.");
}

try {
    return JSON.parse(aiText);
} catch (_) {
    throw new FlowMateAIError("Gemini returned invalid JSON. Try again.");
}
  }

  return { parseInstruction, generateRecoveryPlan };
})();

class FlowMateAIError extends Error {}

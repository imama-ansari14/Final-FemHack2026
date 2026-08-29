// AI triage using Google's Gemini API.
// This file only ever runs on the server (inside app/api routes)

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const VALID_CATEGORIES = ["Water Supply", "Sewage", "Electricity", "Road/Street", "Sanitation", "Other"];
const VALID_PRIORITIES = ["Low", "Medium", "High"];

/**
 * Calls Gemini to triage a support ticket.
 * so the rest of the app never has to special-case AI downtime.
 */
async function triageTicket({ subject, description }) {
  const fallback = {
    category: "General",
    priority: "Medium",
    summary: subject?.slice(0, 140) || "No summary available.",
    aiAvailable: false,
  };

  if (!GEMINI_API_KEY) {
    return fallback;
  }

  const prompt = `You are a support-ticket triage assistant. Read the customer's ticket and
respond with ONLY a raw JSON object (no markdown fences, no extra text) in exactly this shape:
{"category": one of ${JSON.stringify(VALID_CATEGORIES)}, "priority": one of ${JSON.stringify(
    VALID_PRIORITIES
  )}, "summary": "one short sentence summarizing the issue"}

Ticket subject: ${subject}
Ticket description: ${description}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 200 },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.error("Gemini API error:", res.status, await res.text());
      return fallback;
    }

    const data = await res.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    const cleaned = text.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return fallback;
    }

    // Validate before trusting anything the AI returned.
    const category = VALID_CATEGORIES.includes(parsed.category)
      ? parsed.category
      : "General";
    const priority = VALID_PRIORITIES.includes(parsed.priority)
      ? parsed.priority
      : "Medium";
    const summary =
      typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim().slice(0, 300)
        : fallback.summary;

    return { category, priority, summary, aiAvailable: true };
  } catch (err) {
    console.error("Gemini triage failed, falling back:", err.message);
    return fallback;
  }
}

module.exports = { triageTicket, VALID_CATEGORIES, VALID_PRIORITIES };

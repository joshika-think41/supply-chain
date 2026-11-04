import type { Insight, ProviderStatus } from "./types.js";

export async function enrichWithGemini(insights: Insight[]): Promise<{ insights: Insight[]; status: ProviderStatus }> {
  if (!process.env.GEMINI_API_KEY || !insights.length) return { insights, status: { configured: false, mode: "fallback", detail: "No Gemini key configured; using evidence-based summaries" } };
  const evidence = insights.slice(0, 4).map(({ id, title, severity, action, evidence: facts }) => ({ id, title, severity, action, facts }));
  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=" + process.env.GEMINI_API_KEY, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: `You are an operations executive assistant. Rewrite only the explanation and action for each record below. Never invent numbers or facts. Return JSON array with id, explanation, action. Evidence: ${JSON.stringify(evidence)}` }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.2 } })
    });
    if (!response.ok) return { insights, status: { configured: true, mode: "fallback", detail: `Gemini returned HTTP ${response.status}; using evidence-based summaries` } };
    const payload = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    const updates = text ? JSON.parse(text) as { id: string; explanation: string; action: string }[] : [];
    return { insights: insights.map((insight) => ({ ...insight, ...updates.find((update) => update.id === insight.id) })), status: { configured: true, mode: "live", detail: "Gemini generated the current executive brief" } };
  } catch { return { insights, status: { configured: true, mode: "fallback", detail: "Gemini request failed; using evidence-based summaries" } }; }
}

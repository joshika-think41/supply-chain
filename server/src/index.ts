import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import { fileURLToPath } from "node:url";
import { latestSnapshot, saveSnapshot, snapshotCount } from "./db.js";
import { enrichWithGemini } from "./gemini.js";
import { calculateState } from "./intelligence.js";
import { getNews } from "./news.js";
import type { ScenarioType } from "./types.js";

// The API is run from the server workspace, while user configuration belongs at
// the repository root. Resolve explicitly so `npm run dev` always reads it.
dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

const app = express(); app.use(cors()); app.use(express.json());
const validScenarios = new Set<ScenarioType>(["supplier-delay", "demand-spike", "logistics-disruption", "adverse-news"]);

async function generate(scenario: ScenarioType | "baseline", useGemini = true) {
  const news = await getNews(scenario, useGemini ? "full" : "fast");
  const state = calculateState(scenario, news.articles);
  if (useGemini) {
    const gemini = await enrichWithGemini(state.insights);
    state.insights = gemini.insights;
    state.provider = { gemini: gemini.status, news: news.status };
  } else {
    state.provider = { gemini: { configured: Boolean(process.env.GEMINI_API_KEY), mode: "fallback", detail: "Fast scenario narrative generated from current operational evidence and scenario signals" }, news: news.status };
  }
  saveSnapshot(state); return state;
}
app.get("/api/dashboard", async (_req, res) => res.json(latestSnapshot() ?? await generate("baseline")));
app.post("/api/refresh", async (_req, res) => res.json(await generate("baseline")));
app.post("/api/simulate", async (req, res) => {
  const scenario = req.body?.scenario as ScenarioType;
  if (!validScenarios.has(scenario)) return res.status(400).json({ error: "Unknown scenario" });
  res.json(await generate(scenario, false));
});
app.get("/api/status", (_req, res) => res.json({ geminiConfigured: Boolean(process.env.GEMINI_API_KEY), newsConfigured: Boolean(process.env.NEWSDATA_API_KEY || process.env.NEWS_API_KEY), snapshots: snapshotCount() }));
app.listen(Number(process.env.PORT ?? 8787), () => console.log(`Supply-chain API listening on ${process.env.PORT ?? 8787}`));

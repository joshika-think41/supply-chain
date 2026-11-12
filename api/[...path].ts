import { enrichWithGemini } from "../server/src/gemini.js";
import { calculateState } from "../server/src/intelligence.js";
import { getNews } from "../server/src/news.js";
import type { DashboardState, ScenarioType } from "../server/src/types.js";

const scenarios = new Set<ScenarioType>(["supplier-delay", "demand-spike", "logistics-disruption", "adverse-news"]);
let latest: DashboardState | undefined;

const verified = (articles: Awaited<ReturnType<typeof getNews>>["articles"]) => articles.filter((article) => article.url && article.url !== "#");

async function generate(scenario: ScenarioType | "baseline", useGemini = true) {
  const news = await getNews(scenario, "full");
  const articles = verified(news.articles);
  const state = calculateState(scenario, articles);
  if (useGemini) {
    const gemini = await enrichWithGemini(state.insights);
    state.insights = gemini.insights;
    state.provider = { gemini: gemini.status, news: news.status };
  } else {
    state.provider = { gemini: { configured: Boolean(process.env.GEMINI_API_KEY), mode: "fallback", detail: "Fast scenario narrative generated from current operational evidence" }, news: news.status };
  }
  latest = state;
  return state;
}

function fastScenario(scenario: ScenarioType) {
  const state = calculateState(scenario);
  state.provider = {
    gemini: { configured: Boolean(process.env.GEMINI_API_KEY), mode: "fallback", detail: "Fast operational scenario generated from seeded supply-chain data" },
    news: { configured: Boolean(process.env.NEWSDATA_API_KEY || process.env.NEWS_API_KEY), mode: "fallback", detail: "Loading verified external news…" }
  };
  return state;
}

async function enrichNews(scenario: ScenarioType) {
  const news = await getNews(scenario, "full");
  const articles = verified(news.articles);
  const state = calculateState(scenario, articles);
  state.provider = {
    gemini: { configured: Boolean(process.env.GEMINI_API_KEY), mode: "fallback", detail: "Evidence-based interpretation updated from verified published articles" },
    news: articles.length ? news.status : { ...news.status, mode: "unavailable", detail: "No verified recent articles were found for this scenario" }
  };
  return state;
}

export default async function handler(req: { method?: string; url?: string; query?: { path?: string[] | string }; body?: unknown }, res: { status: (code: number) => { json: (payload: unknown) => void } }) {
  const routeParam = req.query?.path;
  const path = Array.isArray(routeParam) ? routeParam.join("/") : routeParam ?? new URL(req.url ?? "/api", "https://local").pathname.replace(/^\/api\/?/, "");
  if (req.method === "GET" && path === "dashboard") return res.status(200).json(latest ?? await generate("baseline"));
  if (req.method === "GET" && path === "status") return res.status(200).json({ geminiConfigured: Boolean(process.env.GEMINI_API_KEY), newsConfigured: Boolean(process.env.NEWSDATA_API_KEY || process.env.NEWS_API_KEY), persistence: "in-memory demo snapshot" });
  if (req.method === "POST" && path === "refresh") return res.status(200).json(await generate("baseline"));
  if (req.method === "POST" && path === "simulate") {
    const scenario = (req.body as { scenario?: ScenarioType } | undefined)?.scenario;
    if (!scenario || !scenarios.has(scenario)) return res.status(400).json({ error: "Unknown scenario" });
    return res.status(200).json(fastScenario(scenario));
  }
  if (req.method === "POST" && path === "simulate-news") {
    const scenario = (req.body as { scenario?: ScenarioType } | undefined)?.scenario;
    if (!scenario || !scenarios.has(scenario)) return res.status(400).json({ error: "Unknown scenario" });
    return res.status(200).json(await enrichNews(scenario));
  }
  return res.status(404).json({ error: "Not found" });
}

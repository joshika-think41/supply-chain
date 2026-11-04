import { fixtureNews } from "./seed.js";
import type { NewsArticle, ProviderStatus, ScenarioType } from "./types.js";

const cachedNews = new Map<string, { result: { articles: NewsArticle[]; status: ProviderStatus }; expiresAt: number }>();

const trackedTerms: Record<string, RegExp[]> = {
  Taiwan: [/\btaiwan(?:ese)?\b/i],
  "South Korea": [/\bsouth korea\b/i, /\bkorean\b/i],
  China: [/\bchina\b/i, /\bchinese\b/i],
  Vietnam: [/\bvietnam(?:ese)?\b/i],
  semiconductor: [/\bsemiconductor(?:s)?\b/i, /\bchip(?:s)?\b/i, /\bpower[- ]management\b/i, /\bintegrated circuit\b/i],
  display: [/\boled\b/i, /\bdisplay(?:s)?\b/i, /\bscreen(?:s)?\b/i, /\bpanel(?:s)?\b/i],
  battery: [/\bbatter(?:y|ies)\b/i, /\blithium(?:-ion)?\b/i],
  logistics: [/\bport(?:s)?\b/i, /\bfreight\b/i, /\bshipping\b/i, /\bvessel(?:s)?\b/i, /\bcongestion\b/i, /\blogistics\b/i],
  tariff: [/\btariff(?:s)?\b/i, /\btrade restriction\b/i, /\bexport control(?:s)?\b/i]
};

function tagsFor(title: string, description: string) {
  const text = `${title} ${description}`;
  return Object.entries(trackedTerms).filter(([, patterns]) => patterns.some(pattern => pattern.test(text))).map(([tag]) => tag);
}

function shortSummary(value: string, limit = 42) {
  const words = value.replace(/\s+/g, " ").trim().split(" ");
  return words.length > limit ? `${words.slice(0, limit).join(" ")}…` : words.join(" ");
}

function isOperationallyRelevant(title: string, description: string, tags: string[]) {
  const text = `${title} ${description}`;
  const hasSupplyImpact = /\bsupply chain\b|\bshortage\b|\bfactory\b|\bplant\b|\bmanufactur(?:e|ing|er)\b|\bproduction\b|\bcapacity\b|\ballocation\b|\bdisrupt(?:ion|ed)?\b|\bdelay(?:ed)?\b|\blead time\b|\bexport control\b|\btariff(?:s)?\b|\bfreight\b|\bshipping\b|\bport\b|\blogistics\b|\brecall\b/i.test(text);
  const financeOnly = /\bshares?\b|\bstock\b|\binsider buying\b|\bearnings\b|\brevenue up\b|\bprice target\b/i.test(title);
  return tags.length > 0 && hasSupplyImpact && !financeOnly;
}

const scenarioQueries: Record<ScenarioType | "baseline", string> = {
  baseline: "electronics supply chain",
  "supplier-delay": "Taiwan semiconductor supply allocation",
  "demand-spike": "laptop electronics demand forecast",
  "logistics-disruption": "Asia port congestion electronics shipping",
  "adverse-news": "semiconductor supply disruption"
};

function gdeltTimestamp(value?: string) {
  if (!value || !/^\d{14}/.test(value)) return new Date().toISOString();
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(8, 10)}:${value.slice(10, 12)}:${value.slice(12, 14)}Z`;
}

async function getGdeltNews(scenario: ScenarioType | "baseline") {
  try {
    const params = new URLSearchParams({ query: scenarioQueries[scenario], mode: "artlist", format: "json", maxrecords: "5", timespan: "7d", sort: "datedesc" });
    const response = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?${params}`);
    if (!response.ok) return undefined;
    const payload = await response.json() as { articles?: { url?: string; title?: string; seendate?: string; domain?: string; socialimage?: string }[] };
    const unique = new Set<string>();
    const articles = (payload.articles ?? []).filter(article => article.title && article.url).map((article, index) => {
      const tags = tagsFor(article.title!, "");
      return { id: `gdelt-${index}`, title: article.title!, source: article.domain ?? "GDELT", publishedAt: gdeltTimestamp(article.seendate), url: article.url!, summary: "Recent external article selected for the active supply-chain scenario.", tags: tags.length ? tags : ["external"], riskWeight: 8 };
    }).filter(article => {
      const key = article.title.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (unique.has(key)) return false;
      unique.add(key); return true;
    }).slice(0, 5);
    return articles.length ? articles : undefined;
  } catch { return undefined; }
}

function decodeXml(value: string) { return value.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'"); }

async function getGoogleNews(scenario: ScenarioType | "baseline") {
  try {
    const query = new URLSearchParams({ q: `${scenarioQueries[scenario]} when:7d`, hl: "en-US", gl: "US", ceid: "US:en" });
    const response = await fetch(`https://news.google.com/rss/search?${query}`);
    if (!response.ok) return [];
    const xml = await response.text();
    const articles: NewsArticle[] = [];
    for (const item of xml.match(/<item>[\s\S]*?<\/item>/g) ?? []) {
      const title = item.match(/<title>([\s\S]*?)<\/title>/)?.[1]; const url = item.match(/<link>([\s\S]*?)<\/link>/)?.[1]; const date = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]; const source = item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1];
      if (!title || !url || !date) continue;
      const cleanTitle = decodeXml(title); const tags = tagsFor(cleanTitle, "");
      articles.push({ id: `google-${articles.length}`, title: cleanTitle, source: source ? decodeXml(source) : "Google News", publishedAt: new Date(date).toISOString(), url: decodeXml(url), summary: "Recent published article selected for the active supply-chain scenario.", tags: tags.length ? tags : ["external"], riskWeight: 8 });
      if (articles.length === 5) break;
    }
    return articles;
  } catch { return []; }
}

async function externalFallback(scenario: ScenarioType | "baseline") {
  const [gdelt, google] = await Promise.all([getGdeltNews(scenario), getGoogleNews(scenario)]);
  const seen = new Set<string>();
  return [...(gdelt ?? []), ...google].filter(article => { const key = article.title.toLowerCase().replace(/[^a-z0-9]/g, ""); if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, 5);
}

export async function getNews(scenario: ScenarioType | "baseline" = "baseline"): Promise<{ articles: NewsArticle[]; status: ProviderStatus }> {
  const cached = cachedNews.get(scenario);
  if (cached && cached.expiresAt > Date.now()) return cached.result;
  const key = process.env.NEWSDATA_API_KEY || process.env.NEWS_API_KEY;
  if (!key) {
    const externalArticles = await externalFallback(scenario);
    return externalArticles.length
      ? { articles: externalArticles, status: { configured: false, mode: "live", detail: `${externalArticles.length} current, linked articles from external news sources` } }
      : { articles: fixtureNews, status: { configured: false, mode: "fallback", detail: "No external news provider is available; using curated watchlist" } };
  }
  try {
    const params = new URLSearchParams({ apikey: key, q: scenarioQueries[scenario], language: "en", size: "8" });
    const response = await fetch(`https://newsdata.io/api/1/latest?${params}`);
    if (!response.ok) {
      const externalArticles = await externalFallback(scenario);
      return externalArticles.length ? { articles: externalArticles, status: { configured: true, mode: "live", detail: `${externalArticles.length} current, linked articles from external news sources` } } : { articles: fixtureNews, status: { configured: true, mode: "fallback", detail: `NewsData.io returned HTTP ${response.status}; using curated watchlist` } };
    }
    const payload = await response.json() as { results?: { title?: string; source_name?: string; pubDate?: string; link?: string; description?: string; category?: string[] }[] };
    const seenTitles = new Set<string>();
    const articles = (payload.results ?? []).filter(a => a.title).map((article, index) => {
      const summary = shortSummary(article.description ?? "External supply-chain signal.");
      const tags = tagsFor(article.title!, summary);
      return { id: `live-${index}`, title: article.title!, source: article.source_name ?? "NewsData.io", publishedAt: article.pubDate ?? new Date().toISOString(), url: article.link ?? "#", summary, tags, riskWeight: Math.min(20, 5 + tags.length * 3) };
    }).filter(article => {
      const titleKey = article.title.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (seenTitles.has(titleKey)) return false;
      seenTitles.add(titleKey);
      return isOperationallyRelevant(article.title, article.summary, article.tags);
    });
    const externalArticles = articles.length < 5 ? await externalFallback(scenario) : [];
    const titles = new Set<string>();
    const combined = [...articles, ...externalArticles].filter(article => {
      const key = article.title.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (titles.has(key)) return false;
      titles.add(key); return true;
    }).slice(0, 5);
    const result: { articles: NewsArticle[]; status: ProviderStatus } = combined.length
      ? { articles: combined, status: { configured: true, mode: "live", detail: `${combined.length} current, linked articles from external news sources` } }
      : { articles: fixtureNews, status: { configured: true, mode: "fallback", detail: "No current external article passed relevance checks; using curated watchlist" } };
    cachedNews.set(scenario, { result, expiresAt: Date.now() + 10 * 60 * 1000 });
    return result;
  } catch {
    const externalArticles = await externalFallback(scenario);
    return externalArticles.length
      ? { articles: externalArticles, status: { configured: true, mode: "live", detail: `${externalArticles.length} current, linked articles from external news sources` } }
      : { articles: fixtureNews, status: { configured: true, mode: "fallback", detail: "External news requests failed; using curated watchlist" } };
  }
}

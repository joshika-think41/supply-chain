import { skus as baselineSkus, suppliers as baselineSuppliers } from "./seed.js";
import type { DashboardState, Insight, NewsArticle, ScenarioType, Sku, Supplier } from "./types.js";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const severityFor = (score: number): Insight["severity"] => score >= 75 ? "critical" : score >= 55 ? "high" : score >= 35 ? "medium" : "low";
function publishedNewsInterpretation(scenario: ScenarioType | "baseline", subject: string, articles: NewsArticle[], operationalImpact: string) {
  if (!articles.length) return undefined;
  const headlines = articles.slice(0, 2).map(article => `“${article.title}”`).join(" and ");
  const scenarioMeaning: Record<ScenarioType | "baseline", string> = {
    baseline: "These external signals should be monitored alongside the current operating baseline.",
    "supplier-delay": "Together, these reports increase the likelihood that already-constrained supply will recover more slowly than planned.",
    "demand-spike": "Together, these reports support treating the current demand increase as a planning risk rather than a short-lived order fluctuation.",
    "logistics-disruption": "Together, these reports strengthen the case for assuming longer transit and recovery times on affected inbound routes.",
    "adverse-news": "Together, these reports justify an immediate continuity review rather than waiting for the next normal supplier review cycle."
  };
  return `${headlines} are the most relevant current published signals for ${subject}. ${operationalImpact} ${scenarioMeaning[scenario]}`;
}
export function calculateState(scenario: ScenarioType | "baseline" = "baseline", liveNews: NewsArticle[] = []): DashboardState {
  const suppliers = clone(baselineSuppliers); const skus = clone(baselineSkus);
  // World News contains only externally published articles. Simulations change
  // operational metrics; they never manufacture dates or links for news cards.
  const news = clone(liveNews.filter((article) => article.url && article.url !== "#"));
  if (scenario === "supplier-delay") { suppliers[0].onTime -= 14; suppliers[0].leadTime += 15; }
  if (scenario === "demand-spike") { skus[0].dailyDemand += 55; skus[2].dailyDemand += 44; }
  if (scenario === "logistics-disruption") { suppliers.forEach((s) => { if (["Taiwan", "China", "Vietnam"].includes(s.country)) { s.leadTime += 9; s.onTime -= 6; } }); }

  const insights = createInsights(suppliers, skus, news, scenario);
  if (scenario !== "baseline") {
    const eventName = scenario.replace(/-/g, " ");
    insights.forEach((insight) => { insight.change = `${eventName} simulation recalculated this finding using the active disruption signals`; });
  }
  const avgOtd = Math.round(suppliers.reduce((sum, s) => sum + s.onTime, 0) / suppliers.length);
  const stockout = Math.min(...skus.map((s) => Math.floor(s.inventory / s.dailyDemand)));
  const totalInventory = skus.reduce((sum, s) => sum + s.inventory, 0);
  return {
    generatedAt: new Date().toISOString(), scenario,
    kpis: [
      { label: "Supply reliability", value: `${avgOtd}%`, delta: `${avgOtd - 92 >= 0 ? "+" : ""}${avgOtd - 92} pts vs target`, tone: avgOtd < 88 ? "danger" : avgOtd < 92 ? "warn" : "good" },
      { label: "Earliest stock-out", value: `${stockout} days`, delta: "PulseBook supply exposure", tone: stockout < 18 ? "danger" : "warn" },
      { label: "Open risk exposure", value: `$${suppliers.filter(s => s.onTime < 90 || s.defectRate > 2).reduce((sum, s) => sum + s.spend, 0)}M`, delta: `${insights.filter(i => i.severity !== "low").length} prioritized items`, tone: "warn" },
      { label: "Inventory on hand", value: totalInventory.toLocaleString(), delta: "units across tracked SKUs", tone: "neutral" }
    ],
    insights, suppliers, skus, news,
    trends: [0, 1, 2, 3, 4, 5, 6, 7].map((n) => ({ week: `W${n + 37}`, onTime: avgOtd + (n - 7) * 1.1, inventoryRisk: Math.max(12, 62 - n * 4 + (scenario === "demand-spike" ? 18 : 0)), demand: 82 + n * 3 + (scenario === "demand-spike" ? 21 : 0) })),
    provider: { gemini: { configured: false, mode: "fallback", detail: "Not evaluated" }, news: { configured: false, mode: "fallback", detail: "Not evaluated" } }
  };
}

function createInsights(suppliers: Supplier[], skus: Sku[], news: NewsArticle[], scenario: ScenarioType | "baseline"): Insight[] {
  const insights: Insight[] = [];
  suppliers.forEach((supplier) => {
    const linked = skus.filter((sku) => sku.supplierId === supplier.id);
    const componentTags = supplier.component.includes("IC") ? ["semiconductor"] : supplier.component.includes("OLED") ? ["display"] : supplier.component.includes("battery") ? ["battery"] : ["logistics"];
    const relatedArticles = news.filter((article) => article.tags.some((tag) => [supplier.country, ...componentTags].includes(tag)));
    const leadArticle = relatedArticles[0];
    const newsRisk = relatedArticles.reduce((sum, article) => sum + article.riskWeight, 0);
    const deliveryRisk = (100 - supplier.onTime) * 1.8;
    const leadTimeRisk = Math.max(0, supplier.leadTime - 30) * 1.1;
    const qualityRisk = supplier.defectRate * 7;
    const externalRisk = newsRisk * .55;
    const score = Math.min(100, Math.round(deliveryRisk + leadTimeRisk + qualityRisk + externalRisk));
    if (score < 30) return;
    const affected = linked[0];
    const evidence = [
      { label: "On-time delivery", value: `${supplier.onTime}%`, direction: supplier.onTime < 90 ? "down" : "neutral" as const },
      { label: "Lead time", value: `${supplier.leadTime} days`, direction: supplier.leadTime > 30 ? "up" : "neutral" as const },
      { label: "Defect rate", value: `${supplier.defectRate}%`, direction: supplier.defectRate > 2 ? "up" : "neutral" as const },
      { label: "News exposure", value: `${newsRisk} risk points`, direction: newsRisk ? "up" : "neutral" as const }
    ] as Insight["evidence"];
    const factors = [
      { label: "Delivery reliability", score: Math.min(100, Math.round(deliveryRisk * 2)), finding: `${supplier.onTime}% on-time delivery` },
      { label: "Lead-time pressure", score: Math.min(100, Math.round(leadTimeRisk * 3)), finding: `${supplier.leadTime} days lead time` },
      { label: "Quality exposure", score: Math.min(100, Math.round(qualityRisk * 4)), finding: `${supplier.defectRate}% defect rate` },
      { label: "External signals", score: Math.min(100, Math.round(externalRisk * 4)), finding: relatedArticles.length ? `${relatedArticles.length} directly related article${relatedArticles.length > 1 ? "s" : ""}` : "No directly related article" }
    ];
    const newsNarrative = leadArticle ? ` The signal “${leadArticle.title}” indicates: ${leadArticle.summary}` : " No directly matched external signal is currently required to support this operating-risk finding.";
    const newsSummary = publishedNewsInterpretation(scenario, supplier.name, relatedArticles, `For this supplier, the practical exposure is ${supplier.onTime}% on-time delivery and a ${supplier.leadTime}-day lead time.`);
    insights.push({ id: `supplier-${supplier.id}`, title: `${supplier.name} supply exposure`, severity: severityFor(score), score, confidence: Math.min(96, 62 + Math.round(score / 3)), category: "Supplier resilience", supplier: supplier.name, sku: affected?.name, explanation: `${supplier.name} is at risk because on-time delivery is ${supplier.onTime}%, lead time is ${supplier.leadTime} days, and the defect rate is ${supplier.defectRate}%.${newsNarrative}`, newsSummary, action: `Ask procurement to validate an alternate source and secure allocation for ${supplier.component}.`, evidence, factors, articles: relatedArticles.slice(0, 2), owner: "Procurement", change: `${score >= 60 ? "Escalated" : "Watch"} from latest refresh` });
  });
  skus.forEach((sku) => {
    const days = Math.floor(sku.inventory / sku.dailyDemand); const score = Math.min(100, Math.round(Math.max(0, 25 - days) * 3 + Math.max(0, sku.forecastVariance) * 1.5));
    if (score < 30) return;
    const inventoryArticles = scenario === "baseline" ? [] : news.slice(0, 2);
    const inventoryNewsSummary = publishedNewsInterpretation(scenario, sku.name, inventoryArticles, `For this SKU, ${days} days of cover and a ${sku.forecastVariance > 0 ? "+" : ""}${sku.forecastVariance}% forecast variance leave little room to absorb further demand changes.`);
    insights.push({ id: `inventory-${sku.id}`, title: `${sku.name} inventory risk`, severity: severityFor(score), score, confidence: 84, category: "Inventory & demand", sku: sku.name, explanation: `${sku.name} has ${days} days of cover while actual demand is ${Math.abs(sku.forecastVariance)}% ${sku.forecastVariance > 0 ? "above" : "below"} forecast.`, newsSummary: inventoryNewsSummary, action: "Review allocation, expedite constrained components, and update the short-term demand plan.", evidence: [{ label: "Days of cover", value: `${days} days`, direction: "down" }, { label: "Forecast variance", value: `${sku.forecastVariance > 0 ? "+" : ""}${sku.forecastVariance}%`, direction: sku.forecastVariance > 0 ? "up" : "down" }, { label: "Daily demand", value: `${sku.dailyDemand} units`, direction: "up" }], factors: [{ label: "Stock cover", score: Math.min(100, Math.max(0, (25 - days) * 4)), finding: `${days} days before stock-out` }, { label: "Demand acceleration", score: Math.min(100, Math.abs(sku.forecastVariance) * 4), finding: `${sku.forecastVariance > 0 ? "+" : ""}${sku.forecastVariance}% versus forecast` }, { label: "Supply dependency", score: 65, finding: "Single primary supplier" }], articles: inventoryArticles, owner: "Supply planning", change: "Updated from current demand signal" });
  });
  return insights.sort((a, b) => b.score - a.score);
}

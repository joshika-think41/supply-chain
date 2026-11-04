import { fixtureNews, skus as baselineSkus, suppliers as baselineSuppliers } from "./seed.js";
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
const scenarioSignals: Record<Exclude<ScenarioType, "">, NewsArticle[]> = {
  "supplier-delay": [
    { id: "scenario-supplier-1", title: "Taiwan power-management allocation tightens", source: "Scenario signal", publishedAt: new Date().toISOString(), url: "#", tags: ["Taiwan", "semiconductor"], summary: "The simulation assumes an allocation reduction that extends component lead times and reduces delivery reliability.", riskWeight: 26 },
    { id: "scenario-supplier-2", title: "Alternate-source qualification window opens", source: "Scenario signal", publishedAt: new Date().toISOString(), url: "#", tags: ["semiconductor", "supply"], summary: "Procurement has a time-boxed opportunity to secure an alternate approved source.", riskWeight: 14 }
  ],
  "demand-spike": [
    { id: "scenario-demand-1", title: "Premium laptop orders exceed the approved plan", source: "Scenario signal", publishedAt: new Date().toISOString(), url: "#", tags: ["semiconductor", "demand"], summary: "The simulation increases PulseBook demand beyond the approved demand plan, reducing days of cover.", riskWeight: 22 },
    { id: "scenario-demand-2", title: "Allocation review required for constrained SKUs", source: "Scenario signal", publishedAt: new Date().toISOString(), url: "#", tags: ["supply", "demand"], summary: "Available inventory should be reassessed before committing to new customer orders.", riskWeight: 13 }
  ],
  "logistics-disruption": [
    { id: "scenario-logistics-1", title: "Asia export lanes are delayed", source: "Scenario signal", publishedAt: new Date().toISOString(), url: "#", tags: ["Taiwan", "China", "Vietnam", "logistics"], summary: "The simulation adds transit and booking delays across key Asia manufacturing routes.", riskWeight: 25 },
    { id: "scenario-logistics-2", title: "Expedited freight threshold is reached", source: "Scenario signal", publishedAt: new Date().toISOString(), url: "#", tags: ["logistics", "freight"], summary: "Affected shipments should be assessed for expediting or customer-commitment changes.", riskWeight: 15 }
  ],
  "adverse-news": [
    { id: "scenario-news-1", title: "Supplier continuity alert is issued", source: "Scenario signal", publishedAt: new Date().toISOString(), url: "#", tags: ["Taiwan", "semiconductor"], summary: "The simulation introduces a verified continuity concern for the power-management component supply base.", riskWeight: 30 },
    { id: "scenario-news-2", title: "Leadership escalation threshold is reached", source: "Scenario signal", publishedAt: new Date().toISOString(), url: "#", tags: ["supplier", "risk"], summary: "The impact exceeds the normal planner exception threshold and requires cross-functional review.", riskWeight: 18 }
  ]
};

const scenarioAdditionalSignals: Record<ScenarioType, NewsArticle[]> = {
  "supplier-delay": [
    { id: "scenario-supplier-3", title: "Component test capacity is reassigned to priority programs", source: "Scenario signal", publishedAt: new Date().toISOString(), url: "#", tags: ["Taiwan", "semiconductor"], summary: "The simulated allocation change reduces available qualification and recovery capacity for non-priority customers.", riskWeight: 12 },
    { id: "scenario-supplier-4", title: "Power-management lead-time commitment moves beyond the planning horizon", source: "Scenario signal", publishedAt: new Date().toISOString(), url: "#", tags: ["semiconductor", "supply"], summary: "Confirmed supply dates extend beyond the current material plan and require customer-commitment review.", riskWeight: 16 },
    { id: "scenario-supplier-5", title: "Alternate-source validation is prioritized for constrained components", source: "Scenario signal", publishedAt: new Date().toISOString(), url: "#", tags: ["semiconductor", "supply"], summary: "Engineering and procurement can reduce exposure by accelerating approved-source validation.", riskWeight: 10 }
  ],
  "demand-spike": [
    { id: "scenario-demand-3", title: "Retail promotion lifts premium laptop demand above baseline", source: "Scenario signal", publishedAt: new Date().toISOString(), url: "#", tags: ["demand", "semiconductor"], summary: "Order intake rises ahead of the agreed forecast, consuming available component cover faster.", riskWeight: 16 },
    { id: "scenario-demand-4", title: "PulseBook inventory cover moves into the planner exception window", source: "Scenario signal", publishedAt: new Date().toISOString(), url: "#", tags: ["demand", "supply"], summary: "Available stock no longer covers the new demand profile without allocation decisions.", riskWeight: 18 },
    { id: "scenario-demand-5", title: "Demand consensus needs revision before the next supply commit", source: "Scenario signal", publishedAt: new Date().toISOString(), url: "#", tags: ["demand", "supply"], summary: "Sales and supply planning should align on a revised demand signal before releasing new commitments.", riskWeight: 11 }
  ],
  "logistics-disruption": [
    { id: "scenario-logistics-3", title: "Port dwell time pushes component arrivals past scheduled receipt dates", source: "Scenario signal", publishedAt: new Date().toISOString(), url: "#", tags: ["logistics", "Taiwan", "China"], summary: "The simulated dwell-time increase moves inbound component arrivals beyond planned receiving dates.", riskWeight: 18 },
    { id: "scenario-logistics-4", title: "Carrier booking capacity is restricted on Asia export routes", source: "Scenario signal", publishedAt: new Date().toISOString(), url: "#", tags: ["logistics", "Vietnam"], summary: "Outbound booking constraints reduce flexibility to recover delayed shipments.", riskWeight: 14 },
    { id: "scenario-logistics-5", title: "Customer promise dates require review for delayed inbound material", source: "Scenario signal", publishedAt: new Date().toISOString(), url: "#", tags: ["logistics", "supply"], summary: "Planning should identify orders exposed to the new transit-time assumption.", riskWeight: 12 }
  ],
  "adverse-news": [
    { id: "scenario-news-3", title: "Supplier continuity review opens for critical power components", source: "Scenario signal", publishedAt: new Date().toISOString(), url: "#", tags: ["Taiwan", "semiconductor"], summary: "The simulated alert triggers a continuity review of the affected component source.", riskWeight: 21 },
    { id: "scenario-news-4", title: "Quality and procurement teams begin joint supplier assessment", source: "Scenario signal", publishedAt: new Date().toISOString(), url: "#", tags: ["supplier", "risk"], summary: "A cross-functional review is needed to establish containment and qualification actions.", riskWeight: 14 },
    { id: "scenario-news-5", title: "Leadership decision requested on alternate-source acceleration", source: "Scenario signal", publishedAt: new Date().toISOString(), url: "#", tags: ["semiconductor", "supply"], summary: "The simulation requires a decision on the cost and timing of alternate-source validation.", riskWeight: 13 }
  ]
};

export function calculateState(scenario: ScenarioType | "baseline" = "baseline", liveNews: NewsArticle[] = []): DashboardState {
  const suppliers = clone(baselineSuppliers); const skus = clone(baselineSkus);
  const news = clone(liveNews.length ? liveNews : fixtureNews);
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
